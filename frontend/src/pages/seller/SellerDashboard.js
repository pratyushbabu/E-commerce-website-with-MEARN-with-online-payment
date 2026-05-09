import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSellerDashboard, requestWithdrawal, getOfferSchedules } from '../../services/api';
import { getSocket } from '../../services/socket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { FiPackage, FiShoppingBag, FiDollarSign, FiClock, FiTrendingUp, FiAlertCircle, FiBarChart2, FiPieChart } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [offerSchedules, setOfferSchedules] = useState([]);
  const [liveEarnings, setLiveEarnings] = useState(null); // tracks real-time updates

  const load = () => {
    getSellerDashboard()
      .then(r => { setData(r.data); setLiveEarnings(null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    getOfferSchedules().then(r => setOfferSchedules(r.data.schedules || [])).catch(() => {});
  }, []);

  // Real-time earnings update
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ amount, orderId }) => {
      setLiveEarnings(prev => (prev ?? data?.stats?.totalEarnings ?? 0) + amount);
      toast.success(`₹${amount?.toLocaleString()} added to your earnings!`, { icon: '💰', duration: 5000 });
    };
    socket.on('earnings-updated', handler);
    return () => socket.off('earnings-updated', handler);
  }, [data]);

  // Real-time new orders
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => {
      // Reload dashboard data when new order comes in
      setTimeout(load, 1000);
    };
    socket.on('new-order', handler);
    return () => socket.off('new-order', handler);
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
      toast.error('Enter a valid amount'); return;
    }
    const maxEarnings = liveEarnings ?? data?.stats?.totalEarnings ?? 0;
    if (Number(withdrawAmount) > maxEarnings) {
      toast.error('Amount exceeds your total earnings'); return;
    }
    try {
      await requestWithdrawal({ amount: Number(withdrawAmount) });
      toast.success('Withdrawal request submitted! Admin will process it soon.');
      setWithdrawAmount('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div style={{ padding: '40px' }}><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, salesData, recentOrders } = data;
  const displayEarnings = liveEarnings ?? stats.totalEarnings;

  const insightCards = [
    { label: 'Available Balance', value: `₹${displayEarnings?.toLocaleString()}`, icon: <FiDollarSign />, color: '#10b981', sub: 'Ready for withdrawal' },
    { label: 'Lifetime Earnings', value: `₹${stats.lifetimeEarnings?.toLocaleString() || 0}`, icon: <FiTrendingUp />, color: '#6366f1', sub: 'Net earnings from orders' },
    { label: 'Total Sales', value: `₹${(stats.totalSales || 0).toLocaleString()}`, icon: <FiPackage />, color: '#f59e0b', sub: 'Gross sales (after seller discount)' },
    { label: 'Platform Fee', value: `₹${(stats.totalCommission || 0).toLocaleString()}`, icon: <FiBarChart2 />, color: '#ef4444', sub: 'Commission to admin' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <FiShoppingBag />, color: '#3b82f6', sub: 'Orders received' },
    { label: 'Stock Alerts', value: stats.stockAlerts || 0, icon: <FiAlertCircle />, color: stats.stockAlerts > 0 ? '#dc2626' : '#10b981', sub: 'Items low in stock' },
  ];

  const statusPieData = Object.entries(stats.orderStatusStats || {}).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Welcome back, {user?.name} 👋</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {user?.shopName} · Seller Dashboard
        </p>
      </div>

      {/* Offer Schedule Banners */}
      {offerSchedules.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>📅 Upcoming / Active Offer Schedules</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {offerSchedules.map(s => {
              const now = new Date();
              const isLive = now >= new Date(s.startDate) && now <= new Date(s.endDate);
              return (
                <div key={s._id} style={{ padding: '10px 14px', borderRadius: 8, background: s.bannerColor + '18', border: `1.5px solid ${s.bannerColor}50`, fontSize: '13px' }}>
                  <p style={{ fontWeight: 700, color: s.bannerColor }}>{isLive ? '🔥' : '📅'} {s.title}</p>
                  {s.discountHint && <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.discountHint}</p>}
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approval banner */}
      {!user?.isApproved && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 12, padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiAlertCircle color="#d97706" size={22} />
          <div>
            <p style={{ fontSize: '14px', color: '#92400e', fontWeight: 600 }}>Account Pending Approval</p>
            <p style={{ fontSize: '13px', color: '#92400e' }}>Your seller account is awaiting admin review. You'll be notified once approved.</p>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {insightCards.map((c, i) => (
          <div key={i} className="card" style={{ padding: '18px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + '15', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' }}>{c.icon}</div>
            <p style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '2px' }}>{c.value}</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>{c.label}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiBarChart2 /> Growth Analytics</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiPieChart /> Order Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusPieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                {statusPieData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '10px' }}>
            {statusPieData.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} /> {s.name}</span>
                <span style={{ fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px' }}>Recent Orders</h3>
              <Link to="/seller/orders" style={{ fontSize: '12px', color: 'var(--primary)' }}>View all orders</Link>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Status</th></tr></thead>
                <tbody>
                  {recentOrders?.slice(0, 6).map(o => (
                    <tr key={o._id}>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>#{o._id.slice(-6).toUpperCase()}</td>
                      <td style={{ fontSize: '13px' }}>{o.buyer?.name}</td>
                      <td style={{ fontSize: '13px' }}>{o.subOrders[0]?.items?.length} items</td>
                      <td><span className={`badge ${o.orderStatus === 'delivered' ? 'badge-success' : 'badge-warning'}`}>{o.orderStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '20px' }}>Withdrawal History</h3>
            {data.withdrawalRequests?.length > 0 ? (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead>
                  <tbody>
                    {data.withdrawalRequests.map(w => (
                      <tr key={w._id}>
                        <td style={{ fontSize: '13px' }}>{new Date(w.requestedAt).toLocaleDateString()}</td>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>₹{w.amount.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${w.status === 'approved' ? 'badge-success' : w.status === 'rejected' ? 'badge-error' : 'badge-warning'}`}>
                            {w.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{w.paymentDetails || w.processedNote || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>No withdrawal requests yet.</p>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '24px', background: 'var(--primary)', color: '#fff', alignSelf: 'start' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#fff' }}>Withdraw Funds</h3>
          <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '20px' }}>Available balance to transfer to your bank account.</p>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Balance</p>
            <p style={{ fontSize: '32px', fontWeight: 800 }}>₹{displayEarnings?.toLocaleString()}</p>
          </div>
          <input className="form-input" type="number" placeholder="Enter amount (₹)" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
            style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }} />
          <button className="btn" style={{ width: '100%', background: '#fff', color: 'var(--primary)', fontWeight: 700 }} onClick={handleWithdraw}>Request Payout</button>
        </div>
      </div>
    </div>
  );
}
