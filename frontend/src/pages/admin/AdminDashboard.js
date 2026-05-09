import React, { useState, useEffect } from 'react';
import { getAdminDashboard } from '../../services/api';
import { getSocket } from '../../services/socket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { FiUsers, FiPackage, FiShoppingBag, FiDollarSign, FiClock, FiCheck, FiBarChart2, FiPieChart, FiTrendingUp, FiActivity } from 'react-icons/fi';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveActivity, setLiveActivity] = useState([]);

  useEffect(() => {
    getAdminDashboard().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join-admin');
    const handlers = {
      'new-user': (d) => setLiveActivity(prev => [{ type: 'user', ...d, time: new Date() }, ...prev].slice(0, 10)),
      'new-order': (d) => setLiveActivity(prev => [{ type: 'order', ...d, time: new Date() }, ...prev].slice(0, 10)),
      'new-product-pending': (d) => setLiveActivity(prev => [{ type: 'product', ...d, time: new Date() }, ...prev].slice(0, 10)),
      'withdrawal-request': (d) => setLiveActivity(prev => [{ type: 'withdrawal', ...d, time: new Date() }, ...prev].slice(0, 10)),
    };
    Object.entries(handlers).forEach(([e, h]) => socket.on(e, h));
    return () => Object.keys(handlers).forEach(e => socket.off(e));
  }, []);

  if (loading) return <div style={{ padding: '40px' }}><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, monthlyRevenue, recentOrders, recentUsers } = data;

  const insightCards = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue?.toLocaleString()}`, icon: <FiDollarSign />, color: '#10b981', sub: 'Gross merchandise volume' },
    { label: 'Admin Commission', value: `₹${stats.totalCommissionEarned?.toLocaleString()}`, icon: <FiBarChart2 />, color: '#6366f1', sub: 'Platform net earnings' },
    { label: 'Avg Order Value', value: `₹${Math.round(stats.aov || 0).toLocaleString()}`, icon: <FiTrendingUp />, color: '#f59e0b', sub: 'Revenue per order' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <FiShoppingBag />, color: '#3b82f6', sub: 'Completed transactions' },
    { label: 'Total Users', value: stats.totalUsers, icon: <FiUsers />, color: '#ec4899', sub: `${stats.totalSellers} sellers, ${stats.totalBuyers} buyers` },
    { label: 'Live Products', value: stats.totalProducts, icon: <FiPackage />, color: '#8b5cf6', sub: 'Approved items in shop' },
  ];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Admin Insights</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Multi-dimensional platform analytics</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {insightCards.map((c, i) => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '15', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' }}>{c.icon}</div>
            <p style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '2px' }}>{c.value}</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>{c.label}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiActivity /> Financial Performance</h3>
          {monthlyRevenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="_id.month" tick={{ fontSize: 11 }} tickFormatter={m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v, name) => [`₹${v.toLocaleString()}`, name === 'revenue' ? 'Gross Revenue' : 'Net Commission']} 
                />
                <Bar dataKey="revenue" name="revenue" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="commission" name="commission" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state">No data</div>}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiPieChart /> Categories</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.categoryStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="_id">
                {stats.categoryStats?.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: '16px' }}>
            {stats.categoryStats?.slice(0, 4).map((cat, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} /> {cat._id}</span>
                <span style={{ fontWeight: 600 }}>{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>⚡ Real-time Activity</h3>
          {liveActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>Waiting for activity...</div>
          ) : liveActivity.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {a.type === 'order' ? '🛒' : a.type === 'user' ? '👤' : a.type === 'withdrawal' ? '💰' : '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 500 }}>
                  {a.type === 'order' && `New order placed: ₹${a.total}`}
                  {a.type === 'user' && `New ${a.role} registered: ${a.name}`}
                  {a.type === 'product' && `Product pending: ${a.product?.name}`}
                  {a.type === 'withdrawal' && `Withdrawal request from ${a.sellerName}: ₹${a.amount}`}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(a.time).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '24px' }}>
           <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Recent Performance</h3>
           <div className="table-wrapper">
            <table>
              <thead><tr><th>Order</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recentOrders?.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600, fontSize: '13px' }}>#{o._id.slice(-6).toUpperCase()}</td>
                    <td style={{ fontSize: '13px' }}>{o.buyer?.name}</td>
                    <td style={{ fontWeight: 600, fontSize: '13px' }}>₹{o.totalAmount?.toLocaleString()}</td>
                    <td><span className={`badge ${o.orderStatus === 'delivered' ? 'badge-success' : 'badge-warning'}`}>{o.orderStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
