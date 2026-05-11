import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { placeOrder, getPublicQRConfig, computeCartOffers, createRazorpayOrder, verifyRazorpayPayment } from '../../services/api';
import toast from 'react-hot-toast';
import { FiMapPin, FiTruck, FiShield, FiInfo, FiCreditCard } from 'react-icons/fi';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const getEffectivePrice = (item) => {
  if (item.effectivePrice != null && item.effectivePrice > 0) return item.effectivePrice;
  const p = item.product;
  if (p && p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price) return p.discountPrice;
  return item.price || p?.price || 0;
};

export default function Checkout() {
  const { cart, cartTotal, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [qrConfig, setQRConfig] = useState(null);
  const [offerDiscount, setOfferDiscount] = useState(0);
  const [appliedOffers, setAppliedOffers] = useState([]);
  const [itemDiscounts, setItemDiscounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    street: user?.addresses?.[0]?.street || '',
    city: user?.addresses?.[0]?.city || '',
    state: user?.addresses?.[0]?.state || '',
    zip: user?.addresses?.[0]?.zip || '',
    country: 'India',
    phone: user?.phone || '',
    note: '',
  });

  const items = cart?.items || [];
  const totalOriginal = items.reduce((s, i) => s + (i.price || i.product?.price || 0) * i.quantity, 0);
  const totalSavings = totalOriginal - cartTotal;
  const finalTotal = Math.max(0, cartTotal - offerDiscount);

  useEffect(() => {
    getPublicQRConfig().then(r => setQRConfig(r.data.config)).catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const payload = items.map(i => ({
      sellerId: i.product?.seller?._id || i.product?.seller,
      productId: i.product?._id,
      price: getEffectivePrice(i),
      quantity: i.quantity,
      category: i.product?.category,
    })).filter(x => x.sellerId && x.productId);
    if (!payload.length) return;
    computeCartOffers({ items: payload }).then(r => {
      setOfferDiscount(r.data.totalDiscount || 0);
      setAppliedOffers(r.data.appliedOffers || []);
      setItemDiscounts(r.data.itemDiscounts || {});
    }).catch(() => {});
  }, [cart]);

  const handleRazorpay = async () => {
    const resScript = await loadRazorpayScript();
    if (!resScript) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      return;
    }

    setLoading(true);
    try {
      // 1. Place order first to get internal order ID and final amount
      const appliedOfferIds = appliedOffers.map(ao => ao.offer?._id || ao.offer);
      const res = await placeOrder({ 
        shippingAddress: form, 
        note: form.note, 
        paymentMethod: 'Razorpay',
        appliedOfferIds 
      });
      
      const internalOrder = res.data.order;
      const internalOrderId = internalOrder._id;
      const amountToPay = internalOrder.totalAmount;

      // 2. Create Razorpay Order
      const orderRes = await createRazorpayOrder({ amount: amountToPay });
      const { order: razorpayOrder } = orderRes.data;

      const options = {
        key: 'rzp_test_So7Yc02wXbdKOi', // Test Key ID
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'MERN Ecommerce',
        description: `Payment for Order #${internalOrderId.slice(-6).toUpperCase()}`,
        order_id: razorpayOrder.id,
        handler: async (response) => {
          setLoading(true);
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: internalOrderId
            });

            toast.success('Order placed and paid successfully!');
            await fetchCart();
            navigate(`/orders/${internalOrderId}`);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed. Please contact support.');
            navigate(`/orders/${internalOrderId}`); // Go to order page anyway, user can pay later if we add that feature, or see it's pending.
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            toast.error('Payment cancelled');
            navigate(`/orders/${internalOrderId}`); // Order is created but unpaid.
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: form.phone
        },
        theme: {
          color: '#6366f1'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate checkout');
    } finally {
      // Don't set loading false here if we opened the modal, 
      // the handler or ondismiss will handle it.
      // But if we failed before opening modal, we need it.
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    
    if (paymentMethod === 'Razorpay') {
      await handleRazorpay();
      return;
    }

    setLoading(true);
    try {
      const appliedOfferIds = appliedOffers.map(ao => ao.offer?._id || ao.offer);
      const res = await placeOrder({ 
        shippingAddress: form, 
        note: form.note, 
        paymentMethod,
        appliedOfferIds 
      });
      toast.success('Order placed successfully!');
      await fetchCart();
      navigate(`/orders/${res.data.order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally { setLoading(false); }
  };

  const upiLink = qrConfig ? `upi://pay?pa=${qrConfig.upiId || 'pratyushkundu2001-1@okicici'}&pn=${encodeURIComponent(qrConfig.accountName || 'PRATYUSH KUNDU')}&am=${finalTotal}&cu=INR` : '';
  const dynamicQrUrl = upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}` : '';

  const selectAddress = (addr) => {
    setForm(f => ({ ...f, street: addr.street, city: addr.city, state: addr.state, zip: addr.zip }));
  };

  return (
    <div className="container" style={{ padding: '32px 24px 60px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '28px' }}>Checkout</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        <form onSubmit={handleSubmit}>
          {user?.addresses?.length > 0 && (
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>📍 Saved Addresses</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {user.addresses.map(addr => (
                  <button type="button" key={addr._id} onClick={() => selectAddress(addr)}
                    style={{ textAlign: 'left', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong>{addr.label}</strong> — {addr.street}, {addr.city}, {addr.state} {addr.zip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiMapPin color="var(--primary)" /> Shipping Address
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Street Address</label>
                <input className="form-input" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} placeholder="123 Main St, Apt 4B" required />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" required />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" required />
              </div>
              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input className="form-input" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} placeholder="400001" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Order Note (optional)</label>
                <textarea className="form-input" rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Special delivery instructions..." />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiShield color="var(--primary)" /> Payment Method
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* COD Option */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', border: `2px solid ${paymentMethod === 'COD' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', background: paymentMethod === 'COD' ? 'var(--primary-light)' : 'transparent' }}>
                <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} style={{ marginTop: 3, accentColor: 'var(--primary)' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}>💵 Cash on Delivery</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Pay when your order arrives at your door</p>
                </div>
              </label>

              {/* Razorpay Option */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', border: `2px solid ${paymentMethod === 'Razorpay' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', background: paymentMethod === 'Razorpay' ? 'var(--primary-light)' : 'transparent' }}>
                <input type="radio" name="payment" value="Razorpay" checked={paymentMethod === 'Razorpay'} onChange={() => setPaymentMethod('Razorpay')} style={{ marginTop: 3, accentColor: 'var(--primary)' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}><FiCreditCard style={{ marginRight: 8, verticalAlign: 'middle' }} /> Online Payment (Razorpay)</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Pay securely using Cards, UPI, Netbanking, or Wallets</p>
                </div>
              </label>

              {/* QR Option */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', border: `2px solid ${paymentMethod === 'QR' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', background: paymentMethod === 'QR' ? 'var(--primary-light)' : 'transparent' }}>
                <input type="radio" name="payment" value="QR" checked={paymentMethod === 'QR'} onChange={() => setPaymentMethod('QR')} style={{ marginTop: 3, accentColor: 'var(--primary)' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}>📱 QR / UPI Payment</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Scan QR code and submit payment proof for admin verification</p>
                </div>
              </label>
            </div>

            {paymentMethod === 'QR' && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>📲 Scan to Pay ₹{finalTotal.toLocaleString()}</p>
                <div style={{ background: '#fff', padding: '12px', borderRadius: 12, display: 'inline-block', margin: '0 auto 12px', width: 'auto' }}>
                  <img src={dynamicQrUrl} alt="Payment QR" style={{ width: 180, height: 180, objectFit: 'contain', display: 'block' }} />
                </div>
                <p style={{ fontSize: '13px', textAlign: 'center' }}><strong>UPI ID:</strong> {qrConfig?.upiId || 'pratyushkundu2001-1@okicici'}</p>
                <p style={{ fontSize: '13px', textAlign: 'center' }}><strong>Name:</strong> {qrConfig?.accountName || 'PRATYUSH KUNDU'}</p>
                
                {(qrConfig?.instructions || !qrConfig) && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <FiInfo size={14} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
                    <p style={{ fontSize: '12px', color: '#92400e' }}>
                      {qrConfig?.instructions || 'Please pay the exact total amount to the UPI ID above. After payment, you will need to upload the transaction screenshot in the order details page.'}
                    </p>
                  </div>
                )}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px', textAlign: 'center' }}>
                  After placing order, you'll be asked to upload your payment screenshot/proof
                </p>
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Placing Order...' : `Place Order — ₹${finalTotal.toLocaleString()}`}
          </button>
        </form>

        {/* Order Summary */}
        <div className="card" style={{ padding: '24px', position: 'sticky', top: '90px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Order Items ({items.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
            {items.map(item => {
              const p = item.product; if (!p) return null;
              const ep = getEffectivePrice(item);
              const hasDiscount = ep < (item.price || p.price || 0);
              const uomLabel = p.uom ? `${p.quantity || 1} ${p.uom}` : null;
              return (
                <div key={item._id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {p.images?.[0]?.url
                    ? <img src={p.images[0].url} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} alt="" />
                    : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📦</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    {uomLabel && <p style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '1px' }}>{uomLabel}</p>}
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Qty: {item.quantity}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>₹{(ep * item.quantity - (itemDiscounts[p._id] || 0)).toLocaleString()}</p>
                    {hasDiscount || itemDiscounts[p._id] > 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        ₹{((item.price || p.price) * item.quantity).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Offer suggestions */}
          {appliedOffers.length > 0 && (
            <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>🎁 Offers Applied</p>
              {appliedOffers.map((ao, i) => (
                <p key={i} style={{ fontSize: '12px', color: '#166534' }}>• {ao.offer?.title}: -₹{ao.discount?.toLocaleString()}</p>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Total MRP</span>
              <span style={{ textDecoration: 'line-through' }}>₹{totalOriginal.toLocaleString()}</span>
            </div>
            {totalSavings > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                <span>🎉 Product Savings</span>
                <span>- ₹{totalSavings.toLocaleString()}</span>
              </div>
            )}
            {offerDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6366f1', fontWeight: 700 }}>
                <span>✨ Platform Offers</span>
                <span>- ₹{offerDiscount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success)' }}>
              <span>Delivery</span><span>FREE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '20px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
              <span>Payable Amount</span>
              <span style={{ color: 'var(--primary)' }}>₹{finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg)', borderRadius: 8, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FiTruck size={16} color="var(--success)" />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Free delivery on all orders. Estimated 3-7 business days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
