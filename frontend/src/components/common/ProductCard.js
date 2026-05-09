import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiStar, FiGift } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { toggleWishlist, getSellerActiveOffers } from '../../services/api';
import toast from 'react-hot-toast';
import './ProductCard.css';

export default function ProductCard({ product, wishlistIds = [], onWishlistToggle }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [activeOffers, setActiveOffers] = useState([]);
  const isWished = wishlistIds.includes(product._id);

  useEffect(() => {
    if (product.seller?._id || product.seller) {
      getSellerActiveOffers(product.seller._id || product.seller)
        .then(r => {
          const offers = r.data.offers || [];
          // Filter offers applicable to this product
          const applicable = offers.filter(o => 
            o.type === 'item' && (o.applicableProducts.length === 0 || o.applicableProducts.some(p => p._id === product._id || p === product._id))
          );
          setActiveOffers(applicable);
        }).catch(() => {});
    }
  }, [product]);

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Login to add to wishlist'); return; }
    try {
      const res = await toggleWishlist({ productId: product._id });
      if (onWishlistToggle) onWishlistToggle(product._id, res.data.added);
      toast.success(res.data.added ? 'Added to wishlist' : 'Removed from wishlist');
    } catch { toast.error('Failed'); }
  };

  const handleCart = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'buyer') { toast.error('Login as buyer to add to cart'); return; }
    await addToCart(product._id, 1);
  };

  const productDiscount = product.discountPrice && product.discountPrice < product.price
    ? product.price - product.discountPrice
    : 0;

  const basePrice = product.discountPrice && product.discountPrice < product.price
    ? product.discountPrice : product.price;

  // Layer offer discounts
  let currentPrice = basePrice;
  let totalOfferDiscount = 0;
  let bestOffer = null;
  let adminOfferApplied = null;
  let sellerOfferApplied = null;

  // 1. Seller Offers
  activeOffers.forEach(o => {
    if (o.createdBy === 'seller') {
      let d = 0;
      if (o.discountType === 'percent') d = currentPrice * o.discountValue / 100;
      else if (o.discountType === 'flat') d = o.discountValue;
      if (d > 0) {
        totalOfferDiscount += d;
        sellerOfferApplied = o;
        if (!bestOffer || d > 0) bestOffer = o;
      }
    }
  });
  currentPrice = Math.max(0, currentPrice - (sellerOfferApplied ? totalOfferDiscount : 0));

  // 2. Admin Offers
  let adminDiscount = 0;
  activeOffers.forEach(o => {
    if (o.createdBy === 'admin') {
      let d = 0;
      if (o.discountType === 'percent') d = currentPrice * o.discountValue / 100;
      else if (o.discountType === 'flat') d = o.discountValue;
      if (d > 0) {
        adminDiscount += d;
        adminOfferApplied = o;
        if (!bestOffer || d > 0) bestOffer = o;
      }
    }
  });
  totalOfferDiscount += adminDiscount;

  const finalPrice = basePrice - totalOfferDiscount;
  const totalSavings = (product.price - finalPrice);
  const totalDiscountPercent = Math.round((totalSavings / product.price) * 100);

  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-card-img-wrap">
        {product.images?.[0]?.url
          ? <img src={product.images[0].url} alt={product.name} className="product-card-img" />
          : <div className="product-card-no-img">📦</div>
        }
        {totalDiscountPercent > 0 && <span className="product-card-discount">-{totalDiscountPercent}%</span>}
        {bestOffer && (
          <div className="product-card-offer-badge" title={bestOffer.title}>
            <FiGift size={10} /> {bestOffer.title.slice(0, 15)}
          </div>
        )}
        {product.stock === 0 && <div className="product-card-oos">Out of Stock</div>}
        <div className="product-card-actions">
          <button className={`product-card-wish ${isWished ? 'wished' : ''}`} onClick={handleWishlist} title="Wishlist">
            <FiHeart size={16} />
          </button>
          <button className="product-card-cart" onClick={handleCart} disabled={product.stock === 0} title="Add to cart">
            <FiShoppingCart size={16} />
          </button>
        </div>
      </div>
      <div className="product-card-body">
        <p className="product-card-seller">{product.seller?.shopName || product.seller?.name}</p>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-rating">
          <FiStar size={12} fill="#f59e0b" color="#f59e0b" />
          <span>{product.ratings?.toFixed(1) || '—'}</span>
          {product.numReviews > 0 && <span className="review-count">({product.numReviews})</span>}
        </div>
        <div className="product-card-price">
          <span className="price-final">₹{Math.max(0, Math.round(finalPrice)).toLocaleString()}</span>
          {(totalSavings > 0) && <span className="price-original">₹{product.price.toLocaleString()}</span>}
        </div>
        {bestOffer && <p style={{ fontSize: '10px', color: 'var(--success)', marginTop: '4px', fontWeight: 600 }}>Extra Discount Applied!</p>}
      </div>
    </Link>
  );
}
