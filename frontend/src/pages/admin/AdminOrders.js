// AdminOrders.js
import React, { useState, useEffect } from 'react';
import { getAllOrders, adminUpdateOrderStatus } from '../../services/api';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: 'badge-warning', processing: 'badge-primary', shipped: 'badge-primary', delivered: 'badge-success', cancelled: 'badge-danger' };
const ALL_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1) => {
    setLoading(true);
    getAllOrders({ page: p, status: statusFilter || undefined }).then(r => {
      setOrders(r.data.orders); setPages(r.data.pages); setTotal(r.data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => load();
    socket.on('new-order', handler);
    return () => socket.off('new-order', handler);
  }, []);

  const handleStatus = async (id, status) => {
    try {
      await adminUpdateOrderStatus(id, { status });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, orderStatus: status } : o));
      toast.success(`Order marked as ${status}`);
    } catch { toast.error('Failed'); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div><h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Orders</h1><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{total} orders</p></div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${statusFilter === '' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter('')}>All</button>
          {ALL_STATUSES.map(s => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Order ID</th><th>Buyer</th><th>Sellers</th><th>Total</th><th>Status</th><th>Date</th><th>Update</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
               : orders.map(o => (
                <tr key={o._id}>
                  <td style={{ fontWeight: 700, fontSize: '13px' }}>#{o._id.slice(-8).toUpperCase()}</td>
                  <td style={{ fontSize: '13px' }}>{o.buyer?.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{o.subOrders?.map(s => s.seller?.shopName || s.seller?.name).join(', ')}</td>
                  <td style={{ fontWeight: 700, fontSize: '14px' }}>₹{o.totalAmount?.toLocaleString()}</td>
                  <td><span className={`badge ${STATUS_COLORS[o.orderStatus] || 'badge-secondary'}`}>{o.orderStatus}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>
                    <select className="form-input" style={{ fontSize: '13px', padding: '5px 8px', width: 'auto' }}
                      value={o.orderStatus} onChange={e => handleStatus(o._id, e.target.value)}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pagination" style={{ padding: '16px' }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => { setPage(p); load(p); }}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
