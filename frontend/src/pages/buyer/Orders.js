// Orders.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders } from '../../services/api';
import { FiPackage, FiChevronRight } from 'react-icons/fi';

const STATUS_COLORS = {
  pending: 'badge-warning', processing: 'badge-primary', shipped: 'badge-primary',
  delivered: 'badge-success', cancelled: 'badge-danger',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders().then(r => setOrders(r.data.orders)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ marginTop: '80px' }} />;

  return (
    <div className="container" style={{ padding: '32px 24px 60px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>My Orders</h1>
      {orders.length === 0 ? (
        <div className="empty-state">
          <FiPackage size={48} />
          <h3>No orders yet</h3>
          <p>Start shopping to see your orders here</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>Shop Now</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <Link to={`/orders/${order._id}`} key={order._id} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', transition: 'box-shadow 0.2s' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 48, height: 48, background: 'var(--primary-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <FiPackage size={22} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px' }}>Order #{order._id.slice(-8).toUpperCase()}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {order.subOrders?.reduce((s, sub) => s + sub.items.length, 0)} item(s) from {order.subOrders?.length} seller(s)
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: '16px' }}>₹{order.totalAmount?.toLocaleString()}</p>
                  <span className={`badge ${STATUS_COLORS[order.orderStatus] || 'badge-secondary'}`} style={{ marginTop: '4px' }}>
                    {order.orderStatus}
                  </span>
                </div>
                <FiChevronRight size={18} color="var(--text-muted)" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
