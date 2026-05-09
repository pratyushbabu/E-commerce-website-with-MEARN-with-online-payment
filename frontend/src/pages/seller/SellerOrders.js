import React, { useState, useEffect } from 'react';
import { getSellerOrders, updateSubOrderStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';

const STATUS_OPTS = ['packed', 'shipped'];
const STATUS_COLORS = { pending: 'badge-warning', packed: 'badge-primary', shipped: 'badge-primary', delivered: 'badge-success', cancelled: 'badge-danger' };

export default function SellerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSellerOrders().then(r => setOrders(r.data.orders)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ orderId }) => {
      getSellerOrders().then(r => setOrders(r.data.orders)).catch(() => {});
    };
    socket.on('new-order', handler);
    return () => socket.off('new-order', handler);
  }, []);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateSubOrderStatus(orderId, { status });
      setOrders(prev => prev.map(o => o._id === orderId
        ? { ...o, subOrders: o.subOrders.map(s => s.seller === user._id || s.seller?._id === user._id ? { ...s, status } : s) }
        : o
      ));
      toast.success(`Status updated to ${status}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  if (loading) return <div style={{ padding: '40px' }}><div className="spinner" /></div>;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Orders</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{orders.length} orders received</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state card" style={{ padding: '60px' }}>
          <p style={{ fontSize: '48px' }}>📭</p>
          <h3>No orders yet</h3>
          <p>Orders will appear here once buyers purchase your products</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => {
            const sub = order.subOrders?.[0];
            return (
              <div key={order._id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '15px' }}>Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Buyer: {order.buyer?.name} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {order.shippingAddress && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📍 {order.shippingAddress.city}, {order.shippingAddress.state}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge ${STATUS_COLORS[sub?.status] || 'badge-secondary'}`}>{sub?.status}</span>
                    {sub?.status !== 'delivered' && sub?.status !== 'cancelled' && (
                      <select className="form-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                        value="" onChange={e => handleStatusUpdate(order._id, e.target.value)}>
                        <option value="" disabled>Update Status</option>
                        {STATUS_OPTS.filter(s => s !== sub?.status).map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg)', borderRadius: 10, padding: '14px' }}>
                  {sub?.items?.map((item, ii) => (
                    <div key={ii} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {item.image
                        ? <img src={item.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                        : <div style={{ width: 48, height: 48, background: 'white', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500 }}>{item.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Qty: {item.quantity} × ₹{item.price?.toLocaleString()}</p>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span style={{ fontWeight: 700 }}>₹{sub?.subtotal?.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
