export interface Holding {
    name: string;
    ticker: string;
    currency: string;
    rate: number;
    quantity: number; // in "張" (1000 shares)
}

export const myHoldings: Holding[] = [
    { name: '元大台灣50', ticker: '0050', currency: 'TWD', rate: 1, quantity: 24 },
    { name: '國泰台灣科技龍頭', ticker: '00881', currency: 'TWD', rate: 1, quantity: 275 },
    { name: '元大高股息', ticker: '0056', currency: 'TWD', rate: 1, quantity: 14 },
    { name: '第一金', ticker: '2892', currency: 'TWD', rate: 1, quantity: 52 },
    { name: '玉山金', ticker: '2884', currency: 'TWD', rate: 1, quantity: 2 },
    { name: '群益高息', ticker: '00919', currency: 'TWD', rate: 1, quantity: 350 },
    { name: '晶心科', ticker: '6533', currency: 'TWD', rate: 1, quantity: 11.00 },
    { name: '台新金', ticker: '2887', currency: 'TWD', rate: 1, quantity: 380 },
    { name: '元太防衛科技', ticker: '00965', currency: 'TWD', rate: 1, quantity: 10 },
    { name: '台積電', ticker: '2330', currency: 'TWD', rate: 1, quantity: 0 },
    { name: '富邦美債20年', ticker: '00696B', currency: 'TWD', rate: 1, quantity: 100 },
    { name: '元大投資級公司債', ticker: '00720B', currency: 'TWD', rate: 1, quantity: 0 },
];
