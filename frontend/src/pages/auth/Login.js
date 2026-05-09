// src/pages/auth/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'seller') navigate('/seller/dashboard');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-brand-icon">🛍</span>
          <span className="auth-brand-name">ShopHive</span>
        </div>
        <h2 className="auth-tagline">Multi-vendor marketplace for everyone</h2>
        <p className="auth-sub">Buy from thousands of sellers. Sell your products. All in one place.</p>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-desc">Sign in to your account</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" required />
            </div>
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <Link to="/forgot-password" style={{ fontSize: '13px', color: 'var(--primary)' }}>Forgot password?</Link>
            </div>
            <button className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
          <div className="auth-demo">
            <p className="auth-demo-title">Demo accounts</p>
            <div className="demo-accounts">
              <button onClick={() => setForm({ email: 'admin@demo.com', password: 'admin123' })} className="demo-btn">Admin</button>
              <button onClick={() => setForm({ email: 'seller@demo.com', password: 'seller123' })} className="demo-btn">Seller</button>
              <button onClick={() => setForm({ email: 'buyer@demo.com', password: 'buyer123' })} className="demo-btn">Buyer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
