import React, { useState, useEffect } from 'react';
import { getAdminOffers, approveOffer, getAdminOfferSchedules, createOfferSchedule, updateOfferSchedule, deleteOfferSchedule, getCategories, updateOffer, createOffer } from '../../services/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiPlus, FiTrash2, FiEdit2, FiRefreshCw } from 'react-icons/fi';

const EMPTY_FORM = { title: '', description: '', type: 'item', discountType: 'percent', discountValue: '', applicableProducts: [], applicableCategories: [], minBillAmount: '', maxDiscount: '', startDate: '', endDate: '' };

export default function AdminOffers() {
  const [tab, setTab] = useState('offers'); // 'offers' | 'schedules'
  const [offers, setOffers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [note, setNote] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editOffer, setEditOffer] = useState(null);
  const [editSchedule, setEditSchedule] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [schedForm, setSchedForm] = useState({ title: '', description: '', category: '', discountHint: '', startDate: '', endDate: '', bannerColor: '#6366f1', visibleTo: 'all' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  const loadOffers = () => {
    setLoading(true);
    const query = filter === 'all' ? {} : { isApproved: filter === 'approved' ? 'true' : 'false' };
    getAdminOffers(query).then(r => setOffers(r.data.offers)).catch(() => {}).finally(() => setLoading(false));
  };

  const loadSchedules = () => {
    setLoading(true);
    getAdminOfferSchedules().then(r => setSchedules(r.data.schedules)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { tab === 'offers' ? loadOffers() : loadSchedules(); }, [tab, filter]);

  const [selectedOffer, setSelectedOffer] = useState(null);

  const getDiscountDisplay = (o) => {
    if (o.discountType === 'percent') return `${o.discountValue}% off`;
    if (o.discountType === 'flat') return `₹${o.discountValue} off`;
    if (o.discountType === 'buyXGetX') return `Buy ${o.buyQuantity} Get ${o.getQuantity} Free`;
    if (o.discountType === 'buyXGetYPercent') return `Buy ${o.buyQuantity} Get ${o.getQuantity} @ ${o.discountValue}% off`;
    if (o.discountType === 'buyXGetYOff') return `Buy ${o.buyQuantity} Get ${o.getQuantity} @ ₹${o.discountValue} off`;
    return `${o.discountValue} ${o.discountType}`;
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
      if (editOffer) {
        await updateOffer(editOffer._id, payload);
        toast.success('Admin offer updated!');
      } else {
        await createOffer(payload);
        toast.success('Admin offer created!');
      }
      setShowForm(false); setEditOffer(null); loadOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleApprove = async (id, action) => {
    setProcessing(id);
    try {
      await approveOffer(id, { action, note });
      toast.success(action === 'approve' ? 'Offer approved!' : 'Offer rejected.');
      setNoteModal(null); setNote(''); setSelectedOffer(null); loadOffers();
    } catch { toast.error('Failed'); }
    finally { setProcessing(null); }
  };

  const handleScheduleSave = async () => {
    if (!schedForm.title || !schedForm.startDate || !schedForm.endDate) { toast.error('Title, start and end date are required'); return; }
    try {
      if (editSchedule) {
        await updateOfferSchedule(editSchedule._id, schedForm);
        toast.success('Schedule updated!');
      } else {
        await createOfferSchedule(schedForm);
        toast.success('Offer schedule created!');
      }
      setShowScheduleForm(false); setEditSchedule(null);
      setSchedForm({ title: '', description: '', category: '', discountHint: '', startDate: '', endDate: '', bannerColor: '#6366f1', visibleTo: 'all' });
      loadSchedules();
    } catch { toast.error('Failed to save schedule'); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this offer schedule?')) return;
    await deleteOfferSchedule(id);
    toast.success('Deleted');
    loadSchedules();
  };

  const openEditSchedule = (s) => {
    setEditSchedule(s);
    setSchedForm({
      title: s.title, description: s.description, category: s.category,
      discountHint: s.discountHint, startDate: s.startDate?.split('T')[0],
      endDate: s.endDate?.split('T')[0], bannerColor: s.bannerColor, visibleTo: s.visibleTo,
    });
    setShowScheduleForm(true);
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '26px' }}>Offers Management</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {tab === 'offers' && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditOffer(null); setForm(EMPTY_FORM); setShowForm(true); }}>
              <FiPlus size={14} /> Add Admin Offer
            </button>
          )}
          {tab === 'schedules' && (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowScheduleForm(true); setEditSchedule(null); setSchedForm({ title: '', description: '', category: '', discountHint: '', startDate: '', endDate: '', bannerColor: '#6366f1', visibleTo: 'all' }); }}>
              <FiPlus size={14} /> Add Schedule
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg)', borderRadius: 10, padding: '4px', width: 'fit-content' }}>
        {['offers', 'schedules'].map(t => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : ''}`} style={{ background: tab === t ? undefined : 'transparent' }} onClick={() => setTab(t)}>
            {t === 'offers' ? '🎁 Seller Offers' : '📅 Offer Schedules'}
          </button>
        ))}
      </div>

      {/* Offers Tab */}
      {tab === 'offers' && (
        <>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['pending', 'approved', 'all'].map(s => (
              <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <button className="btn btn-outline btn-sm" onClick={loadOffers}><FiRefreshCw size={13} /></button>
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Title</th><th>Seller</th><th>Type</th><th>Discount</th><th>Period</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                    : offers.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No offers</td></tr>
                    : offers.map(o => (
                      <tr key={o._id}>
                        <td><p style={{ fontWeight: 600, fontSize: '13px' }}>{o.title}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.description?.slice(0, 50)}</p></td>
                        <td style={{ fontSize: '13px' }}>{o.seller?.shopName || o.seller?.name}</td>
                        <td><span className={`badge ${o.type === 'bill' ? 'badge-primary' : 'badge-secondary'}`}>{o.type === 'bill' ? '🧾 Bill' : '📦 Item'}</span></td>
                        <td style={{ fontWeight: 700 }}>{getDiscountDisplay(o)}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {o.startDate ? new Date(o.startDate).toLocaleDateString() : '—'} → {o.endDate ? new Date(o.endDate).toLocaleDateString() : 'Ongoing'}
                        </td>
                        <td><span className={`badge ${o.isApproved ? 'badge-success' : 'badge-warning'}`}>{o.isApproved ? 'Approved' : 'Pending'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => setSelectedOffer(o)} title="View Details">View</button>
                            {!o.isApproved && (
                              <>
                                <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff' }} onClick={() => handleApprove(o._id, 'approve')} disabled={processing === o._id} title="Approve"><FiCheck size={13} /></button>
                                <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff' }} onClick={() => setNoteModal({ id: o._id })} disabled={processing === o._id} title="Reject"><FiX size={13} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Schedules Tab */}
      {tab === 'schedules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? <div className="spinner" style={{ margin: '40px auto' }} />
            : schedules.length === 0 ? <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No offer schedules yet. Create one!</div>
            : schedules.map(s => (
              <div key={s._id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${s.bannerColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{s.title}</h3>
                    {s.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.description}</p>}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {s.category && <span>📂 {s.category}</span>}
                      {s.discountHint && <span>🏷️ {s.discountHint}</span>}
                      <span>📅 {new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}</span>
                      <span>👁️ Visible to: {s.visibleTo}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEditSchedule(s)}><FiEdit2 size={13} /></button>
                    <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff' }} onClick={() => handleDeleteSchedule(s._id)}><FiTrash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Offer Detail Modal */}
      {selectedOffer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Offer Details</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Title</p>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedOffer.title}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Seller</p>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedOffer.seller?.shopName || selectedOffer.seller?.name || 'Admin'}</p>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Description</p>
                <p style={{ fontSize: '14px' }}>{selectedOffer.description || 'No description'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Type</p>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedOffer.type === 'bill' ? '🧾 Bill Wise' : '📦 Item Wise'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Discount</p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{getDiscountDisplay(selectedOffer)}</p>
              </div>
              {selectedOffer.minBillAmount > 0 && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Min Bill Amount</p>
                  <p style={{ fontSize: '14px' }}>₹{selectedOffer.minBillAmount.toLocaleString()}</p>
                </div>
              )}
              {selectedOffer.maxDiscount > 0 && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Max Discount</p>
                  <p style={{ fontSize: '14px' }}>₹{selectedOffer.maxDiscount.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Start Date</p>
                <p style={{ fontSize: '14px' }}>{selectedOffer.startDate ? new Date(selectedOffer.startDate).toLocaleDateString() : 'Immediate'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>End Date</p>
                <p style={{ fontSize: '14px' }}>{selectedOffer.endDate ? new Date(selectedOffer.endDate).toLocaleDateString() : 'Ongoing'}</p>
              </div>

              {selectedOffer.type === 'item' && selectedOffer.applicableProducts?.length > 0 && (
                <div style={{ gridColumn: '1/-1' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Applicable Products</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: 'var(--bg)', borderRadius: 8 }}>
                    {selectedOffer.applicableProducts.map(p => (
                      <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSelectedOffer(null)}>Close</button>
              {!selectedOffer.isApproved && (
                <>
                  <button className="btn" style={{ flex: 1, background: '#16a34a', color: '#fff' }} 
                    onClick={() => { handleApprove(selectedOffer._id, 'approve'); }}>Approve</button>
                  <button className="btn" style={{ flex: 1, background: '#dc2626', color: '#fff' }} 
                    onClick={() => { setNoteModal({ id: selectedOffer._id }); setSelectedOffer(null); }}>Reject</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Reject Offer Modal */}
      {noteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '24px', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '14px' }}>Reject Offer</h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Rejection Reason</label>
              <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for rejection..." />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setNoteModal(null); setNote(''); }}>Cancel</button>
              <button className="btn btn-sm" style={{ flex: 1, background: '#dc2626', color: '#fff' }} onClick={() => handleApprove(noteModal.id, 'reject')}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{editSchedule ? 'Edit' : 'New'} Offer Schedule</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Title *</label>
                <input className="form-input" value={schedForm.title} onChange={e => setSchedForm({ ...schedForm, title: e.target.value })} placeholder="e.g. Diwali Sale, Weekend Offer" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={schedForm.description} onChange={e => setSchedForm({ ...schedForm, description: e.target.value })} placeholder="Brief description..." />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" value={schedForm.category} onChange={e => setSchedForm({ ...schedForm, category: e.target.value })} placeholder="Electronics, Clothing..." />
              </div>
              <div className="form-group">
                <label className="form-label">Discount Hint</label>
                <input className="form-input" value={schedForm.discountHint} onChange={e => setSchedForm({ ...schedForm, discountHint: e.target.value })} placeholder="Up to 50% off" />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-input" value={schedForm.startDate} onChange={e => setSchedForm({ ...schedForm, startDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input type="date" className="form-input" value={schedForm.endDate} onChange={e => setSchedForm({ ...schedForm, endDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Banner Color</label>
                <input type="color" className="form-input" style={{ height: 42, padding: '4px 8px', cursor: 'pointer' }} value={schedForm.bannerColor} onChange={e => setSchedForm({ ...schedForm, bannerColor: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Visible To</label>
                <select className="form-input" value={schedForm.visibleTo} onChange={e => setSchedForm({ ...schedForm, visibleTo: e.target.value })}>
                  <option value="all">All (Buyers & Sellers)</option>
                  <option value="buyer">Buyers Only</option>
                  <option value="seller">Sellers Only</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowScheduleForm(false); setEditSchedule(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleScheduleSave}>
                {editSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Offer Create/Edit Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="card" style={{ padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{editOffer ? 'Edit Admin Offer' : 'Create New Admin Offer'}</h3>
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

              {/* Category Selection for admin offers */}
              {form.type === 'item' && categories.length > 0 && (
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Apply to Specific Categories (leave empty = all categories)</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px', background: 'var(--bg)', borderRadius: 8 }}>
                    {categories.map(cat => (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: form.applicableCategories?.includes(cat) ? 'var(--primary-light)' : '#fff', padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', fontSize: '12px', color: form.applicableCategories?.includes(cat) ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={form.applicableCategories?.includes(cat)} onChange={() => {
                          const cats = form.applicableCategories || [];
                          setForm({ ...form, applicableCategories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat] });
                        }} style={{ display: 'none' }} />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowForm(false); setEditOffer(null); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editOffer ? 'Update Offer' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
