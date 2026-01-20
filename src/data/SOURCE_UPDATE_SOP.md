# SOP: Updating Dividend Source Data

This document provides instructions for future agents on how to update the cached dividend data for the portfolio.

## Data Sources
- **Primary Source**: [WantGoo (玩股網)](https://www.wantgoo.com/)
- **Fallback**: [TWSE (臺灣證券交易所)](https://www.twse.com.tw/)

## Step-by-Step Update Process

### 1. Identify Tickers
Check `src/data/holdings.ts` for the list of tickers in the portfolio.

### 2. Navigate to WantGoo
- For ETFs: `https://www.wantgoo.com/stock/etf/[TICKER]/dividend-policy/ex-dividend`
- For Stocks: `https://www.wantgoo.com/stock/[TICKER]/dividend-policy/ex-dividend`

### 3. Extract Dividend Data Using Browser Console

Open the browser console (F12) on the WantGoo dividend page and run this script:

```javascript
// Extract dividend data from WantGoo table
(() => {
  const rows = document.querySelectorAll('table.table tbody tr');
  const dividends = [];
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      const exDate = cells[0]?.innerText.trim(); // Ex-dividend date
      const cashDiv = cells[2]?.innerText.trim(); // Cash dividend
      const payDate = cells[3]?.innerText.trim(); // Payment date
      
      if (exDate && cashDiv && payDate) {
        dividends.push({
          date: exDate.replace(/\//g, '-'),
          cashDividend: parseFloat(cashDiv),
          paymentDate: payDate.replace(/\//g, '-')
        });
      }
    }
  });
  
  console.log(JSON.stringify(dividends, null, 2));
  return dividends;
})();
```

**Alternative: Extract specific years**
```javascript
// Extract only 2025 and 2026 data
(() => {
  const rows = document.querySelectorAll('table.table tbody tr');
  const dividends = { 2025: [], 2026: [] };
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      const exDate = cells[0]?.innerText.trim();
      const cashDiv = cells[2]?.innerText.trim();
      const payDate = cells[3]?.innerText.trim();
      
      if (exDate && cashDiv && payDate) {
        const year = exDate.split('/')[0];
        if (year === '2025' || year === '2026') {
          dividends[year].push({
            date: exDate.replace(/\//g, '-'),
            cashDividend: parseFloat(cashDiv),
            paymentDate: payDate.replace(/\//g, '-')
          });
        }
      }
    }
  });
  
  console.log(JSON.stringify(dividends, null, 2));
  return dividends;
})();
```

### 4. Update Cache
- Copy the JSON output from the console
- Modify `src/data/dividendCache.ts`
- Ensure the `DividendData` objects are correctly placed within the respective ticker's array
- Match the structure of existing entries

### 5. Calculate Projections
The `dividendService.ts` handles projection logic. If a new annual cycle is missed, ensure the 2025 data remains sufficient for the service to project into 2026.

### 6. Update Metadata
Update `src/data/metadata.ts` with the current date and time as `lastUpdated`:
```typescript
export const metadata = {
    lastUpdated: "2026-01-20 13:14",
    source: "WantGoo (玩股網)",
    sopFile: "src/data/SOURCE_UPDATE_SOP.md"
};
```

## Critical Notes
- **2nd Gen Health Insurance**: The system automatically calculates the 2.11% fee for amounts ≥ $20,000. Do not manually subtract this in the cache.
- **Manual Overrides**: Check `Dashboard.tsx` for any special overrides (like 00919's specific payment date or status) that may need adjusting after a data update.
- **Date Format**: Always use `YYYY-MM-DD` format for dates in the cache.
- **Decimal Precision**: Cash dividends should be stored as decimals (e.g., 0.35 for $0.35 per share).
