import React, { useEffect, useState } from 'react';
import { myHoldings } from '../data/holdings';
import { fetchDividends, calculateDividendEvents, type DividendEvent } from '../services/dividendService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wallet, Calendar, TrendingUp, Info, Download, Check } from 'lucide-react';
import { metadata } from '../data/metadata';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="card custom-tooltip" style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="label" style={{ marginBottom: '8px', fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>{label} Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {payload[0].payload.breakdown.map((item: any, idx: number) => {
                        const stockName = myHoldings.find(h => h.ticker === item.ticker)?.name || '';
                        return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: payload.find((p: any) => p.dataKey === item.ticker)?.fill || '#94a3b8' }}></div>
                                <span style={{ color: '#94a3b8', width: '40px' }}>{item.ticker}</span>
                                <span style={{ color: '#f8fafc', flex: 1 }}>{stockName}</span>
                                <span style={{ color: '#38bdf8', fontWeight: 600 }}>${item.amount.toLocaleString()}</span>
                            </div>
                        );
                    })}
                </div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                    <span style={{ color: '#f8fafc' }}>Total Net</span>
                    <span style={{ color: '#38bdf8' }}>${payload[0].payload.amount.toLocaleString()}</span>
                </div>
            </div>
        );
    }
    return null;
};

const Dashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<DividendEvent[]>([]);
    const [showProjections, setShowProjections] = useState(true);

    const exportData = () => {
        const exportPayload = {
            metadata: {
                exportDate: new Date().toISOString(),
                dataLastUpdated: metadata.lastUpdated,
                source: metadata.source
            },
            summary: {
                totalAnnualIncome,
                totalHealthInsurance,
                receivedIncome,
                pendingIncome,
                nextPayment: upcomingEvents[0] || null
            },
            holdings: myHoldings,
            dividendEvents: filteredEvents,
            monthlyBreakdown: chartData
        };

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dividend-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const fetchData = async () => {
            const allData = await Promise.all(
                myHoldings.map(h => fetchDividends(h.ticker))
            );

            const stockEvents = calculateDividendEvents(myHoldings, allData).map(e => {
                if (e.ticker === '00919' && e.paymentDate.includes('2026-01-13')) {
                    return {
                        ...e,
                        status: 'received' as const,
                        actualPaymentDate: '2026/1/13',
                        account: '富邦'
                    };
                }
                return e;
            });

            setEvents(stockEvents);
            setLoading(false);
        };
        fetchData();
    }, []);

    const filteredEvents = showProjections ? events : events.filter(e => !e.isProjection);

    const totalAnnualIncome = filteredEvents.reduce((sum, p) => sum + p.netAmount, 0);
    const totalHealthInsurance = filteredEvents.reduce((sum, p) => sum + p.healthInsuranceFee, 0);
    const receivedIncome = filteredEvents.filter(e => e.status === 'received').reduce((sum, p) => sum + p.netAmount, 0);
    const pendingIncome = totalAnnualIncome - receivedIncome;
    const projectedIncome = filteredEvents.filter(e => e.isProjection).reduce((sum, p) => sum + p.netAmount, 0);
    const averageMonthly = Math.floor(totalAnnualIncome / 12);

    // Strict next payment: soonest pending event after today (2026-01-20)
    const upcomingEvents = [...filteredEvents]
        .filter(e => e.status === 'pending' && new Date(e.paymentDate) >= new Date('2026-01-20'))
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    const tickers = Array.from(new Set(events.map(e => e.ticker)));
    const STOCK_COLORS: { [key: string]: string } = {
        '00919': '#38bdf8', // Light Blue
        '0056': '#818cf8',  // Indigo
        '00881': '#fbbf24', // Amber
        '2330': '#34d399',  // Emerald
        '0050': '#f87171',  // Red
        '2884': '#c084fc',  // Purple
        '2892': '#f472b6',  // Pink
        '00720B': '#94a3b8', // Gray Cloud
        '00696B': '#a78bfa', // Violet
    };
    // Fallback colors for unknown tickers
    const fallbackColors = ['#facc15', '#60a5fa', '#a78bfa', '#f87171', '#4ade80'];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = months.map(month => {
        const monthEvents = filteredEvents.filter(e => e.month === month);
        const dataPoint: any = { name: month, amount: 0, breakdown: [] };

        tickers.forEach(ticker => {
            const tickerAmount = monthEvents
                .filter(e => e.ticker === ticker)
                .reduce((sum, e) => sum + e.netAmount, 0);
            if (tickerAmount > 0) {
                dataPoint[ticker] = tickerAmount;
                dataPoint.amount += tickerAmount;
                dataPoint.breakdown.push({ ticker, amount: tickerAmount });
            }
        });

        dataPoint.breakdown.sort((a: any, b: any) => b.amount - a.amount);
        return dataPoint;
    });

    if (loading) return <div className="loading">Loading Portfolio Data...</div>;

    const sortedTimelineEvents = [...filteredEvents].sort((a, b) => {
        const timeDiff = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
        return timeDiff !== 0 ? timeDiff : a.ticker.localeCompare(b.ticker);
    });

    return (
        <div className="dashboard-grid">
            <header style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Portfolio Dividend Dashboard</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                Last Data Grab: {metadata.lastUpdated}
                            </span>
                            <a href={metadata.sopFile} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#38bdf8', textDecoration: 'none', opacity: 0.8 }} title="View Data Update SOP">
                                <Info size={12} />
                                Source Update Info
                            </a>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                            onClick={exportData}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                        >
                            <Download size={14} />
                            Export Data
                        </button>
                        <div className="switch-container">
                            <span className="projection-label">Show Projections</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={showProjections}
                                    onChange={(e) => setShowProjections(e.target.checked)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            <section className="summary-cards" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="card summary-card">
                    <div className="label">
                        <Wallet size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Est. Net Annual
                    </div>
                    <div className="value">${totalAnnualIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="card summary-card">
                    <div className="label">
                        <TrendingUp size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Pending (Net)
                    </div>
                    <div className="value">${pendingIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="card summary-card">
                    <div className="label">
                        <Wallet size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} color="#ef4444" />
                        健保總額
                    </div>
                    <div className="value" style={{ color: '#ef4444' }}>${totalHealthInsurance.toLocaleString()}</div>
                </div>
                <div className="card summary-card">
                    <div className="label">
                        <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Next Payment
                    </div>
                    <div className="value" style={{ fontSize: '1.25rem' }}>
                        {upcomingEvents[0] ? (
                            <>
                                <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                                    {upcomingEvents[0].ticker}
                                </span>
                                <span style={{ marginLeft: '4px' }}>${upcomingEvents[0].netAmount.toLocaleString()}</span>
                            </>
                        ) : <span style={{ color: '#94a3b8' }}>N/A</span>}
                    </div>
                </div>
                <div className="card summary-card" style={{ background: 'rgba(56, 189, 248, 0.05)', justifyContent: 'center' }}>
                    <div className="label" style={{ color: '#38bdf8' }}>Status</div>
                    <div className="value" style={{ fontSize: '1rem', color: '#f8fafc' }}>2026 Portfolio</div>
                </div>
            </section>

            <div className="top-row">
                <section className="card chart-column" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Income Analysis</h2>

                    {/* Charts Side by Side */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        {/* Bar Chart */}
                        <div>
                            <h3 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Monthly Net Income</h3>
                            <div style={{ width: '100%', height: '260px' }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                                        <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        {tickers.map((ticker, index) => (
                                            <Bar
                                                key={ticker}
                                                dataKey={ticker}
                                                stackId="a"
                                                fill={STOCK_COLORS[ticker] || fallbackColors[index % fallbackColors.length]}
                                                radius={index === tickers.filter(t => chartData.some(d => d[t] > 0)).length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Donut Chart */}
                        <div>
                            <h3 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Portfolio Composition</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px' }}>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={myHoldings.filter(h => h.quantity > 0).map(h => ({
                                                name: h.ticker,
                                                value: filteredEvents.filter(e => e.ticker === h.ticker).reduce((sum, e) => sum + e.netAmount, 0)
                                            }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={95}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {myHoldings.filter(h => h.quantity > 0).map((h, index) => (
                                                <Cell key={`cell-${index}`} fill={STOCK_COLORS[h.ticker] || fallbackColors[index % fallbackColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number | undefined) => value ? `$${value.toLocaleString()}` : '$0'} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Color Legend */}
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.7rem' }}>
                            {tickers.filter(t => myHoldings.find(h => h.ticker === t)).map(ticker => (
                                <div key={ticker} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STOCK_COLORS[ticker] || '#94a3b8' }}></div>
                                    <span style={{ color: '#94a3b8' }}>{ticker}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* YTD Statistics */}
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px' }}>YTD Received</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22c55e' }}>${receivedIncome.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px' }}>Projected</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8' }}>${projectedIncome.toLocaleString()}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '2px' }}>Avg/Month</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>${averageMonthly.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Holdings Overview */}
                    {/* Holdings Overview */}
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>Portfolio Holdings Overview</h3>
                        <div className="scroll-table" style={{ flex: 1, overflowY: 'auto' }}>
                            <table style={{ fontSize: '0.75rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Stock</th>
                                        <th style={{ textAlign: 'center', width: '15%' }}>張數</th>
                                        <th style={{ textAlign: 'right', width: '25%' }}>Dividend (Net)</th>
                                        <th style={{ textAlign: 'right', width: '20%' }}>殖利率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myHoldings.filter(h => h.quantity > 0).map(h => {
                                        const yearly = filteredEvents
                                            .filter(e => e.ticker === h.ticker)
                                            .reduce((sum, e) => sum + e.netAmount, 0);
                                        return (
                                            <tr key={h.ticker}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STOCK_COLORS[h.ticker] || '#94a3b8', flexShrink: 0 }}></div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span className="ticker-badge" style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>{h.ticker}</span>
                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{h.name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{h.quantity}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#f8fafc' }}>${yearly.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', color: '#94a3b8' }}>-</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>


                <section className="card middle-column" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Monthly Summary</h2>
                    <div className="scroll-table">
                        <table style={{ fontSize: '0.75rem' }}>
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th style={{ textAlign: 'right' }}>Net Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.map((d, idx) => (
                                    <tr key={d.name} style={{ opacity: d.amount === 0 ? 0.3 : 1 }}>
                                        <td>2026/{idx + 1}月</td>
                                        <td style={{ textAlign: 'right', fontWeight: d.amount > 0 ? 600 : 400, color: d.amount > 0 ? '#38bdf8' : '#94a3b8' }}>
                                            ${d.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}>
                                    <td style={{ paddingTop: '0.5rem' }}>Avg/Month</td>
                                    <td style={{ textAlign: 'right', color: '#38bdf8', paddingTop: '0.5rem' }}>
                                        ${averageMonthly.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                <section className="card timeline-container" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Dividend Payment Timeline</h2>
                    <div className="scroll-table">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>預計付款</th>
                                    <th style={{ textAlign: 'left' }}>項目</th>
                                    <th style={{ textAlign: 'right' }}>已收 / 待收</th>
                                    <th style={{ textAlign: 'right' }}>健保</th>
                                    <th style={{ textAlign: 'right' }}>實付 (Net)</th>
                                    <th style={{ textAlign: 'center' }}>除息</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTimelineEvents.map((e, idx) => (
                                    <tr key={`${e.ticker}-${idx}`} className={e.status === 'received' ? 'row-received' : ''}>
                                        <td style={{ textAlign: 'left', fontSize: '0.75rem' }}>{e.paymentDate.split('T')[0].replace(/-/g, '/').slice(5)}</td>
                                        <td style={{ textAlign: 'left' }}>
                                            股息 {e.ticker}
                                            {e.isProjection && <span className="projection-tag">P</span>}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                            <span style={{ color: e.status === 'received' ? '#22c55e' : '#94a3b8', opacity: e.status === 'received' ? 1 : 0.4 }}>
                                                {e.status === 'received' ? e.amount.toLocaleString() : '0'}
                                            </span>
                                            <span style={{ margin: '0 4px', opacity: 0.2 }}>/</span>
                                            <span style={{ color: e.status === 'pending' ? '#38bdf8' : '#94a3b8', opacity: e.status === 'pending' ? 1 : 0.4 }}>
                                                {e.status === 'pending' ? e.amount.toLocaleString() : '0'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#ef4444', opacity: e.healthInsuranceFee > 0 ? 0.9 : 0.1, fontSize: '0.75rem' }}>
                                            {e.healthInsuranceFee > 0 ? `-$${e.healthInsuranceFee.toLocaleString()}` : '0'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#f8fafc' }}>
                                            ${e.netAmount.toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                {e.exDividendDate.split('T')[0].replace(/-/g, '/').slice(5)}
                                                {!e.isProjection && new Date(e.exDividendDate) < new Date('2026-01-20') && (
                                                    <Check size={12} style={{ color: '#22c55e' }} />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div >
    );
};

export default Dashboard;
