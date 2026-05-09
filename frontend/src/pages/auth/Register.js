import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer', shopName: '', shopDescription: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await register(form);
      if (form.role === 'seller') {
        toast.success('Seller account submitted! Awaiting admin approval.');
        navigate('/login');
      } else {
        toast.success('Welcome to ShopHive!');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-brand-icon">🛍</span>
          <span className="auth-brand-name">ShopHive</span>
        </div>
        <h2 className="auth-tagline">Join our growing marketplace</h2>
        <p className="auth-sub">Shop smarter. Sell easier. Grow faster.</p>
      </div>
      <div className="auth-right">
        <div className="auth-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-desc">Start your journey on ShopHive</p>

          <div className="role-tabs">
            <button className={`role-tab ${form.role === 'buyer' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'buyer' })}>
              🛒 Buyer
            </button>
            <button className={`role-tab ${form.role === 'seller' ? 'active' : ''}`} onClick={() => setForm({ ...form, role: 'seller' })}>
              🏪 Seller
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters" required />
            </div>
            {form.role === 'seller' && (
              <>
                <div className="form-group">
                  <label className="form-label">Shop Name</label>
                  <input className="form-input" type="text" value={form.shopName}
                    onChange={e => setForm({ ...form, shopName: e.target.value })}
                    placeholder="My Awesome Store" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Shop Description</label>
                  <textarea className="form-input" rows={3} value={form.shopDescription}
                    onChange={e => setForm({ ...form, shopDescription: e.target.value })}
                    placeholder="Tell buyers about your shop..." />
                </div>
                <div className="seller-note">
                  ⚠️ Seller accounts require admin approval before you can list products.
                </div>
              </>
            )}
            <button className="btn btn-primary w-full btn-lg" style={{ marginTop: '8px' }} disabled={loading}>
              {loading ? 'Creating account...' : `Create ${form.role === 'seller' ? 'Seller' : ''} Account`}
            </button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
