export interface DividendData {
    cashDividend: number;
    date: string; // Ex-dividend date
    paymentDate: string;
    stockDividend: number;
    year: number;
    dividendYear: number;
    isConfirmed: boolean;
}

export interface StockDividendInfo {
    ticker: string;
    dividends: DividendData[];
}

import { dividendCache } from '../data/dividendCache';

export async function fetchDividends(ticker: string): Promise<StockDividendInfo> {
    const isETF = ticker.startsWith('00') || ticker.endsWith('B');
    const url = `/api/dividends?ticker=${ticker.toLowerCase()}&isEtf=${isETF}`;

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data: DividendData[] = await response.json();
            return {
                ticker,
                dividends: data,
            };
        }
    } catch (error) {
        console.error(`Error fetching dividends for ${ticker}:`, error);
    }

    console.warn(`Failed to fetch dividends for ${ticker}, using local cache`);
    const cachedData = dividendCache[ticker.toUpperCase()] || [];
    return { ticker, dividends: cachedData };
}

export interface DividendEvent {
    ticker: string;
    amount: number;
    netAmount: number;
    healthInsuranceFee: number;
    exDividendDate: string;
    paymentDate: string;
    actualPaymentDate?: string;
    account?: string;
    month: string;
    status: 'received' | 'pending';
    isProjection?: boolean;
}

export function calculateDividendEvents(holdings: any[], allDividends: StockDividendInfo[]): DividendEvent[] {
    const events: DividendEvent[] = [];
    const today = new Date('2026-01-20');
    const currentYear = today.getFullYear();

    allDividends.forEach(({ ticker, dividends }) => {
        const holding = holdings.find(h => h.ticker.toLowerCase() === ticker.toLowerCase());
        if (!holding || holding.quantity === 0) return;

        // Separate dividends by year
        const dividends2026 = dividends.filter(d => d.paymentDate && new Date(d.paymentDate).getFullYear() === currentYear);
        const dividends2025 = dividends.filter(d => d.paymentDate && new Date(d.paymentDate).getFullYear() === currentYear - 1);

        const processDividend = (div: DividendData, isProjection: boolean = false) => {
            const pDate = new Date(div.paymentDate);
            if (isProjection) {
                pDate.setFullYear(currentYear);
            }

            const amount = Math.floor(div.cashDividend * holding.quantity * 1000);
            const healthInsuranceFee = amount >= 20000 ? Math.floor(amount * 0.0211) : 0;
            const netAmount = amount - healthInsuranceFee;
            const status: 'received' | 'pending' = pDate < today ? 'received' : 'pending';

            return {
                ticker: holding.ticker,
                amount,
                netAmount,
                healthInsuranceFee,
                exDividendDate: div.date,
                paymentDate: pDate.toISOString(),
                month: pDate.toLocaleString('en-US', { month: 'short' }),
                status,
                isProjection
            };
        };

        // Add all existing 2026 dividends
        dividends2026.forEach(div => events.push(processDividend(div)));

        // For each 2025 dividend, check if a corresponding 2026 dividend already exists
        // We compare by month to see if that "slot" is filled
        const months2026 = dividends2026.map(d => new Date(d.paymentDate).getMonth());

        dividends2025.forEach(div25 => {
            const month25 = new Date(div25.paymentDate).getMonth();
            if (!months2026.includes(month25)) {
                // This slot is missing in 2026, project it
                events.push(processDividend(div25, true));
            }
        });

        // Special case: if NO data for 2026 and NO data for 2025, we can't project.
        // But for stocks like 2884/2892, they usually have one annual payment in Aug.
    });

    return events.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
}
