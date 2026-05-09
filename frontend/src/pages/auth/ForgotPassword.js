// ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/api';
import toast from 'react-hot-toast';
import './Auth.css';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
      <div className="auth-card" style={{ maxWidth: '400px', width: '100%' }}>
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-desc">Enter your email to receive a reset link</p>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📧</p>
            <p style={{ color: 'var(--success)', fontWeight: 600 }}>Email sent! Check your inbox.</p>
            <Link to="/login" className="btn btn-outline" style={{ marginTop: '20px' }}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <button className="btn btn-primary w-full btn-lg" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
          </form>
        )}
        <p className="auth-switch"><Link to="/login">← Back to login</Link></p>
      </div>
    </div>
  );
}

export default ForgotPassword;
