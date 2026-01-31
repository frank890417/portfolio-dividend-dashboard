#!/usr/bin/env python3
"""
自動從 TWSE 抓取股利資料並更新 dividendCache.ts
使用官方 JSON API，更穩定
"""

import json
import urllib.request
import ssl
import time
from datetime import datetime

# 暫時關閉 SSL 驗證（TWSE 憑證問題）
ssl._create_default_https_context = ssl._create_unverified_context

# 哲宇的持倉
TICKERS = [
    "0050", "00881", "0056", "2892", "2884",
    "00919", "6533", "2887", "00965", "00696B"
]

def roc_to_ad(roc_date_str):
    """將民國年日期轉換為西元年 (YYYY-MM-DD)"""
    # 格式：115年01月06日 → 2026-01-06
    parts = roc_date_str.replace('年', '-').replace('月', '-').replace('日', '').split('-')
    year = int(parts[0]) + 1911
    month = parts[1].zfill(2)
    day = parts[2].zfill(2)
    return f"{year}-{month}-{day}"

def fetch_twse_dividends(year):
    """從 TWSE 抓取指定年度的股利資料"""
    url = f"https://www.twse.com.tw/rwd/zh/ETF/etfDiv?date={year}&response=json"
    
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        if data.get('status') != 'ok':
            print(f"✗ TWSE API 錯誤：{data.get('status')}")
            return {}
        
        # 解析資料
        fields = data.get('fields', [])
        rows = data.get('data', [])
        
        # 找到欄位索引
        ticker_idx = fields.index('證券代號')
        ex_date_idx = fields.index('除息交易日')
        pay_date_idx = fields.index('收益分配發放日')
        amount_idx = fields.index('收益分配金額 (每1受益權益單位)')
        
        # 整理成 dict
        result = {}
        for row in rows:
            ticker = row[ticker_idx]
            if ticker not in TICKERS:
                continue
            
            ex_date = roc_to_ad(row[ex_date_idx])
            pay_date = roc_to_ad(row[pay_date_idx])
            amount_str = row[amount_idx]
            
            if amount_str and amount_str != 'null':
                try:
                    amount = float(amount_str)
                    
                    if ticker not in result:
                        result[ticker] = []
                    
                    result[ticker].append({
                        "date": ex_date,
                        "cashDividend": amount,
                        "paymentDate": pay_date
                    })
                except ValueError:
                    continue
        
        return result
        
    except Exception as e:
        print(f"✗ 抓取 {year} 年資料失敗：{e}")
        return {}

def fetch_individual_stocks():
    """抓取個股資料（非 ETF）"""
    # 2892, 2884, 6533, 2887 是個股
    stocks = ["2892", "2884", "6533", "2887"]
    result = {}
    
    for year in [2024, 2025, 2026]:
        url = f"https://www.twse.com.tw/rwd/zh/exRight/TWT49U?date={year}&response=json"
        
        try:
            with urllib.request.urlopen(url, timeout=15) as response:
                data = json.loads(response.read().decode('utf-8'))
            
            if data.get('status') != 'ok':
                continue
            
            fields = data.get('fields', [])
            rows = data.get('data', [])
            
            # 找欄位索引（個股API欄位不同）
            if '證券代號' not in fields:
                continue
            
            ticker_idx = fields.index('證券代號')
            ex_date_idx = fields.index('除息交易日') if '除息交易日' in fields else None
            pay_date_idx = fields.index('發放日') if '發放日' in fields else None
            cash_div_idx = fields.index('現金股利') if '現金股利' in fields else None
            
            if ex_date_idx is None or cash_div_idx is None:
                continue
            
            for row in rows:
                ticker = row[ticker_idx]
                if ticker not in stocks:
                    continue
                
                ex_date = roc_to_ad(row[ex_date_idx])
                pay_date = roc_to_ad(row[pay_date_idx]) if pay_date_idx else ex_date
                cash_div = row[cash_div_idx]
                
                if cash_div and cash_div != '0':
                    try:
                        amount = float(cash_div)
                        
                        if ticker not in result:
                            result[ticker] = []
                        
                        result[ticker].append({
                            "date": ex_date,
                            "cashDividend": amount,
                            "paymentDate": pay_date
                        })
                    except ValueError:
                        continue
        
        except Exception as e:
            print(f"✗ 個股 {year} 年失敗：{e}")
    
    return result

def update_dividend_cache(all_data):
    """更新 dividendCache.ts"""
    
    ts_content = f"""// Auto-generated from TWSE official data
// Last updated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

export interface DividendData {{
    date: string;           // Ex-dividend date (YYYY-MM-DD)
    cashDividend: number;   // Per share in TWD
    paymentDate: string;    // Payment date (YYYY-MM-DD)
}}

export const dividendCache: Record<string, DividendData[]> = {{
"""
    
    for ticker in TICKERS:
        data = all_data.get(ticker, [])
        
        # 去重：根據除息日 + 金額
        seen = set()
        unique_data = []
        for item in data:
            key = (item["date"], item["cashDividend"])
            if key not in seen:
                seen.add(key)
                unique_data.append(item)
        
        # 按日期排序（最新的在前）
        unique_data.sort(key=lambda x: x["date"], reverse=True)
        data = unique_data
        
        ts_content += f'  "{ticker}": [\n'
        for item in data:
            ts_content += f'    {{ date: "{item["date"]}", cashDividend: {item["cashDividend"]}, paymentDate: "{item["paymentDate"]}" }},\n'
        ts_content += '  ],\n'
    
    ts_content += "};\n"
    
    with open("src/data/dividendCache.ts", 'w', encoding='utf-8') as f:
        f.write(ts_content)
    
    print(f"✓ 已更新 dividendCache.ts")

def main():
    print("🤖 開始從 TWSE 抓取股利資料...\n")
    
    all_data = {}
    
    # 抓取 ETF（2024, 2025 & 2026）- 需要多年資料才能做 projection
    for year in [2024, 2025, 2026]:
        print(f"📊 抓取 {year} 年 ETF 資料...")
        etf_data = fetch_twse_dividends(year)
        
        for ticker, dividends in etf_data.items():
            if ticker not in all_data:
                all_data[ticker] = []
            all_data[ticker].extend(dividends)
            print(f"  ✓ {ticker}: {len(dividends)} 筆")
        
        time.sleep(1)
    
    # 抓取個股
    print(f"\n📈 抓取個股資料...")
    stock_data = fetch_individual_stocks()
    for ticker, dividends in stock_data.items():
        if ticker not in all_data:
            all_data[ticker] = []
        all_data[ticker].extend(dividends)
        print(f"  ✓ {ticker}: {len(dividends)} 筆")
    
    # 更新檔案
    update_dividend_cache(all_data)
    
    # 更新 metadata
    metadata_content = f'''export const metadata = {{
    lastUpdated: "{datetime.now().strftime("%Y-%m-%d %H:%M")}",
    source: "TWSE (臺灣證券交易所) - Auto-scraped",
    sopFile: "src/data/SOURCE_UPDATE_SOP.md"
}};
'''
    
    with open("src/data/metadata.ts", 'w', encoding='utf-8') as f:
        f.write(metadata_content)
    
    print("✓ 已更新 metadata.ts")
    
    # 統計
    total = sum(len(v) for v in all_data.values())
    print(f"\n✅ 完成！共抓取 {total} 筆股利資料")
    print(f"📊 覆蓋 {len(all_data)}/{len(TICKERS)} 個 ticker")
    
    # 自動 commit + push
    import subprocess
    try:
        subprocess.run(["git", "add", "src/data/"], check=True, cwd=".")
        subprocess.run([
            "git", "commit", "-m", 
            f"🤖 auto: update dividend data ({datetime.now().strftime('%Y-%m-%d')})"
        ], check=True, cwd=".")
        subprocess.run(["git", "push"], check=True, cwd=".")
        print("\n✅ 已自動 commit + push 到 GitHub")
    except subprocess.CalledProcessError as e:
        print(f"\n⚠️  Git 操作失敗：{e}")
    except Exception as e:
        print(f"\n⚠️  未預期的錯誤：{e}")

if __name__ == "__main__":
    main()
