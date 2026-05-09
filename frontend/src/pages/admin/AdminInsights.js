import React, { useState, useEffect } from 'react';
import { getAdminInsights } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { FiCalendar, FiFilter, FiDownload, FiTrendingUp, FiActivity, FiDollarSign, FiShoppingBag, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export default function AdminInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminInsights(filters);
      setData(res.data.insights);
    } catch { toast.error('Failed to load insights'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <div className="spinner" style={{ margin: '100px auto' }} />;

  const { salesOverTime, categoryPerformance, sellerPerformance, paymentDistribution } = data || {};

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Business Insights</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Deep dive into platform performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input type="date" className="form-input" style={{ width: '150px' }} value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
          </div>
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input type="date" className="form-input" style={{ width: '150px' }} value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={load}><FiFilter size={14} /> Apply</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ color: '#6366f1', marginBottom: '8px' }}><FiDollarSign size={20} /></div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Period Revenue</p>
          <p style={{ fontSize: '24px', fontWeight: 800 }}>₹{salesOverTime?.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ color: '#10b981', marginBottom: '8px' }}><FiActivity size={20} /></div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Commission</p>
          <p style={{ fontSize: '24px', fontWeight: 800 }}>₹{salesOverTime?.reduce((s, d) => s + d.commission, 0).toLocaleString()}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ color: '#f59e0b', marginBottom: '8px' }}><FiShoppingBag size={20} /></div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Orders</p>
          <p style={{ fontSize: '24px', fontWeight: 800 }}>{salesOverTime?.reduce((s, d) => s + d.orders, 0)}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ color: '#ec4899', marginBottom: '8px' }}><FiTrendingUp size={20} /></div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg. Daily Sales</p>
          <p style={{ fontSize: '24px', fontWeight: 800 }}>₹{Math.round((salesOverTime?.reduce((s, d) => s + d.revenue, 0) || 0) / (salesOverTime?.length || 1)).toLocaleString()}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiTrendingUp color="var(--primary)" /> Revenue Growth</h3>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesOverTime}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="commission" name="Commission" stroke="#10b981" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '24px' }}>Payment Methods</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="total" nameKey="_id">
                  {paymentDistribution?.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '16px' }}>
            {paymentDistribution?.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} /> {d._id}</span>
                <span style={{ fontWeight: 600 }}>₹{d.total.toLocaleString()} ({d.count} orders)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '24px' }}>Top Selling Categories</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="_id" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '24px' }}>Top Performing Sellers</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Seller</th><th>Orders</th><th>Revenue</th><th>Commission</th></tr></thead>
              <tbody>
                {sellerPerformance?.map((s, i) => (
                  <tr key={i}>
                    <td><p style={{ fontWeight: 600, fontSize: '13px' }}>{s.shopName}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.name}</p></td>
                    <td>{s.orders}</td>
                    <td style={{ fontWeight: 600 }}>₹{s.revenue.toLocaleString()}</td>
                    <td style={{ color: 'var(--primary)' }}>₹{s.commission.toLocaleString()}</td>
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
