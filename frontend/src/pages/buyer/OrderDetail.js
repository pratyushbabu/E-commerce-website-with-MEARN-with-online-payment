import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, submitQRProof, cancelOrder, submitRefundDetails } from '../../services/api';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUpload, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const STEPS = ['pending', 'processing', 'shipped', 'delivered'];
const STEP_LABELS = { pending: 'Order Placed', processing: 'Packed', shipped: 'Shipped', delivered: 'Delivered' };
const STEP_ICONS = { pending: '📋', processing: '📦', shipped: '🚚', delivered: '✅' };

const STATUS_COLORS = {
  pending: 'badge-warning', processing: 'badge-primary',
  shipped: 'badge-primary', delivered: 'badge-success', cancelled: 'badge-danger',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState(null);
  const [liveCancelReason, setLiveCancelReason] = useState(null);

  // QR proof state
  const [proofFile, setProofFile] = useState(null);
  const [proofRef, setProofRef] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Refund details state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundDetails, setRefundDetails] = useState({ upiId: '', mobileNumber: '', accountName: '' });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const loadOrder = async () => {
    try {
      const r = await getOrder(id);
      setOrder(r.data.order);
      setPayment(r.data.payment);
      setLiveStatus(r.data.order.orderStatus);
    } catch { navigate('/orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrder(); }, [id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('track-order', id);
    const handler = ({ orderId, orderStatus, status, cancelReason: cr }) => {
      if (orderId === id || orderId === order?._id?.toString()) {
        const finalStatus = orderStatus || status;
        setLiveStatus(finalStatus);
        if (cr) setLiveCancelReason(cr);
        setOrder(prev => {
          if (!prev) return prev;
          const updated = { ...prev, orderStatus: finalStatus };
          if (cr) updated.cancelReason = cr;
          if (finalStatus === 'delivered') {
            updated.paymentStatus = 'paid';
            updated.deliveredAt = new Date().toISOString();
            updated.subOrders = prev.subOrders?.map(s => ({ ...s, status: 'delivered' }));
          }
          return updated;
        });
      }
    };
    socket.on('order-status-update', handler);
    return () => { socket.emit('leave-order', id); socket.off('order-status-update', handler); };
  }, [id, order?._id]);

  const handleSubmitProof = async () => {
    if (!proofFile && !proofRef) { toast.error('Please upload a screenshot or enter transaction reference'); return; }
    setSubmittingProof(true);
    try {
      const fd = new FormData();
      if (proofFile) fd.append('proof', proofFile);
      fd.append('qrTransactionRef', proofRef);
      await submitQRProof(id, fd);
      toast.success('Payment proof submitted! Admin will verify shortly.');
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit proof');
    } finally { setSubmittingProof(false); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Please provide a reason for cancellation'); return; }
    setCancelling(true);
    try {
      await cancelOrder(id, { reason: cancelReason });
      toast.success('Order cancelled successfully');
      setShowCancelModal(false);
      await loadOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this order');
    } finally { setCancelling(false); }
  };

  const handleRefundSubmit = async () => {
    if (!refundDetails.upiId && !refundDetails.mobileNumber) {
      toast.error('Please provide UPI ID or mobile number for refund'); return;
    }
    setSubmittingRefund(true);
    try {
      await submitRefundDetails(id, refundDetails);
      toast.success('Refund details submitted! Admin will process your refund.');
      setShowRefundModal(false);
      await loadOrder();
    } catch (err) {
      toast.error('Failed to submit refund details');
    } finally { setSubmittingRefund(false); }
  };

  if (loading) return <div className="spinner" style={{ marginTop: '80px' }} />;
  if (!order) return null;

  const currentStatus = liveStatus || order.orderStatus;
  const currentStep = STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const canCancel = !isCancelled && !['shipped', 'delivered'].includes(currentStatus);
  const isQR = order.paymentMethod === 'QR';
  const needsProof = isQR && payment && !['completed', 'cancelled', 'failed'].includes(payment.status) && !payment.qrPaymentProof && !payment.qrTransactionRef;
  const proofSubmitted = isQR && payment && (payment.qrPaymentProof || payment.qrTransactionRef) && payment.status === 'awaiting_verification';
  const needsRefund = isCancelled && isQR && payment && payment.status === 'refunded' && !payment.refundDetails?.upiId && !payment.refundPaymentDetails;
  const refundSubmitted = isCancelled && isQR && payment?.refundDetails?.upiId;
  const refundDone = isQR && payment?.refundPaymentDetails;

  return (
    <div className="container" style={{ padding: '32px 24px 60px', maxWidth: '820px' }}>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: '24px' }} onClick={() => navigate('/orders')}>
        <FiArrowLeft size={14} /> Back to Orders
      </button>

      {/* Cancel Reason Banner */}
      {(isCancelled && (order.cancelReason || liveCancelReason)) && (
        <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <FiAlertCircle size={18} color="#dc2626" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>Order Cancelled</p>
            <p style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '4px' }}>Reason: {order.cancelReason || liveCancelReason}</p>
          </div>
        </div>
      )}

      {/* QR Proof Section */}
      {isQR && needsProof && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '2px solid #f59e0b' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#92400e' }}>⚠️ Payment Proof Required</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Please upload your payment screenshot or enter your UPI transaction reference so admin can verify your payment.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">UPI Transaction Reference</label>
              <input className="form-input" value={proofRef} onChange={e => setProofRef(e.target.value)} placeholder="Enter UTR / transaction reference number" />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Screenshot</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: '1.5px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <FiUpload size={16} />
                {proofFile ? proofFile.name : 'Click to upload screenshot'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setProofFile(e.target.files[0])} />
              </label>
            </div>
            <button className="btn btn-primary" onClick={handleSubmitProof} disabled={submittingProof}>
              {submittingProof ? 'Submitting...' : '📤 Submit Payment Proof'}
            </button>
          </div>
        </div>
      )}

      {proofSubmitted && (
        <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fcd34d', display: 'flex', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⏳</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px', color: '#92400e' }}>Payment Proof Submitted</p>
            <p style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>Your payment is awaiting admin verification. Order processing will begin once verified.</p>
            {payment.qrTransactionRef && <p style={{ fontSize: '12px', color: '#78350f' }}>Transaction Ref: {payment.qrTransactionRef}</p>}
          </div>
        </div>
      )}

      {/* Refund Section for cancelled QR orders */}
      {needsRefund && (
        <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '2px solid var(--primary)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>💰 Submit Refund Details</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Your order was cancelled. Provide your UPI/mobile number so admin can send the refund.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowRefundModal(true)}>Enter Refund Details</button>
        </div>
      )}

      {refundSubmitted && !refundDone && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 600 }}>⏳ Refund details submitted. Admin will process your refund shortly.</p>
          <p style={{ fontSize: '12px', color: '#1e40af', marginTop: '4px' }}>Refund to: {payment.refundDetails.upiId || payment.refundDetails.mobileNumber}</p>
        </div>
      )}

      {refundDone && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', display: 'flex', gap: '10px' }}>
          <FiCheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>Refund Processed</p>
            <p style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>₹{payment.amount.toLocaleString()} has been refunded. Details: {payment.refundPaymentDetails}</p>
          </div>
        </div>
      )}

      {/* Order header */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>
              Order #{order._id.slice(-8).toUpperCase()}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {order.paymentMethod && (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Payment: {order.paymentMethod === 'QR' ? '📱 QR/UPI' : '💵 Cash on Delivery'}
                {isQR && payment && (
                  <span style={{ marginLeft: 8 }} className={`badge ${
                    payment.status === 'completed' ? 'badge-success' :
                    payment.status === 'awaiting_verification' ? 'badge-warning' :
                    payment.status === 'failed' ? 'badge-danger' :
                    payment.status === 'refunded' ? 'badge-primary' : 'badge-secondary'
                  }`}>{payment.status}</span>
                )}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${STATUS_COLORS[currentStatus] || 'badge-secondary'}`} style={{ fontSize: '13px', padding: '6px 12px' }}>
              {currentStatus}
            </span>
            {canCancel && (
              <button className="btn btn-outline btn-sm" style={{ borderColor: '#ef4444', color: '#ef4444' }}
                onClick={() => setShowCancelModal(true)}>
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Progress stepper */}
        {!isCancelled && (
          <div style={{ marginTop: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '20px', left: '10%', right: '10%', height: '2px', background: 'var(--border)', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: '20px', left: '10%', height: '2px', background: 'var(--primary)', zIndex: 0, width: `${Math.max(0, currentStep / (STEPS.length - 1)) * 80}%`, transition: 'width 0.5s' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              {STEPS.map((step, i) => {
                const done = i <= currentStep;
                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '25%' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: done ? 'var(--primary)' : 'var(--bg)', border: `2px solid ${done ? 'var(--primary)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.3s' }}>
                      {STEP_ICONS[step]}
                    </div>
                    <p style={{ fontSize: '11px', color: done ? 'var(--primary)' : 'var(--text-muted)', fontWeight: done ? 700 : 400, textAlign: 'center' }}>
                      {STEP_LABELS[step]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sub-orders */}
      {order.subOrders?.map((sub, si) => (
        <div key={si} className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
              🏪 {sub.seller?.shopName || sub.seller?.name}
            </h3>
            <span className={`badge ${STATUS_COLORS[sub.status] || 'badge-secondary'}`}>{sub.status}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sub.items?.map((item, ii) => {
              const totalDiscount = (item.sellerDiscount || 0) + (item.adminDiscount || 0);
              return (
                <div key={ii} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px', background: 'var(--bg)', borderRadius: 8 }}>
                  {item.image
                    ? <img src={item.image} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 50, height: 50, borderRadius: 8, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📦</div>
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{item.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Qty: {item.quantity} × ₹{item.price?.toLocaleString()} 
                      {totalDiscount > 0 && (
                        <span style={{ marginLeft: '8px', textDecoration: 'line-through', fontSize: '11px' }}>
                          ₹{item.originalPrice?.toLocaleString()}
                        </span>
                      )}
                    </p>
                    {item.sellerDiscount > 0 && <p style={{ fontSize: '11px', color: 'var(--success)' }}>Seller Discount: -₹{item.sellerDiscount.toLocaleString()}</p>}
                    {item.adminDiscount > 0 && <p style={{ fontSize: '11px', color: 'var(--success)' }}>Admin Discount: -₹{item.adminDiscount.toLocaleString()}</p>}
                  </div>
                  <p style={{ fontWeight: 700 }}>₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>Subtotal: ₹{sub.subtotal?.toLocaleString()}</p>
          </div>
        </div>
      ))}

      {/* Address & Total */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>📍 Shipping Address</h3>
          {order.shippingAddress && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p>📞 {order.shippingAddress.phone}</p>}
            </div>
          )}
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>💳 Payment Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Method</span>
              <span>{order.paymentMethod === 'QR' ? '📱 QR/UPI' : '💵 COD'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status</span>
              <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : order.paymentStatus === 'refunded' ? 'badge-primary' : order.paymentStatus === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{order.paymentStatus}</span>
            </div>
            
            <div style={{ borderTop: '1px dashed var(--border)', marginTop: '4px', paddingTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Item Total (MRP)</span>
                <span>₹{(order.totalAmount + (order.sellerDiscountTotal || 0) + (order.adminDiscountTotal || 0)).toLocaleString()}</span>
              </div>
              {order.sellerDiscountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', marginTop: '4px' }}>
                  <span>Seller Discounts</span>
                  <span>-₹{order.sellerDiscountTotal.toLocaleString()}</span>
                </div>
              )}
              {order.adminDiscountTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6366f1', marginTop: '4px', fontWeight: 600 }}>
                  <span>✨ Platform Offers</span>
                  <span>-₹{order.adminDiscountTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '18px', paddingTop: '8px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
              <span>Amount Paid</span>
              <span style={{ color: 'var(--primary)' }}>₹{order.totalAmount?.toLocaleString()}</span>
            </div>
            {(order.sellerDiscountTotal > 0 || order.adminDiscountTotal > 0) && (
              <p style={{ fontSize: '11px', color: 'var(--success)', textAlign: 'right', fontWeight: 600 }}>
                You saved ₹{((order.sellerDiscountTotal || 0) + (order.adminDiscountTotal || 0)).toLocaleString()}!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '28px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Cancel Order</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {order.paymentMethod === 'QR' ? 'For QR payments, you will need to provide refund account details after cancellation.' : 'Cash on Delivery orders — no refund needed.'}
            </p>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Reason for Cancellation *</label>
              <textarea className="form-input" rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Please explain why you're cancelling this order..." />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCancelModal(false)}>Keep Order</button>
              <button className="btn" style={{ flex: 1, background: '#ef4444', color: '#fff' }} onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '28px', width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Refund Details</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Admin will send ₹{payment?.amount?.toLocaleString()} to your UPI ID or mobile number.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">UPI ID</label>
                <input className="form-input" value={refundDetails.upiId} onChange={e => setRefundDetails({ ...refundDetails, upiId: e.target.value })} placeholder="yourname@upi" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number (for UPI)</label>
                <input className="form-input" value={refundDetails.mobileNumber} onChange={e => setRefundDetails({ ...refundDetails, mobileNumber: e.target.value })} placeholder="9876543210" />
              </div>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input className="form-input" value={refundDetails.accountName} onChange={e => setRefundDetails({ ...refundDetails, accountName: e.target.value })} placeholder="Your name on UPI account" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowRefundModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRefundSubmit} disabled={submittingRefund}>
                {submittingRefund ? 'Submitting...' : 'Submit Refund Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
