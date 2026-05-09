import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../../services/api';
import toast from 'react-hot-toast';
import { FiUpload, FiArrowLeft, FiInfo } from 'react-icons/fi';

const UOM_OPTIONS = ['pcs', 'kg', 'g', 'litre', 'ml', 'meter', 'cm', 'box', 'dozen', 'pair', 'set', 'pack'];
const CATEGORIES = ['Electronics', 'Clothing', 'Home & Garden', 'Beauty', 'Books', 'Sports', 'Toys', 'Food', 'Automotive', 'Other'];

export function ProductForm({ onSubmit, loading, initialData = {} }) {
  const [form, setForm] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    price: initialData.price || '',
    discountPrice: initialData.discountPrice || '',
    quantity: initialData.quantity || '1',
    uom: initialData.uom || 'pcs',
    category: initialData.category || '',
    subcategory: initialData.subcategory || '',
    brand: initialData.brand || '',
    stock: initialData.stock || '',
    tags: initialData.tags?.join(', ') || '',
    commissionRate: initialData.commissionRate || '',
    isAvailable: initialData.isAvailable !== false,
    availableFrom: initialData.availableFrom ? initialData.availableFrom.split('T')[0] : '',
    availabilityNote: initialData.availabilityNote || '',
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState(initialData.images || []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreviews(files.map(f => ({ url: URL.createObjectURL(f) })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price)) {
      toast.error('Discount price must be less than original price'); return;
    }
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => v !== '' && formData.append(k, v));
    images.forEach(img => formData.append('images', img));
    await onSubmit(formData);
  };

  const discountPercent = form.price && form.discountPrice && Number(form.discountPrice) < Number(form.price)
    ? Math.round(((form.price - form.discountPrice) / form.price) * 100) : 0;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Product Name */}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Product Name *</label>
          <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Organic Red Apple" required />
        </div>

        {/* Description */}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Description *</label>
          <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe your product in detail..." required />
        </div>

        {/* Quantity & UOM — NEW */}
        <div style={{ gridColumn: '1/-1', background: 'var(--primary-light)', borderRadius: 10, padding: '16px 20px', border: '1px solid #c4b5fd' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiInfo size={14} /> Unit Information (e.g. Apple → 1 kg)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quantity per Unit *</label>
              <input className="form-input" type="number" min="0.01" step="0.01" value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="1" required />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>How many units in each item?</p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit of Measurement (UOM) *</label>
              <select className="form-input" value={form.uom} onChange={e => setForm({ ...form, uom: e.target.value })}>
                {UOM_OPTIONS.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>kg, pcs, litre, etc.</p>
            </div>
          </div>
          {form.quantity && form.uom && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--primary)', fontWeight: 500 }}>
              Preview: <strong>{form.name || 'Product'}</strong> — {form.quantity} {form.uom}
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="form-group">
          <label className="form-label">Original Price (₹) *</label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })} placeholder="100" required />
        </div>

        <div className="form-group">
          <label className="form-label">Discount Price (₹) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.discountPrice}
            onChange={e => setForm({ ...form, discountPrice: e.target.value })} placeholder="85" />
          {discountPercent > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px', fontWeight: 600 }}>
              ✅ {discountPercent}% discount — buyers pay ₹{form.discountPrice}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Brand</label>
          <input className="form-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Brand name" />
        </div>

        <div className="form-group">
          <label className="form-label">Stock Quantity *</label>
          <input className="form-input" type="number" min="0" value={form.stock}
            onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="50" required />
        </div>

        <div className="form-group">
          <label className="form-label">Tags <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma separated)</span></label>
          <input className="form-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="organic, fresh, apple" />
        </div>

        {/* Commission Rate */}
        <div className="form-group" style={{ gridColumn: '1/-1', background: '#fef9c3', borderRadius: 10, padding: '16px 20px', border: '1px solid #fde047' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#854d0e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiInfo size={14} /> Commission Rate (Admin Approval Required)
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Commission Rate (%)</label>
            <input className="form-input" type="number" min="0" max="100" step="0.01"
              value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })}
              placeholder="e.g. 5 for 5% commission to admin" style={{ maxWidth: '200px' }} />
            <p style={{ fontSize: '11px', color: '#92400e', marginTop: '4px' }}>
              This percentage will be deducted from your earnings per sale. Leave empty for 0% commission. Requires admin approval.
            </p>
          </div>
        </div>

        {/* Availability */}
        <div className="form-group" style={{ gridColumn: '1/-1', background: 'var(--bg)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>📦 Product Availability</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked={form.isAvailable} onChange={e => setForm({ ...form, isAvailable: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span>Currently Available</span>
              </label>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Uncheck if temporarily unavailable
              </p>
            </div>
            {!form.isAvailable && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Available From (optional)</label>
                <input type="date" className="form-input" value={form.availableFrom}
                  onChange={e => setForm({ ...form, availableFrom: e.target.value })} />
              </div>
            )}
            <div className="form-group" style={{ gridColumn: !form.isAvailable ? '1/-1' : '1/-1', marginBottom: 0 }}>
              <label className="form-label">Availability Note (optional)</label>
              <input className="form-input" value={form.availabilityNote}
                onChange={e => setForm({ ...form, availabilityNote: e.target.value })}
                placeholder="e.g. Back in stock after Diwali, Pre-order available" />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Product Images <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max 5)</span></label>
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed var(--border)', borderRadius: 12, padding: '32px', cursor: 'pointer',
            background: 'var(--bg)', transition: 'all 0.15s',
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}>
            <FiUpload size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Click to upload images</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>JPG, PNG, WebP up to 5MB each</p>
            <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {previews.map((img, i) => (
                <img key={i} src={img.url} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '2px solid var(--border)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-primary btn-lg" style={{ marginTop: '8px' }} disabled={loading} type="submit">
        {loading ? 'Submitting...' : 'Submit for Approval'}
      </button>
    </form>
  );
}

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      await createProduct(formData);
      toast.success('Product submitted for admin approval!');
      navigate('/seller/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '820px' }}>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: '24px' }} onClick={() => navigate('/seller/products')}>
        <FiArrowLeft size={14} /> Back
      </button>
      <h1 style={{ fontSize: '26px', marginBottom: '8px' }}>Add New Product</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '28px' }}>
        Products require admin approval before going live on the store.
      </p>
      <div className="card" style={{ padding: '28px' }}>
        <ProductForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}
