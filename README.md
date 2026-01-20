# Portfolio Dividend Dashboard 2026

A comprehensive dividend tracking dashboard for Taiwan stock and ETF portfolios, featuring automated health insurance fee calculations, projection capabilities, and visual analytics.

## Project Overview

This application provides real-time dividend income tracking with:
- **Stacked bar charts** showing monthly income breakdown by stock
- **Health insurance fee calculations** (2.11% for payments ≥ $20,000)
- **Automatic projections** from previous year data when current year data is incomplete
- **Side-by-side layout** optimized for single-view dashboard experience
- **Color-coded visual correlation** between charts and holdings tables

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and dev server
- **Recharts** for data visualization
- **Lucide React** for icons
- **Vanilla CSS** with CSS Grid and Flexbox

### Backend
- **Node.js/Express** API server (port 3001)
- **Local cache fallback** in `src/data/dividendCache.ts`

### Data Sources
- **Primary**: [WantGoo (玩股網)](https://www.wantgoo.com/) - Taiwan stock dividend data
- **Fallback**: [TWSE (臺灣證券交易所)](https://www.twse.com.tw/)

## Project Structure

```
stock-overview-2026/
├── src/
│   ├── components/
│   │   └── Dashboard.tsx          # Main dashboard component
│   ├── data/
│   │   ├── dividendCache.ts       # Cached dividend data
│   │   ├── holdings.ts            # Portfolio holdings
│   │   ├── metadata.ts            # Last update timestamp
│   │   └── SOURCE_UPDATE_SOP.md   # Data update instructions
│   ├── services/
│   │   └── dividendService.ts     # Business logic & calculations
│   ├── index.css                  # Global styles
│   └── main.tsx                   # App entry point
├── server/
│   └── index.js                   # Express API server
└── package.json
```

## Key Features

### 1. Dashboard Layout (3-Column)
- **Left**: Monthly Net Income stacked bar chart
- **Middle**: Monthly Summary table + Holdings Overview
- **Right**: Dividend Payment Timeline

### 2. Data Processing
- **Health Insurance Fee**: Automatically calculated at 2.11% for dividends ≥ $20,000
- **Net Amount**: Gross dividend minus health insurance fee
- **Projections**: Missing 2026 data is projected from 2025 using month-matching logic

### 3. Visual Features
- **Stacked Bars**: Each stock has a distinct color segment in monthly bars
- **Color Correlation**: Ticker dots in holdings table match chart colors
- **Dimmed Rows**: Already-received payments are visually de-emphasized
- **Enhanced Tooltips**: Show ticker code, stock name, and amount breakdown

### 4. Summary Cards
- Est. Net Annual Income
- Pending Payments (Net)
- Total Health Insurance Fees
- Next Payment (with ticker and date)
- Portfolio Status

## Running the Application

### Development Mode

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the backend server** (Terminal 1):
   ```bash
   node server/index.js
   ```
   Server runs on `http://localhost:3001`

3. **Start the frontend dev server** (Terminal 2):
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:8080`

4. **Open browser**:
   Navigate to `http://localhost:8080`

### Production Build

```bash
npm run build
npm run preview
```

## Data Management

### Updating Dividend Data

See [SOURCE_UPDATE_SOP.md](src/data/SOURCE_UPDATE_SOP.md) for detailed instructions.

**Quick Steps**:
1. Navigate to WantGoo dividend page for the ticker
2. Run the JavaScript scraper in browser console (see SOP)
3. Copy JSON output to `src/data/dividendCache.ts`
4. Update `src/data/metadata.ts` with current timestamp
5. Restart the app to see changes

### Holdings Configuration

Edit `src/data/holdings.ts` to add/remove stocks:

```typescript
export const myHoldings: Holding[] = [
    { ticker: '00919', name: '群益台灣精選高息', quantity: 100, isEtf: true },
    // Add more holdings here
];
```

## Business Logic

### Dividend Event Calculation (`dividendService.ts`)

1. **Fetch Data**: Attempts API call, falls back to cache
2. **Process Events**: For each holding, creates dividend events
3. **Health Insurance**: Calculates 2.11% fee for amounts ≥ $20,000
4. **Net Amount**: `netAmount = amount - healthInsuranceFee`
5. **Projections**: If 2026 data is missing for a month, projects from 2025
6. **Status**: Marks as 'received' if payment date < today (2026-01-20)

### Manual Overrides

Special cases are handled in `Dashboard.tsx`:

```typescript
if (e.ticker === '00919' && e.paymentDate.includes('2026-01-13')) {
    return {
        ...e,
        status: 'received' as const,
        actualPaymentDate: '2026/1/13',
        account: '富邦'
    };
}
```

## Styling System

### Color Palette

```typescript
const STOCK_COLORS = {
    '00919': '#38bdf8', // Light Blue
    '0056': '#818cf8',  // Indigo
    '00881': '#fbbf24', // Amber
    '2330': '#34d399',  // Emerald
    '0050': '#f87171',  // Red
    '2884': '#c084fc',  // Purple
    '2892': '#f472b6',  // Pink
    '00720B': '#94a3b8', // Gray
    '00696B': '#a78bfa', // Violet
};
```

### Layout Grid

```css
.top-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr 2.2fr;
  gap: 0.75rem;
}
```

## Common Maintenance Tasks

### Adding a New Stock

1. Add to `src/data/holdings.ts`
2. Scrape dividend data from WantGoo
3. Add data to `src/data/dividendCache.ts`
4. (Optional) Add custom color to `STOCK_COLORS` in `Dashboard.tsx`

### Updating for a New Year

1. Update projection logic in `dividendService.ts` if needed
2. Scrape new year data for all tickers
3. Update cache with new year entries
4. Update `metadata.ts` timestamp

### Adjusting Health Insurance Rate

Edit the rate in `dividendService.ts`:

```typescript
const healthInsuranceFee = amount >= 20000 ? Math.floor(amount * 0.0211) : 0;
```

## Troubleshooting

### No Data Showing
- Check if backend server is running on port 3001
- Verify `dividendCache.ts` has data for your tickers
- Check browser console for errors

### Incorrect Calculations
- Verify holdings quantities in `holdings.ts`
- Check dividend amounts in cache (should be per-share decimals)
- Ensure dates are in `YYYY-MM-DD` format

### Layout Issues
- Clear browser cache and hard refresh (Cmd+Shift+R)
- Check CSS Grid support in browser
- Verify viewport is at least 1200px wide for 3-column layout

## Future Enhancements

Potential improvements for future agents:

- [ ] Add database persistence (PostgreSQL/MongoDB)
- [ ] Implement automated data scraping service
- [ ] Add user authentication for multi-portfolio support
- [ ] Create mobile-responsive layout
- [ ] Add export to CSV/PDF functionality
- [ ] Implement real-time stock price integration
- [ ] Add tax calculation features
- [ ] Create historical performance analytics

## License

Private project for personal portfolio management.

---

**Last Updated**: 2026-01-20  
**Maintained By**: AI Agent  
**Current Version**: 1.0.0
