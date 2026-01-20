import React, { useEffect, useState } from 'react';
import { myHoldings } from '../data/holdings';
import { fetchDividends, calculateDividendEvents, type DividendEvent } from '../services/dividendService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wallet, Calendar, TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="card" style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', minWidth: '180px' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#f8fafc', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>{label} Net Income</p>
                <div style={{ fontSize: '0.875rem' }}>
                    {data.breakdown.map((item: any) => (
                        <div key={item.ticker} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                            <span>{myHoldings.find(h => h.ticker === item.ticker)?.name || item.ticker}</span>
                            <span style={{ color: '#38bdf8', fontWeight: 500 }}>${item.amount.toLocaleString()}</span>
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#f8fafc' }}>
                        <span>Total Monthly</span>
                        <span>${data.amount.toLocaleString()}</span>
                    </div>
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
    const receivedIncome = filteredEvents.filter(e => e.status === 'received').reduce((sum, p) => sum + p.netAmount, 0);
    const pendingIncome = totalAnnualIncome - receivedIncome;

    // Strict next payment: soonest pending event after today (2026-01-20)
    const upcomingEvents = [...filteredEvents]
        .filter(e => e.status === 'pending' && new Date(e.paymentDate) >= new Date('2026-01-20'))
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = months.map(month => {
        const monthEvents = filteredEvents.filter(e => e.month === month);
        const breakdown = monthEvents.reduce((acc, e) => {
            const existing = acc.find(item => item.ticker === e.ticker);
            if (existing) {
                existing.amount += e.netAmount;
            } else {
                acc.push({ ticker: e.ticker, amount: e.netAmount });
            }
            return acc;
        }, [] as { ticker: string, amount: number }[]);

        return {
            name: month,
            amount: monthEvents.reduce((sum, e) => sum + e.netAmount, 0),
            breakdown: breakdown.sort((a, b) => b.amount - a.amount)
        };
    });

    if (loading) return <div className="loading">Loading Portfolio Data...</div>;

    const sortedTimelineEvents = [...filteredEvents].sort((a, b) => {
        const timeDiff = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
        return timeDiff !== 0 ? timeDiff : a.ticker.localeCompare(b.ticker);
    });

    return (
        <div className="dashboard-grid">
            <header style={{ gridColumn: 'span 12' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>Portfolio Dividend Dashboard</h1>
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
            </header>

            <section className="summary-cards">
                <div className="card summary-card">
                    <div className="label">
                        <Wallet size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Est. Net Annual Income
                    </div>
                    <div className="value">${totalAnnualIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="card summary-card">
                    <div className="label">
                        <TrendingUp size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Pending Payments (Net)
                    </div>
                    <div className="value">${pendingIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="card summary-card">
                    <div className="label">
                        <Calendar size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Next Payment
                    </div>
                    <div className="value" style={{ fontSize: '1.1rem' }}>
                        {upcomingEvents[0] ? (
                            <>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
                                    {myHoldings.find(h => h.ticker === upcomingEvents[0].ticker)?.name || upcomingEvents[0].ticker}
                                </div>
                                <div style={{ fontWeight: 600, color: '#38bdf8' }}>
                                    ${upcomingEvents[0].netAmount.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '2px' }}>
                                    {upcomingEvents[0].paymentDate.split('T')[0]}
                                </div>
                            </>
                        ) : 'N/A'}
                    </div>
                </div>
            </section>

            <div className="top-row">
                <section className="card chart-container" style={{ gridColumn: 'auto' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Monthly Net Income Projection (2026)</h2>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="#38bdf8">
                                    {chartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={_entry.amount > 0 ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="card" style={{ gridColumn: 'auto' }}>
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Holdings Summary</h2>
                    <div className="scroll-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ticker</th>
                                    <th>Quantity</th>
                                    <th>Est. Yearly (Net)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myHoldings.filter(h => h.quantity > 0).map(h => {
                                    const yearly = filteredEvents
                                        .filter(e => e.ticker === h.ticker)
                                        .reduce((sum, e) => sum + e.netAmount, 0);
                                    return (
                                        <tr key={h.ticker}>
                                            <td><span className="ticker-badge">{h.ticker}</span></td>
                                            <td>{h.quantity} 張</td>
                                            <td>${yearly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section className="card timeline-container" style={{ gridColumn: 'span 12' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Dividend Payment Timeline</h2>
                <div className="scroll-table">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>預計付款日期</th>
                                <th style={{ textAlign: 'left' }}>項目</th>
                                <th style={{ textAlign: 'right' }}>已收 / 待收</th>
                                <th style={{ textAlign: 'right' }}>二代健保</th>
                                <th style={{ textAlign: 'right' }}>實付金額 (Net)</th>
                                <th style={{ textAlign: 'center' }}>除息日</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTimelineEvents.map((e, idx) => (
                                <tr key={`${e.ticker}-${idx}`}>
                                    <td style={{ textAlign: 'left' }}>{e.paymentDate.split('T')[0].replace(/-/g, '/')}</td>
                                    <td style={{ textAlign: 'left' }}>
                                        股息 {e.ticker}
                                        {e.isProjection && <span className="projection-tag">Projected</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        <span style={{ color: e.status === 'received' ? '#22c55e' : '#94a3b8', opacity: e.status === 'received' ? 1 : 0.4 }}>
                                            {e.status === 'received' ? e.amount.toLocaleString() : '0'}
                                        </span>
                                        <span style={{ margin: '0 6px', opacity: 0.2 }}>/</span>
                                        <span style={{ color: e.status === 'pending' ? '#38bdf8' : '#94a3b8', opacity: e.status === 'pending' ? 1 : 0.4 }}>
                                            {e.status === 'pending' ? e.amount.toLocaleString() : '0'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', color: e.healthInsuranceFee > 0 ? '#ef4444' : 'inherit', opacity: e.healthInsuranceFee > 0 ? 1 : 0.3 }}>
                                        {e.healthInsuranceFee > 0 ? `-$${e.healthInsuranceFee.toLocaleString()}` : '$0'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#f8fafc' }}>
                                        ${e.netAmount.toLocaleString()}
                                    </td>
                                    <td style={{ textAlign: 'center', opacity: 0.8, fontSize: '0.85rem' }}>
                                        {e.exDividendDate.split('T')[0].replace(/-/g, '/')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
