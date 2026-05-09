import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  const links = {
    Shop: [
      { label: 'All Products', to: '/products' },
      { label: 'Categories', to: '/products' },
      { label: 'New Arrivals', to: '/products?sort=newest' },
      { label: 'Popular Items', to: '/products?sort=popular' },
    ],
    Sellers: [
      { label: 'Become a Seller', to: '/register' },
      { label: 'Seller Dashboard', to: '/seller/dashboard' },
      { label: 'Add Product', to: '/seller/products/add' },
    ],
    Account: [
      { label: 'My Orders', to: '/orders' },
      { label: 'Wishlist', to: '/wishlist' },
      { label: 'Profile', to: '/profile' },
      { label: 'Login', to: '/login' },
    ],
    Support: [
      { label: 'About Us', to: '#' },
      { label: 'Contact', to: '#' },
      { label: 'Privacy Policy', to: '#' },
      { label: 'Terms of Service', to: '#' },
    ],
  };

  return (
    <footer className="footer">
      <div className="footer-top container">
        <div className="footer-brand-col">
          <Link to="/" className="footer-brand">
            <span className="footer-brand-icon">🛍</span>
            <span className="footer-brand-name">ShopHive</span>
          </Link>
          <p className="footer-desc">
            A modern multi-vendor marketplace connecting buyers with thousands of verified sellers.
            Real-time tracking, secure checkout, and the best deals — all in one place.
          </p>
          <div className="footer-badges">
            <span className="footer-badge">✅ Verified Sellers</span>
            <span className="footer-badge">🔒 Secure Payments</span>
            <span className="footer-badge">🚚 Fast Delivery</span>
          </div>
        </div>

        {Object.entries(links).map(([section, items]) => (
          <div key={section} className="footer-links-col">
            <h4 className="footer-col-title">{section}</h4>
            <ul className="footer-links">
              {items.map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="footer-link">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p className="footer-copy">
            © {year} <strong>ShopHive</strong>. All rights reserved. 
          </p>
          <div className="footer-bottom-links">
            <Link to="#" className="footer-bottom-link">Privacy</Link>
            <span className="footer-divider">·</span>
            <Link to="#" className="footer-bottom-link">Terms</Link>
            <span className="footer-divider">·</span>
            <Link to="#" className="footer-bottom-link">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
