import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, getCategories, getOfferSchedules, getSellerActiveOffers } from '../../services/api';
import ProductCard from '../../components/common/ProductCard';
import OfferBanner from '../../components/common/OfferBanner';
import { FiArrowRight, FiZap, FiShield, FiTruck, FiGift } from 'react-icons/fi';
import './Home.css';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offerSchedules, setOfferSchedules] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, cRes, oRes, aRes] = await Promise.all([
          getProducts({ limit: 8, sort: 'popular' }),
          getCategories(),
          getOfferSchedules(),
          getSellerActiveOffers('all'),
        ]);
        setFeatured(pRes.data.products);
        setCategories(cRes.data.categories.slice(0, 8));
        setOfferSchedules(oRes.data.schedules || []);
        setActiveOffers(aRes.data.offers || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const features = [
    { icon: <FiTruck />, title: 'Free Delivery', desc: 'On orders above ₹499' },
    { icon: <FiShield />, title: 'Secure Payments', desc: 'COD & safe checkout' },
    { icon: <FiZap />, title: 'Real-time Updates', desc: 'Live order tracking' },
  ];

  return (
    <div className="home">
      {/* Dynamic Offer Banners */}
      {activeOffers.length > 0 && <OfferBanner offers={activeOffers} />}

      {/* Offer Schedule Banners */}
      {offerSchedules.length > 0 && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="container" style={{ padding: '12px 24px', display: 'flex', gap: '12px', overflowX: 'auto' }}>
            {offerSchedules.map(s => {
              const now = new Date();
              const start = new Date(s.startDate);
              const end = new Date(s.endDate);
              const isLive = now >= start && now <= end;
              const isUpcoming = now < start;
              return (
                <div key={s._id} style={{ flexShrink: 0, padding: '10px 18px', borderRadius: 10, background: s.bannerColor + '18', border: `1.5px solid ${s.bannerColor}40`, display: 'flex', gap: '10px', alignItems: 'center', minWidth: '220px' }}>
                  <span style={{ fontSize: '20px' }}>{isLive ? '🔥' : '📅'}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '13px', color: s.bannerColor }}>{s.title}</p>
                    {s.discountHint && <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.discountHint}</p>}
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isLive ? `🟢 Live until ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` :
                       isUpcoming ? `⏳ Starts ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-content container">
          <div className="hero-text">
            <p className="hero-eyebrow">Multi-Vendor Marketplace</p>
            <h1 className="hero-title">Shop from <span className="hero-highlight">thousands</span> of sellers</h1>
            <p className="hero-desc">Discover unique products from verified sellers. Real-time tracking, secure checkout, best prices.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/products')}>
                Browse Products <FiArrowRight />
              </button>
              <Link to="/register" className="btn btn-outline btn-lg">Become a Seller</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-stack">
              <div className="hero-card hero-card-1">🛍 250K+ Products</div>
              <div className="hero-card hero-card-2">⭐ 4.8 Avg Rating</div>
              <div className="hero-card hero-card-3">🚚 Fast Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features container">
        {features.map((f, i) => (
          <div key={i} className="feature-item">
            <span className="feature-icon">{f.icon}</span>
            <div>
              <h4 className="feature-title">{f.title}</h4>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="section container">
          <div className="section-header">
            <h2 className="section-title">Shop by Category</h2>
            <Link to="/products" className="section-link">View all <FiArrowRight /></Link>
          </div>
          <div className="categories-grid">
            {categories.map((cat, i) => (
              <button key={cat} className="category-chip" onClick={() => navigate(`/products?category=${encodeURIComponent(cat)}`)}>
                <span className="category-emoji">{['📱','👕','🏠','💄','📚','🎮','🍕','⚽'][i] || '📦'}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Offer Zone */}
      {activeOffers.length > 0 && (
        <section className="section container">
          <div className="section-header">
            <h2 className="section-title">🎁 Offer Zone</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Best deals from our sellers</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {activeOffers.map(o => (
              <div key={o._id} className="card" onClick={() => navigate(`/products?offerId=${o._id}`)} 
                style={{ padding: '20px', cursor: 'pointer', border: '1.5px solid var(--border)', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', padding: '4px 12px', fontSize: '10px', fontWeight: 700, borderRadius: '0 0 0 10px' }}>
                  {o.createdBy.toUpperCase()} OFFER
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--primary)' }}>{o.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', minHeight: '36px' }}>{o.description?.slice(0, 80)}...</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success)', background: 'var(--success-light)', padding: '4px 10px', borderRadius: 6 }}>
                    {o.discountType === 'percent' ? `${o.discountValue}% OFF` : 
                     o.discountType === 'flat' ? `₹${o.discountValue} OFF` : 'SPECIAL'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    View Items <FiArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Popular Products */}
      <section className="section container">
        <div className="section-header">
          <h2 className="section-title">Popular Products</h2>
          <Link to="/products?sort=popular" className="section-link">See all <FiArrowRight /></Link>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : featured.length > 0 ? (
          <div className="products-grid">
            {featured.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ fontSize: '48px' }}>📦</p>
            <h3>No products yet</h3>
            <p>Check back soon!</p>
          </div>
        )}
      </section>

      {/* CTA banner */}
      <section className="cta-banner">
        <div className="container">
          <h2>Want to sell on ShopHive?</h2>
          <p>Join our marketplace and reach thousands of customers</p>
          <Link to="/register" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)' }}>
            Start Selling Today <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
