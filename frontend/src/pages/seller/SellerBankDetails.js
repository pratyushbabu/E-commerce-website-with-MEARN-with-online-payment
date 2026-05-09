import React, { useState } from 'react';
import { updateBankDetails } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSave, FiInfo } from 'react-icons/fi';

export default function SellerBankDetails() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    accountNumber: user?.bankDetails?.accountNumber || '',
    ifsc: user?.bankDetails?.ifsc || '',
    holderName: user?.bankDetails?.holderName || '',
    upiId: user?.bankDetails?.upiId || '',
    mobileNumber: user?.bankDetails?.mobileNumber || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateBankDetails(form);
      if (setUser) setUser(res.data.user);
      toast.success('Bank details saved!');
    } catch { toast.error('Failed to save bank details'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Bank / Payment Details</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Admin will use these details to process your withdrawal requests</p>
      </div>
      <div className="card" style={{ padding: '32px', maxWidth: '560px' }}>
        <div style={{ marginBottom: '20px', padding: '12px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <FiInfo size={15} color="#1d4ed8" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: '#1e40af' }}>
            Add your UPI ID or bank account details. Admin will use this to transfer withdrawal amounts. At least one payment method (UPI ID or bank account) is required for withdrawals.
          </p>
        </div>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--primary)' }}>📱 UPI / Mobile (Preferred)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">UPI ID</label>
                <input className="form-input" value={form.upiId} onChange={e => setForm({ ...form, upiId: e.target.value })} placeholder="yourname@upi" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input className="form-input" value={form.mobileNumber} onChange={e => setForm({ ...form, mobileNumber: e.target.value })} placeholder="9876543210" />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-secondary)' }}>🏦 Bank Account (Optional)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Account Holder Name</label>
                <input className="form-input" value={form.holderName} onChange={e => setForm({ ...form, holderName: e.target.value })} placeholder="Full name as on bank account" />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-input" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} placeholder="Bank account number" />
              </div>
              <div className="form-group">
                <label className="form-label">IFSC Code</label>
                <input className="form-input" value={form.ifsc} onChange={e => setForm({ ...form, ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" />
              </div>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FiSave size={15} /> {saving ? 'Saving...' : 'Save Payment Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
