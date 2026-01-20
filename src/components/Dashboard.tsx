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
        <div className="dashboard-grid" style={{ gap: '0.75rem' }}>
            <header>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Portfolio Dividend Dashboard</h1>
                    <div className="switch-container" style={{ margin: 0, padding: '0.25rem 0.75rem' }}>
                        <span className="projection-label" style={{ fontSize: '0.75rem' }}>Show Projections</span>
                        <label className="switch" style={{ scale: '0.8' }}>
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

            <section className="summary-cards" style={{ gap: '0.75rem' }}>
                <div className="card summary-card" style={{ padding: '0.75rem' }}>
                    <div className="label" style={{ fontSize: '0.7rem' }}>
                        <Wallet size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Est. Net Annual
                    </div>
                    <div className="value" style={{ fontSize: '1.25rem' }}>${totalAnnualIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="card summary-card" style={{ padding: '0.75rem' }}>
                    <div className="label" style={{ fontSize: '0.7rem' }}>
                        <TrendingUp size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Pending (Net)
                    </div>
                    <div className="value" style={{ fontSize: '1.25rem' }}>${pendingIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="card summary-card" style={{ padding: '0.75rem', flex: 1.5 }}>
                    <div className="label" style={{ fontSize: '0.7rem' }}>
                        <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Next Payment
                    </div>
                    <div className="value" style={{ fontSize: '1.15rem', color: '#38bdf8' }}>
                        {upcomingEvents[0] ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {myHoldings.find(h => h.ticker === upcomingEvents[0].ticker)?.name || upcomingEvents[0].ticker}
                                </span>
                                <span>${upcomingEvents[0].netAmount.toLocaleString()}</span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({upcomingEvents[0].paymentDate.split('T')[0].slice(5)})</span>
                            </div>
                        ) : 'N/A'}
                    </div>
                </div>
                <div className="card summary-card" style={{ padding: '0.75rem', background: 'rgba(56, 189, 248, 0.05)', justifyContent: 'center' }}>
                    <div className="label" style={{ color: '#38bdf8', fontSize: '0.7rem' }}>Status</div>
                    <div className="value" style={{ fontSize: '1rem', color: '#f8fafc' }}>2026 Portfolio</div>
                </div>
            </section>

            <div className="top-row">
                <section className="card chart-container" style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem' }}>
                    <h2 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Monthly Net Income</h2>
                    <div style={{ width: '100%', height: '220px', flexShrink: 0 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                                <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="amount" radius={[2, 2, 0, 0]} fill="#38bdf8">
                                    {chartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={_entry.amount > 0 ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <h3 style={{ marginBottom: '0.4rem', fontSize: '0.85rem', color: '#94a3b8' }}>Portfolio Holdings</h3>
                        <div className="scroll-table" style={{ maxHeight: '160px' }}>
                            <table style={{ fontSize: '0.75rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0.3rem' }}>Ticker</th>
                                        <th style={{ padding: '0.3rem' }}>Quantity</th>
                                        <th style={{ textAlign: 'right', padding: '0.3rem' }}>Est. Yearly</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myHoldings.filter(h => h.quantity > 0).map(h => {
                                        const yearly = filteredEvents
                                            .filter(e => e.ticker === h.ticker)
                                            .reduce((sum, e) => sum + e.netAmount, 0);
                                        return (
                                            <tr key={h.ticker}>
                                                <td style={{ padding: '0.3rem' }}><span className="ticker-badge" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>{h.ticker}</span></td>
                                                <td style={{ padding: '0.3rem' }}>{h.quantity} 張</td>
                                                <td style={{ textAlign: 'right', padding: '0.3rem' }}>${yearly.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <section className="card timeline-container" style={{ padding: '0.75rem' }}>
                    <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Dividend Payment Timeline</h2>
                    <div className="scroll-table" style={{ maxHeight: '480px' }}>
                        <table style={{ fontSize: '0.8rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '0.3rem' }}>預計付款</th>
                                    <th style={{ textAlign: 'left', padding: '0.3rem' }}>項目</th>
                                    <th style={{ textAlign: 'right', padding: '0.3rem' }}>已收/待收</th>
                                    <th style={{ textAlign: 'right', padding: '0.3rem', color: '#ef4444' }}>健保</th>
                                    <th style={{ textAlign: 'right', padding: '0.3rem' }}>實付(Net)</th>
                                    <th style={{ textAlign: 'center', padding: '0.3rem' }}>除息</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTimelineEvents.map((e, idx) => (
                                    <tr key={`${e.ticker}-${idx}`}>
                                        <td style={{ textAlign: 'left', padding: '0.3rem', fontSize: '0.7rem', opacity: 0.8 }}>
                                            {e.paymentDate.split('T')[0].replace(/-/g, '/').slice(5)}
                                        </td>
                                        <td style={{ textAlign: 'left', padding: '0.3rem' }}>
                                            {e.ticker}
                                            {e.isProjection && <span className="projection-tag" style={{ fontSize: '0.5rem', padding: '0 2px' }}>P</span>}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.3rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                            <span style={{ color: e.status === 'received' ? '#22c55e' : '#94a3b8', opacity: e.status === 'received' ? 1 : 0.4 }}>
                                                {e.status === 'received' ? e.amount.toLocaleString() : '0'}
                                            </span>
                                            <span style={{ margin: '0 3px', opacity: 0.2 }}>/</span>
                                            <span style={{ color: e.status === 'pending' ? '#38bdf8' : '#94a3b8', opacity: e.status === 'pending' ? 1 : 0.4 }}>
                                                {e.status === 'pending' ? e.amount.toLocaleString() : '0'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.3rem', color: '#ef4444', opacity: e.healthInsuranceFee > 0 ? 0.9 : 0.1, fontSize: '0.7rem' }}>
                                            {e.healthInsuranceFee > 0 ? `-$${e.healthInsuranceFee.toLocaleString()}` : '0'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.3rem', fontWeight: 600, color: '#f8fafc' }}>
                                            ${e.netAmount.toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '0.3rem', opacity: 0.5, fontSize: '0.65rem' }}>
                                            {e.exDividendDate.split('T')[0].replace(/-/g, '/').slice(5)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
