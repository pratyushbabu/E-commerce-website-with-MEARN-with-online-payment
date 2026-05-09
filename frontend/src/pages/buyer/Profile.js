import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, changePassword, addAddress, deleteAddress, getBuyerDashboard } from '../../services/api';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiMapPin, FiPlus, FiTrash2, FiLayout, FiShoppingBag, FiHeart, FiDollarSign, FiClock, FiActivity, FiCheck, FiTrendingUp } from 'react-icons/fi';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Profile() {
  const { user, updateUser, loadUser } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [addrForm, setAddrForm] = useState({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'India', isDefault: false });
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    if (tab === 'dashboard') {
      getBuyerDashboard().then(r => setDashboardData(r.data)).catch(() => {});
    }
  }, [tab]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile(profileForm);
      updateUser(res.data.user);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed');
      setPassForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addAddress(addrForm);
      await loadUser();
      setAddrForm({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'India', isDefault: false });
      toast.success('Address added');
    } catch { toast.error('Failed to add address'); }
    setLoading(false);
  };

  const handleDeleteAddress = async (id) => {
    try { await deleteAddress(id); await loadUser(); toast.success('Address removed'); }
    catch { toast.error('Failed'); }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiLayout /> },
    { id: 'profile', label: 'Profile', icon: <FiUser /> },
    { id: 'password', label: 'Password', icon: <FiLock /> },
    { id: 'addresses', label: 'Addresses', icon: <FiMapPin /> }
  ];

  const renderDashboard = () => {
    if (!dashboardData) return <div className="spinner" style={{ margin: '40px auto' }} />;
    const { stats, monthlySpending, recentOrders } = dashboardData;

    const insightCards = [
      { label: 'Total Spent', value: `₹${stats.totalSpent?.toLocaleString()}`, icon: <FiDollarSign />, color: '#10b981' },
      { label: 'Total Orders', value: stats.totalOrders, icon: <FiShoppingBag />, color: '#6366f1' },
      { label: 'Wishlist Items', value: stats.wishlistCount, icon: <FiHeart />, color: '#ef4444' },
      { label: 'In Cart', value: stats.cartCount, icon: <FiActivity />, color: '#f59e0b' },
      { label: 'Active Orders', value: stats.activeOrders, icon: <FiClock />, color: '#3b82f6' },
      { label: 'Delivered', value: stats.deliveredOrders, icon: <FiCheck />, color: '#8b5cf6' },
    ];

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div className="stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
          {insightCards.map((c, i) => (
            <div key={i} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.color + '15', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginBottom: '8px' }}>{c.icon}</div>
              <p style={{ fontSize: '18px', fontWeight: 800, marginBottom: '2px' }}>{c.value}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{c.label}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}><FiActivity /> SPENDING TREND</h3>
          {monthlySpending?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlySpending}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: '40px 0' }}>No spending data yet</div>}
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>RECENT ORDERS</h3>
          {recentOrders?.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Order</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>#{o._id.slice(-6).toUpperCase()}</td>
                      <td style={{ fontSize: '12px' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>₹{o.totalAmount?.toLocaleString()}</td>
                      <td><span className={`badge ${o.orderStatus === 'delivered' ? 'badge-success' : 'badge-warning'}`}>{o.orderStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No orders yet</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ padding: '32px 24px 60px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>My Account</h1>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', borderBottom: '2px solid var(--border)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} className={`pd-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && renderDashboard()}

      {tab === 'profile' && (
        <form className="card" style={{ padding: '28px' }} onSubmit={handleProfileSave}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700 }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '18px' }}>{user?.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{user?.email}</p>
              <span className="badge badge-primary" style={{ marginTop: '4px' }}>{user?.role}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 9876543210" />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      )}

      {tab === 'password' && (
        <form className="card" style={{ padding: '28px' }} onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={passForm.currentPassword} onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} placeholder="Min 6 characters" required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={passForm.confirm} onChange={e => setPassForm({ ...passForm, confirm: e.target.value })} required />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Updating...' : 'Change Password'}</button>
        </form>
      )}

      {tab === 'addresses' && (
        <div>
          {user?.addresses?.map(addr => (
            <div key={addr._id} className="card" style={{ padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-primary">{addr.label}</span>
                  {addr.isDefault && <span className="badge badge-success">Default</span>}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {addr.street}, {addr.city}, {addr.state} - {addr.zip}
                </p>
              </div>
              <button onClick={() => handleDeleteAddress(addr._id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
            </div>
          ))}
          <form className="card" style={{ padding: '24px', marginTop: '16px' }} onSubmit={handleAddAddress}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}><FiPlus style={{ verticalAlign: 'middle' }} /> Add New Address</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Label</label>
                <select className="form-input" value={addrForm.label} onChange={e => setAddrForm({ ...addrForm, label: e.target.value })}>
                  <option>Home</option><option>Work</option><option>Other</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Street</label>
                <input className="form-input" value={addrForm.street} onChange={e => setAddrForm({ ...addrForm, street: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={addrForm.city} onChange={e => setAddrForm({ ...addrForm, city: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={addrForm.state} onChange={e => setAddrForm({ ...addrForm, state: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input className="form-input" value={addrForm.zip} onChange={e => setAddrForm({ ...addrForm, zip: e.target.value })} required />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm({ ...addrForm, isDefault: e.target.checked })} />
              Set as default address
            </label>
            <button className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Saving...' : 'Add Address'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
