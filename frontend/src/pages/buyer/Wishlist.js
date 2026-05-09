// Wishlist.js
import React, { useState, useEffect } from 'react';
import { getWishlist } from '../../services/api';
import ProductCard from '../../components/common/ProductCard';
import { FiHeart } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export function Wishlist() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState([]);

  useEffect(() => {
    getWishlist().then(r => {
      const prods = r.data.wishlist?.products || [];
      setProducts(prods);
      setWishlistIds(prods.map(p => p._id));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ marginTop: '80px' }} />;

  return (
    <div className="container" style={{ padding: '32px 24px 60px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>My Wishlist</h1>
      {products.length === 0 ? (
        <div className="empty-state">
          <FiHeart size={48} />
          <h3>Wishlist is empty</h3>
          <p>Save products you love to your wishlist</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>Explore Products</Link>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(p => (
            <ProductCard key={p._id} product={p} wishlistIds={wishlistIds}
              onWishlistToggle={(id, added) => {
                if (!added) { setProducts(prev => prev.filter(x => x._id !== id)); setWishlistIds(prev => prev.filter(x => x !== id)); }
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Wishlist;
