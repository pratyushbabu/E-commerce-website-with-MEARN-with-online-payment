import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct, getSellerActiveOffers } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PriceAnalysis = ({ product, activeOffers }) => {
  const mrp = product.price;
  const normalDiscount = product.discountPrice && product.discountPrice < mrp ? mrp - product.discountPrice : 0;
  const priceAfterNormal = mrp - normalDiscount;

  // Layering logic:
  let currentPrice = priceAfterNormal;
  let sellerOfferDiscount = 0;
  let adminOfferDiscount = 0;

  // 1. Seller Offers
  activeOffers.forEach(o => {
    if (o.createdBy === 'seller' && o.type === 'item') {
      if (o.applicableProducts?.length === 0 || o.applicableProducts?.some(ap => ap._id === product._id || ap === product._id)) {
        let d = 0;
        if (o.discountType === 'percent') d = currentPrice * o.discountValue / 100;
        else if (o.discountType === 'flat') d = o.discountValue;
        sellerOfferDiscount += d;
      }
    }
  });
  currentPrice = Math.max(0, currentPrice - sellerOfferDiscount);

  // 2. Admin Offers
  activeOffers.forEach(o => {
    if (o.createdBy === 'admin' && o.type === 'item') {
      if (o.applicableProducts?.length === 0 || o.applicableProducts?.some(ap => ap._id === product._id || ap === product._id)) {
        let d = 0;
        if (o.discountType === 'percent') d = currentPrice * o.discountValue / 100;
        else if (o.discountType === 'flat') d = o.discountValue;
        adminOfferDiscount += d;
      }
    }
  });

  const finalSellingPrice = currentPrice - adminOfferDiscount;
  const commission = (finalSellingPrice * (product.commissionRate || 0)) / 100;
  const sellerNet = finalSellingPrice - commission;

  return (
    <div style={{ fontSize: '11px', lineHeight: '1.4', minWidth: '160px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>MRP:</span> <span style={{ textDecoration: 'line-through' }}>₹{mrp}</span></div>
      {normalDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Normal Disc:</span> <span>-₹{normalDiscount}</span></div>}
      {sellerOfferDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}><span>Seller Offer:</span> <span>-₹{sellerOfferDiscount.toFixed(1)}</span></div>}
      {adminOfferDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6366f1' }}><span>Admin Offer:</span> <span>-₹{adminOfferDiscount.toFixed(1)}</span></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', marginTop: '2px', paddingTop: '2px' }}><span>Selling Price:</span> <span>₹{finalSellingPrice.toFixed(1)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}><span>Comm ({product.commissionRate}%):</span> <span>-₹{commission.toFixed(1)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#16a34a' }}><span>Seller Net:</span> <span>₹{sellerNet.toFixed(1)}</span></div>
    </div>
  );
};

export default function SellerProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [pRes, oRes] = await Promise.all([
        getProducts({ seller: user._id, limit: 100 }),
        getSellerActiveOffers(user._id)
      ]);
      setProducts(pRes.data.products || []);
      setActiveOffers(oRes.data.offers || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [user._id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success('Product deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>My Products</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{products.length} products listed</p>
        </div>
        <Link to="/seller/products/add" className="btn btn-primary"><FiPlus /> Add Product</Link>
      </div>

      {loading ? <div className="spinner" /> : products.length === 0 ? (
        <div className="empty-state card" style={{ padding: '60px' }}>
          <p style={{ fontSize: '48px' }}>📦</p>
          <h3>No products yet</h3>
          <p>Start by adding your first product</p>
          <Link to="/seller/products/add" className="btn btn-primary" style={{ marginTop: '16px' }}><FiPlus /> Add Product</Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price Breakdown</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                          : <div style={{ width: 44, height: 44, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                        }
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-secondary">{p.category}</span></td>
                    <td><PriceAnalysis product={p} activeOffers={activeOffers} /></td>
                    <td>
                      <span style={{ color: p.stock === 0 ? 'var(--danger)' : p.stock < 10 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {p.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/seller/products/edit/${p._id}`} className="btn btn-outline btn-sm"><FiEdit2 size={13} /></Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
