import React, { useState, useEffect } from 'react';
import { getProductCommissions, approveCommission } from '../../services/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';

const STATUS_COLORS = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function AdminCommissions() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [noteModal, setNoteModal] = useState(null); // { id, action }
  const [note, setNote] = useState('');

  const load = () => {
    setLoading(true);
    getProductCommissions({ status: filter })
      .then(r => setProducts(r.data.products))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id, action) => {
    setProcessing(id);
    try {
      await approveCommission(id, { action, note });
      toast.success(action === 'approve' ? 'Commission approved!' : 'Commission rejected.');
      setNoteModal(null);
      setNote('');
      load();
    } catch { toast.error('Failed'); }
    finally { setProcessing(null); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Product Commissions</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Review and approve seller-set commission rates</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button className="btn btn-outline btn-sm" onClick={load}><FiRefreshCw size={13} /></button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Product</th><th>Seller</th><th>Commission Rate</th><th>Status</th><th>Note</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No commissions in this category</td></tr>
              ) : products.map(p => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {p.images?.[0]?.url && <img src={p.images[0].url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />}
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{p.seller?.shopName || p.seller?.name}<br /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.seller?.email}</span></td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>{p.commissionRate}%</span>
                    <br /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>of ₹{p.price?.toLocaleString()}</span>
                  </td>
                  <td><span className={`badge ${STATUS_COLORS[p.commissionStatus] || 'badge-secondary'}`}>{p.commissionStatus}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '150px' }}>{p.commissionNote || '—'}</td>
                  <td>
                    {p.commissionStatus === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff' }}
                          onClick={() => handleApprove(p._id, 'approve')}
                          disabled={processing === p._id}>
                          <FiCheck size={13} />
                        </button>
                        <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff' }}
                          onClick={() => setNoteModal({ id: p._id, action: 'reject' })}
                          disabled={processing === p._id}>
                          <FiX size={13} />
                        </button>
                      </div>
                    )}
                    {p.commissionStatus !== 'pending' && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {noteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '24px', width: '100%', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>Reject Commission</h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Reason for Rejection</label>
              <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Explain why this commission rate is rejected..." />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setNoteModal(null); setNote(''); }}>Cancel</button>
              <button className="btn btn-sm" style={{ flex: 1, background: '#dc2626', color: '#fff' }}
                onClick={() => handleApprove(noteModal.id, 'reject')} disabled={!!processing}>
                Reject Commission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
