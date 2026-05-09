import React, { useState, useEffect } from 'react';
import { getMyOffers, createOffer, updateOffer, deleteOffer, getSellerDashboard } from '../../services/api';
import { getProducts } from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { title: '', description: '', type: 'item', discountType: 'percent', discountValue: '', applicableProducts: [], minBillAmount: '', maxDiscount: '', startDate: '', endDate: '' };

export default function SellerOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editOffer, setEditOffer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getMyOffers(), getProducts({ seller: user?._id, limit: 100 })])
      .then(([oRes, pRes]) => {
        setOffers(oRes.data.offers || []);
        setMyProducts(pRes.data.products || []);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditOffer(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (o) => {
    setEditOffer(o);
    setForm({
      title: o.title, description: o.description, type: o.type,
      discountType: o.discountType, discountValue: o.discountValue,
      applicableProducts: o.applicableProducts?.map(p => p._id || p) || [],
      minBillAmount: o.minBillAmount || '', maxDiscount: o.maxDiscount || '',
      startDate: o.startDate ? o.startDate.split('T')[0] : '',
      endDate: o.endDate ? o.endDate.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.discountValue) { toast.error('Title and discount value are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minBillAmount: Number(form.minBillAmount) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (editOffer) { await updateOffer(editOffer._id, payload); toast.success('Offer updated! Pending re-approval.'); }
      else { await createOffer(payload); toast.success('Offer submitted for admin approval!'); }
      setShowForm(false); setEditOffer(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this offer?')) return;
    await deleteOffer(id);
    toast.success('Offer deleted');
    load();
  };

  const toggleProduct = (pid) => {
    setForm(f => ({
      ...f,
      applicableProducts: f.applicableProducts.includes(pid)
        ? f.applicableProducts.filter(p => p !== pid)
        : [...f.applicableProducts, pid],
    }));
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>My Offers</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Create item or bill-level discounts. Admin must approve before showing to buyers.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={load}><FiRefreshCw size={13} /></button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}><FiPlus size={14} /> New Offer</button>
        </div>
      </div>

      {loading ? <div className="spinner" style={{ margin: '40px auto' }} />
        : offers.length === 0 ? (
          <div className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>🎁</p>
            <p style={{ fontWeight: 600, marginBottom: '8px' }}>No offers yet</p>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>Create item-level or bill-level discount offers for your customers</p>
            <button className="btn btn-primary btn-sm" onClick={openCreate}><FiPlus size={14} /> Create First Offer</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {offers.map(o => (
              <div key={o._id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{o.title}</h3>
                      <span className={`badge ${o.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {o.isApproved ? '✅ Approved' : '⏳ Pending Approval'}
                      </span>
                      <span className={`badge ${o.type === 'bill' ? 'badge-primary' : 'badge-secondary'}`}>
                        {o.type === 'bill' ? '🧾 Bill Offer' : '📦 Item Offer'}
                      </span>
                    </div>
                    {o.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{o.description}</p>}
                    {o.approvalNote && !o.isApproved && (
                      <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: 6, marginBottom: '6px' }}>
                        ❌ Rejected: {o.approvalNote}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span>💰 {o.discountValue}{o.discountType === 'percent' ? '%' : '₹'} off{o.maxDiscount > 0 ? ` (max ₹${o.maxDiscount})` : ''}</span>
                      {o.type === 'bill' && o.minBillAmount > 0 && <span>Min bill: ₹{o.minBillAmount}</span>}
                      {o.applicableProducts?.length > 0 && <span>On {o.applicableProducts.length} product(s)</span>}
                      {o.applicableProducts?.length === 0 && o.type === 'item' && <span>On all your products</span>}
                      {o.startDate && <span>📅 {new Date(o.startDate).toLocaleDateString()} → {o.endDate ? new Date(o.endDate).toLocaleDateString() : 'Ongoing'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(o)}><FiEdit2 size={13} /></button>
                    <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff' }} onClick={() => handleDelete(o._id)}><FiTrash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{editOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Offer Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Sale, Flat ₹50 Off" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Briefly describe this offer..." />
              </div>
              <div className="form-group">
                <label className="form-label">Offer Type *</label>
                <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="item">📦 Item-level (per product)</option>
                  <option value="bill">🧾 Bill-level (cart total)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Discount Type *</label>
                <select className="form-input" value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Discount Value *</label>
                <input type="number" className="form-input" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === 'percent' ? '10 (for 10%)' : '50 (for ₹50 off)'} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Max Discount Cap (₹)</label>
                <input type="number" className="form-input" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })} placeholder="0 = no cap" min={0} />
              </div>
              {form.type === 'bill' && (
                <div className="form-group">
                  <label className="form-label">Min Bill Amount (₹)</label>
                  <input type="number" className="form-input" value={form.minBillAmount} onChange={e => setForm({ ...form, minBillAmount: e.target.value })} placeholder="0 = no minimum" min={0} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Start Date (optional)</label>
                <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date (optional)</label>
                <input type="date" className="form-input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>

              {/* Product Selection for item offers */}
              {form.type === 'item' && myProducts.length > 0 && (
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Apply to Specific Products (leave empty = all your products)</label>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {myProducts.map(p => (
                      <label key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="checkbox" checked={form.applicableProducts.includes(p._id)} onChange={() => toggleProduct(p._id)} />
                        {p.images?.[0]?.url && <img src={p.images[0].url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
                        <span>{p.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>₹{p.price}</span>
                      </label>
                    ))}
                  </div>
                  {form.applicableProducts.length > 0 && <p style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px' }}>{form.applicableProducts.length} product(s) selected</p>}
                </div>
              )}
            </div>

            <div style={{ marginTop: '8px', padding: '10px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d', fontSize: '12px', color: '#92400e' }}>
              ℹ️ Offers require admin approval before being shown to buyers. After editing, re-approval is needed.
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowForm(false); setEditOffer(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editOffer ? 'Update Offer' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
