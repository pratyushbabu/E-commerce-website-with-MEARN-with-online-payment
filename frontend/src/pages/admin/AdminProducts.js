// AdminProducts.js
import React, { useState, useEffect } from 'react';
import { getAdminProducts, approveProduct, deleteProduct, getSellerActiveOffers } from '../../services/api';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiTrash2 } from 'react-icons/fi';

const PriceAnalysis = ({ product, activeOffers }) => {
  const mrp = product.price;
  const normalDiscount = product.discountPrice && product.discountPrice < mrp ? mrp - product.discountPrice : 0;
  const priceAfterNormal = mrp - normalDiscount;

  let sellerOfferDiscount = 0;
  let adminOfferDiscount = 0;

  // Standardized applicability check
  const isApplicable = (offer, prod) => {
    const productIds = offer.applicableProducts?.map(ap => (ap._id || ap).toString()) || [];
    const categories = offer.applicableCategories || [];
    const pid = prod._id.toString();
    const pcat = prod.category;

    if (productIds.length > 0) return productIds.includes(pid);
    if (categories.length > 0) return categories.includes(pcat);
    return true;
  };

  // 1. Seller Offers (Summed based on priceAfterNormal)
  activeOffers.forEach(o => {
    const sellerId = (o.seller?._id || o.seller || '').toString();
    const prodSellerId = (product.seller?._id || product.seller || '').toString();
    const isFromSameSeller = sellerId === prodSellerId;
    
    if (o.createdBy === 'seller' && isFromSameSeller && o.type === 'item') {
      if (isApplicable(o, product)) {
        let d = 0;
        if (o.discountType === 'percent') d = priceAfterNormal * o.discountValue / 100;
        else if (o.discountType === 'flat') d = o.discountValue;
        sellerOfferDiscount += d;
      }
    }
  });

  const priceAfterSeller = Math.max(0, priceAfterNormal - sellerOfferDiscount);

  // 2. Admin Offers (Summed based on priceAfterSeller)
  activeOffers.forEach(o => {
    if (o.createdBy === 'admin' && o.type === 'item') {
      if (isApplicable(o, product)) {
        let d = 0;
        if (o.discountType === 'percent') d = priceAfterSeller * o.discountValue / 100;
        else if (o.discountType === 'flat') d = o.discountValue;
        adminOfferDiscount += d;
      }
    }
  });

  const finalSellingPrice = Math.max(0, priceAfterSeller - adminOfferDiscount);
  const commission = (finalSellingPrice * (product.commissionRate || 0)) / 100;
  const sellerNet = finalSellingPrice - commission;

  return (
    <div style={{ fontSize: '11px', lineHeight: '1.4', minWidth: '160px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>MRP:</span> <span style={{ textDecoration: 'line-through' }}>₹{mrp}</span></div>
      {normalDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Normal Disc:</span> <span>-₹{normalDiscount}</span></div>}
      {sellerOfferDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}><span>Seller Offer:</span> <span>-₹{sellerOfferDiscount.toFixed(1)}</span></div>}
      {adminOfferDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6366f1' }}><span>Admin Offer:</span> <span>-₹{adminOfferDiscount.toFixed(1)}</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', marginTop: '2px', paddingTop: '2px' }}><span>Selling:</span> <span>₹{finalSellingPrice.toFixed(1)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}><span>Comm ({product.commissionRate}%):</span> <span>-₹{commission.toFixed(1)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#16a34a' }}><span>Seller Net:</span> <span>₹{sellerNet.toFixed(1)}</span></div>
    </div>
  );
};

export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (p = 1) => {
    setLoading(true);
    const params = { page: p };
    if (filter !== '') params.isApproved = filter;
    
    try {
      const [pRes, oRes] = await Promise.all([
        getAdminProducts(params),
        getSellerActiveOffers('all')
      ]);
      setProducts(pRes.data.products);
      setPages(pRes.data.pages);
      setTotal(pRes.data.total);
      setActiveOffers(oRes.data.offers || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id, approve) => {
    try {
      const res = await approveProduct(id, { approve });
      setProducts(prev => prev.map(p => p._id === id ? res.data.product : p));
      toast.success(approve ? 'Product approved!' : 'Product rejected');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await deleteProduct(id); setProducts(prev => prev.filter(p => p._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div><h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Products</h1><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{total} products</p></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['', 'false', 'true'].map(v => (
            <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(v)}>
              {v === '' ? 'All' : v === 'false' ? 'Pending' : 'Approved'}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Product</th><th>Seller</th><th>Price Analysis</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
               : products.map(p => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {p.images?.[0]?.url ? <img src={p.images[0].url} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} alt="" /> : <div style={{ width: 40, height: 40, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>}
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{p.seller?.shopName || p.seller?.name}</td>
                  <td><PriceAnalysis product={p} activeOffers={activeOffers} /></td>
                  <td style={{ fontSize: '13px', color: p.stock === 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{p.stock}</td>
                  <td><span className={`badge ${p.isApproved ? 'badge-success' : 'badge-warning'}`}>{p.isApproved ? 'Approved' : 'Pending'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {!p.isApproved && <button className="btn btn-success btn-sm" onClick={() => handleApprove(p._id, true)}><FiCheck size={13} /> Approve</button>}
                      {p.isApproved && <button className="btn btn-outline btn-sm" onClick={() => handleApprove(p._id, false)}><FiX size={13} /></button>}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><FiTrash2 size={13} /></button>
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

export default AdminProducts;
