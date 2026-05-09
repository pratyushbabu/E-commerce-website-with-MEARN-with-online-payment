import React, { useState, useEffect } from 'react';
import { getWithdrawalRequests, processWithdrawal, getWithdrawalAnalysis } from '../../services/api';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiRefreshCw, FiPieChart, FiActivity } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const STATUS_COLORS = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function AdminWithdrawals() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'analysis'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [processing, setProcessing] = useState(null);
  const [modal, setModal] = useState(null); 
  const [paymentDetails, setPaymentDetails] = useState('');
  const [analysisData, setAnalysisData] = useState(null);

  const load = () => {
    setLoading(true);
    getWithdrawalRequests()
      .then(r => setRequests(r.data.requests))
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
    
    getWithdrawalAnalysis().then(r => setAnalysisData(r.data.analysis)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleProcess = async () => {
    if (!modal) return;
    if (modal.action === 'approved' && !paymentDetails.trim()) {
      toast.error('Please enter payment details before approving'); return;
    }
    setProcessing(`${modal.sellerId}-${modal.requestId}`);
    try {
      await processWithdrawal(modal.sellerId, modal.requestId, { action: modal.action, paymentDetails });
      toast.success(modal.action === 'approved' ? 'Withdrawal approved and payment recorded!' : 'Withdrawal rejected.');
      setModal(null); setPaymentDetails(''); 
      load(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setProcessing(null); }
  };

  const filtered = requests.filter(r => filterStatus === 'all' || r.status === filterStatus);
  const pendingTotal = requests.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);

  const renderAnalysis = () => {
    if (!analysisData) return <div className="spinner" style={{ margin: '40px auto' }} />;
    const { stats, chartData } = analysisData;
    const pieData = [
      { name: 'Approved', value: stats.approved, color: '#16a34a' },
      { name: 'Rejected', value: stats.rejected, color: '#dc2626' },
      { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    ];

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div className="stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <div className="card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Payouts</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>₹{stats.totalAmount?.toLocaleString()}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Success Rate: {stats.successRate}%</p>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Approved</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>{stats.approved}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>From {stats.totalRequests} total requests</p>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rejected</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>{stats.rejected}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Failed/Denied</p>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pending</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>{stats.pending}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awaiting action</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '20px' }}>Payout Volume (Daily)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '20px' }}>Request Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '10px' }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} /> {d.name}</span>
                  <span style={{ fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Withdrawals</h1>
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
             <button onClick={() => setActiveTab('requests')} className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 0', borderBottom: activeTab === 'requests' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'requests' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <FiActivity size={16} /> Requests
             </button>
             <button onClick={() => setActiveTab('analysis')} className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`} style={{ background: 'none', border: 'none', padding: '8px 0', borderBottom: activeTab === 'analysis' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'analysis' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <FiPieChart size={16} /> Analysis
             </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {activeTab === 'requests' && ['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button className="btn btn-outline btn-sm" onClick={load}><FiRefreshCw size={13} /></button>
        </div>
      </div>

      {activeTab === 'requests' ? (
        <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Seller</th><th>Amount</th><th>Bank / UPI Details</th><th>Status</th><th>Date</th><th>Payment Ref</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                  : filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No requests</td></tr>
                  : filtered.map(r => (
                    <tr key={`${r.sellerId}-${r._id}`}>
                      <td style={{ fontSize: '13px' }}><strong>{r.shopName || r.sellerName}</strong><br /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.sellerEmail}</span></td>
                      <td style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>₹{r.amount?.toLocaleString()}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {r.bankDetails?.upiId ? <div>UPI: {r.bankDetails.upiId}</div> : 
                         r.bankDetails?.accountNumber ? <div>A/C: {r.bankDetails.accountNumber} ({r.bankDetails.ifsc})</div> : 
                         <span style={{ color: 'var(--danger)' }}>No details provided</span>}
                      </td>
                      <td><span className={`badge ${STATUS_COLORS[r.status] || 'badge-secondary'}`}>{r.status}</span></td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.requestedAt).toLocaleDateString()}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '150px' }}>{r.paymentDetails || '—'}</td>
                      <td>
                        {r.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-sm btn-success" onClick={() => { setModal({ sellerId: r.sellerId, requestId: r._id, amount: r.amount, action: 'approved', bankDetails: r.bankDetails }); setPaymentDetails(''); }}><FiCheck size={13} /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => { setModal({ sellerId: r.sellerId, requestId: r._id, amount: r.amount, action: 'rejected', bankDetails: r.bankDetails }); setPaymentDetails(''); }}><FiX size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : renderAnalysis()}

      {modal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '28px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>{modal.action === 'approved' ? '✅ Approve' : '❌ Reject'} Withdrawal</h3>
            <p style={{ marginBottom: '16px' }}>Amount: <strong>₹{modal.amount?.toLocaleString()}</strong></p>

            {modal.action === 'approved' && (
              <>
                <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 8, marginBottom: '16px', fontSize: '13px' }}>
                  <p style={{ fontWeight: 600, marginBottom: '8px' }}>Seller Payout Info:</p>
                  {modal.bankDetails?.upiId ? <p>UPI ID: <strong>{modal.bankDetails.upiId}</strong></p> : 
                   modal.bankDetails?.accountNumber ? <p>A/C: {modal.bankDetails.accountNumber} (IFSC: {modal.bankDetails.ifsc})</p> : 
                   <p style={{ color: 'var(--danger)' }}>No payment details found!</p>}
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Payment Reference *</label>
                  <textarea className="form-input" rows={3} value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)} placeholder="Transaction ID, Date, Method..." />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className={`btn ${modal.action === 'approved' ? 'btn-success' : 'btn-danger'}`} style={{ flex: 1 }} onClick={handleProcess} disabled={!!processing}>{processing ? 'Processing...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
