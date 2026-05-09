import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiTag, FiGift } from 'react-icons/fi';
import './OfferBanner.css';

export default function OfferBanner({ offers = [] }) {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (offers.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % offers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [offers.length]);

  if (!offers || offers.length === 0) return null;

  const next = () => setCurrent((current + 1) % offers.length);
  const prev = () => setCurrent((current - 1 + offers.length) % offers.length);

  const o = offers[current];

  return (
    <div className="offer-banner-container">
      <div className="offer-banner" style={{ background: o.createdBy === 'admin' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)' }}>
        <div className="offer-banner-content container">
          <div className="offer-banner-text">
            <span className="offer-banner-badge">
              {o.createdBy === 'admin' ? '🏷️ PLATFORM OFFER' : `🏪 ${o.seller?.shopName || 'SELLER'} OFFER`}
            </span>
            <h2 className="offer-banner-title">{o.title}</h2>
            <p className="offer-banner-desc">{o.description}</p>
            <button className="offer-banner-btn" onClick={() => navigate(`/products?offerId=${o._id}`)}>
              Shop Now <FiChevronRight />
            </button>
          </div>
          <div className="offer-banner-visual">
            <div className="offer-banner-icon">
              {o.type === 'bill' ? <FiTag size={80} /> : <FiGift size={80} />}
            </div>
            <div className="offer-banner-discount">
              <span className="discount-val">
                {o.discountType === 'percent' ? `${o.discountValue}%` : `₹${o.discountValue}`}
              </span>
              <span className="discount-label">OFF</span>
            </div>
          </div>
        </div>

        {offers.length > 1 && (
          <>
            <button className="offer-nav-btn prev" onClick={prev}><FiChevronLeft /></button>
            <button className="offer-nav-btn next" onClick={next}><FiChevronRight /></button>
            <div className="offer-dots">
              {offers.map((_, i) => (
                <div key={i} className={`offer-dot ${i === current ? 'active' : ''}`} onClick={() => setCurrent(i)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
