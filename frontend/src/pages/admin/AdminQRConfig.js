import React, { useState, useEffect } from 'react';
import { getQRConfig, saveQRConfig } from '../../services/api';
import toast from 'react-hot-toast';
import { FiUpload, FiSave } from 'react-icons/fi';

export default function AdminQRConfig() {
  const [config, setConfig] = useState({ upiId: '', accountName: '', instructions: '' });
  const [qrFile, setQRFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getQRConfig().then(r => {
      if (r.data.config) {
        setConfig({
          upiId: r.data.config.upiId || '',
          accountName: r.data.config.accountName || '',
          instructions: r.data.config.instructions || '',
        });
        setPreview(r.data.config.qrImageUrl || '');
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setQRFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('upiId', config.upiId);
      fd.append('accountName', config.accountName);
      fd.append('instructions', config.instructions);
      if (qrFile) fd.append('qrImage', qrFile);
      await saveQRConfig(fd);
      toast.success('QR configuration saved!');
    } catch (err) {
      toast.error('Failed to save QR config');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="spinner" style={{ margin: '80px auto' }} />;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>QR Payment Configuration</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Configure the QR code shown to buyers during checkout</p>
      </div>
      <div className="card" style={{ padding: '32px', maxWidth: '600px' }}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 250px' }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">UPI ID</label>
                <input className="form-input" value={config.upiId} onChange={e => setConfig({ ...config, upiId: e.target.value })} placeholder="yourshop@upi" />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Account Name</label>
                <input className="form-input" value={config.accountName} onChange={e => setConfig({ ...config, accountName: e.target.value })} placeholder="Shop / Business Name" />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Payment Instructions</label>
                <textarea className="form-input" rows={4} value={config.instructions} onChange={e => setConfig({ ...config, instructions: e.target.value })} placeholder="e.g. After payment, take a screenshot and upload it as proof on the order page..." />
              </div>
            </div>
            <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>QR Code Image</p>
              {preview ? (
                <img src={preview} alt="QR Code" style={{ width: 180, height: 180, objectFit: 'contain', border: '2px solid var(--border)', borderRadius: 12, padding: '8px', background: '#fff' }} />
              ) : (
                <div style={{ width: 180, height: 180, border: '2px dashed var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <FiUpload size={24} />
                  <span>No QR uploaded</span>
                </div>
              )}
              <label style={{ cursor: 'pointer' }}>
                <div className="btn btn-outline btn-sm" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <FiUpload size={13} /> Upload QR Image
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </label>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FiSave size={15} /> {saving ? 'Saving...' : 'Save QR Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
