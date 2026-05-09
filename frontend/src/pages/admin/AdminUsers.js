// AdminUsers.js
import React, { useState, useEffect } from 'react';
import { getAllUsers, approveSeller, blockUser, deleteUser } from '../../services/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiLock, FiUnlock, FiTrash2, FiSearch } from 'react-icons/fi';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = (p = 1) => {
    setLoading(true);
    getAllUsers({ page: p, search, role }).then(r => {
      setUsers(r.data.users); setTotal(r.data.total); setPages(r.data.pages);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, role]);

  const handleApprove = async (id, approve) => {
    try {
      const res = await approveSeller(id, { approve });
      setUsers(prev => prev.map(u => u._id === id ? res.data.user : u));
      toast.success(approve ? 'Seller approved' : 'Seller rejected');
    } catch { toast.error('Failed'); }
  };

  const handleBlock = async (id, block) => {
    try {
      const res = await blockUser(id, { block });
      setUsers(prev => prev.map(u => u._id === id ? res.data.user : u));
      toast.success(block ? 'User blocked' : 'User unblocked');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try { await deleteUser(id); setUsers(prev => prev.filter(u => u._id !== id)); toast.success('User deleted'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>User Management</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{total} users total</p>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <FiSearch size={15} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={role} onChange={e => setRole(e.target.value)}>
          <option value="">All Roles</option><option value="buyer">Buyers</option><option value="seller">Sellers</option>
        </select>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
               : users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>{u.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</p>
                      {u.shopName && <p style={{ fontSize: '12px', color: 'var(--primary)' }}>🏪 {u.shopName}</p>}
                    </div>
                  </td>
                  <td><span className={`badge ${u.role === 'seller' ? 'badge-primary' : 'badge-secondary'}`}>{u.role}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {u.role === 'seller' && <span className={`badge ${u.isApproved ? 'badge-success' : 'badge-warning'}`}>{u.isApproved ? 'Approved' : 'Pending'}</span>}
                      {u.isBlocked && <span className="badge badge-danger">Blocked</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {u.role === 'seller' && !u.isApproved && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(u._id, true)} title="Approve"><FiCheck size={13} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleApprove(u._id, false)} title="Reject"><FiX size={13} /></button>
                        </>
                      )}
                      <button className={`btn btn-sm ${u.isBlocked ? 'btn-success' : 'btn-outline'}`} onClick={() => handleBlock(u._id, !u.isBlocked)} title={u.isBlocked ? 'Unblock' : 'Block'}>
                        {u.isBlocked ? <FiUnlock size={13} /> : <FiLock size={13} />}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)} title="Delete"><FiTrash2 size={13} /></button>
                    </div>
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
