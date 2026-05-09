import React, { useState, useEffect } from 'react';
import { getAdminPayments, verifyQRPayment, processRefund } from '../../services/api';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiEye, FiRefreshCw } from 'react-icons/fi';

const STATUS_COLORS = {
  pending: 'badge-secondary', awaiting_verification: 'badge-warning',
  completed: 'badge-success', refunded: 'badge-primary',
  failed: 'badge-danger', cancelled: 'badge-secondary',
};

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [refundNote, setRefundNote] = useState('');

  const load = () => {
    setLoading(true);
    getAdminPayments({ status: filterStatus || undefined })
      .then(r => setPayments(r.data.payments))
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('qr-proof-submitted', load);
    socket.on('refund-details-submitted', load);
    return () => { socket.off('qr-proof-submitted', load); socket.off('refund-details-submitted', load); };
  }, []);

  const handleVerify = async (id, action) => {
    setProcessing(id + action);
    try {
      await verifyQRPayment(id, { action, note: verifyNote });
      toast.success(action === 'approve' ? 'Payment verified! Order is now processing.' : 'Payment rejected. Order cancelled.');
      setSelectedPayment(null);
      setVerifyNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setProcessing(null); }
  };

  const handleProcessRefund = async (id) => {
    if (!refundNote.trim()) { toast.error('Please enter refund payment details'); return; }
    setProcessing(id);
    try {
      await processRefund(id, { refundPaymentDetails: refundNote });
      toast.success('Refund marked as processed!');
      setSelectedPayment(null);
      setRefundNote('');
      load();
    } catch (err) {
      toast.error('Failed to process refund');
    } finally { setProcessing(null); }
  };

  const FILTER_OPTIONS = ['', 'awaiting_verification', 'completed', 'refunded', 'failed', 'cancelled'];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Payments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{payments.length} records</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(s => (
            <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus(s)}>
              {s || 'All'}
            </button>
          ))}
          <button className="btn btn-outline btn-sm" onClick={load}><FiRefreshCw size={13} /></button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th><th>Buyer</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                : payments.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 700, fontSize: '13px' }}>#{p.order?._id?.slice(-6).toUpperCase() || 'N/A'}</td>
                    <td style={{ fontSize: '13px' }}>{p.buyer?.name}<br /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.buyer?.email}</span></td>
                    <td>
                      <span className={`badge ${p.method === 'QR' ? 'badge-primary' : 'badge-secondary'}`}>
                        {p.method === 'QR' ? '📱 QR' : '💵 COD'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{p.amount?.toLocaleString()}</td>
                    <td><span className={`badge ${STATUS_COLORS[p.status] || 'badge-secondary'}`}>{p.status}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => { setSelectedPayment(p); setVerifyNote(''); setRefundNote(''); }}>
                        <FiEye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Payment Details</h3>
              <button onClick={() => setSelectedPayment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Buyer</span>
                <span style={{ fontWeight: 600 }}>{selectedPayment.buyer?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{selectedPayment.amount?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Method</span>
                <span>{selectedPayment.method === 'QR' ? '📱 QR/UPI' : '💵 COD'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span className={`badge ${STATUS_COLORS[selectedPayment.status]}`}>{selectedPayment.status}</span>
              </div>
              {selectedPayment.qrTransactionRef && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Transaction Ref</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedPayment.qrTransactionRef}</span>
                </div>
              )}
            </div>

            {/* QR proof image */}
            {selectedPayment.qrPaymentProof && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Payment Screenshot:</p>
                <img src={selectedPayment.qrPaymentProof} alt="Payment proof" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
              </div>
            )}

            {/* QR Verification actions */}
            {selectedPayment.status === 'awaiting_verification' && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Verify Payment:</p>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Note (optional)</label>
                  <input className="form-input" value={verifyNote} onChange={e => setVerifyNote(e.target.value)} placeholder="Verification note or rejection reason..." />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#16a34a', color: '#fff' }}
                    onClick={() => handleVerify(selectedPayment._id, 'approve')}
                    disabled={!!processing}>
                    <FiCheck size={14} /> Approve Payment
                  </button>
                  <button className="btn btn-sm" style={{ flex: 1, background: '#dc2626', color: '#fff' }}
                    onClick={() => handleVerify(selectedPayment._id, 'reject')}
                    disabled={!!processing}>
                    <FiX size={14} /> Reject Payment
                  </button>
                </div>
              </div>
            )}

            {/* Refund details & processing */}
            {selectedPayment.status === 'refunded' && (
              <div>
                {selectedPayment.refundDetails?.upiId || selectedPayment.refundDetails?.mobileNumber ? (
                  <div style={{ padding: '14px', background: '#eff6ff', borderRadius: 8, marginBottom: '16px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1d4ed8', marginBottom: '6px' }}>Buyer Refund Details:</p>
                    {selectedPayment.refundDetails.upiId && <p style={{ fontSize: '13px' }}>UPI: {selectedPayment.refundDetails.upiId}</p>}
                    {selectedPayment.refundDetails.mobileNumber && <p style={{ fontSize: '13px' }}>Mobile: {selectedPayment.refundDetails.mobileNumber}</p>}
                    {selectedPayment.refundDetails.accountName && <p style={{ fontSize: '13px' }}>Name: {selectedPayment.refundDetails.accountName}</p>}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Buyer has not yet submitted refund details.</p>
                )}
                {!selectedPayment.refundPaymentDetails ? (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Mark Refund as Sent:</p>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label className="form-label">Payment Details (transaction ID, UPI ref, etc.)</label>
                      <textarea className="form-input" rows={3} value={refundNote} onChange={e => setRefundNote(e.target.value)} placeholder="e.g. Sent ₹500 via UPI to buyer@upi, UTR: 12345678..." />
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: '100%' }}
                      onClick={() => handleProcessRefund(selectedPayment._id)}
                      disabled={!!processing}>
                      ✅ Mark Refund as Sent
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: 8 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>✅ Refund Processed</p>
                    <p style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>{selectedPayment.refundPaymentDetails}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
