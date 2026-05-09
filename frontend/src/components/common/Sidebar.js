import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers, FiDollarSign, FiCreditCard,
  FiLogOut, FiPlus, FiList, FiHome, FiChevronLeft, FiChevronRight,
  FiTag, FiPercent, FiCalendar, FiSmartphone, FiSettings, FiTrendingUp
} from 'react-icons/fi';
import './Sidebar.css';

const adminLinks = [
  { to: '/admin/dashboard', icon: <FiGrid />, label: 'Dashboard' },
  { to: '/admin/insights', icon: <FiTrendingUp />, label: 'Insights' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/products', icon: <FiPackage />, label: 'Products' },
  { to: '/admin/orders', icon: <FiShoppingBag />, label: 'Orders' },
  { to: '/admin/payments', icon: <FiDollarSign />, label: 'Payments' },
  { to: '/admin/withdrawals', icon: <FiCreditCard />, label: 'Withdrawals' },
  { to: '/admin/commissions', icon: <FiPercent />, label: 'Commissions' },
  { to: '/admin/offers', icon: <FiTag />, label: 'Offers' },
  { to: '/admin/qr-config', icon: <FiSmartphone />, label: 'QR Config' },
];

const sellerLinks = [
  { to: '/seller/dashboard', icon: <FiGrid />, label: 'Dashboard' },
  { to: '/seller/products', icon: <FiList />, label: 'My Products' },
  { to: '/seller/products/add', icon: <FiPlus />, label: 'Add Product' },
  { to: '/seller/orders', icon: <FiShoppingBag />, label: 'Orders' },
  { to: '/seller/offers', icon: <FiTag />, label: 'My Offers' },
  { to: '/seller/bank-details', icon: <FiCreditCard />, label: 'Bank Details' },
];

export default function Sidebar({ role }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const links = role === 'admin' ? adminLinks : sellerLinks;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">
          <span className="sidebar-brand-icon">🛍</span>
          {!collapsed && <span className="sidebar-brand-text">ShopHive</span>}
        </Link>
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        {!collapsed && (
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{user?.name}</p>
            <span className="badge badge-primary" style={{ fontSize: '10px' }}>{role}</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`sidebar-link ${location.pathname === link.to ? 'active' : ''}`}
            title={collapsed ? link.label : ''}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            {!collapsed && <span className="sidebar-link-label">{link.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/" className="sidebar-link" title={collapsed ? 'Store Front' : ''}>
          <span className="sidebar-link-icon"><FiHome /></span>
          {!collapsed && <span className="sidebar-link-label">Store Front</span>}
        </Link>
        <button className="sidebar-link sidebar-logout" onClick={logout} title={collapsed ? 'Logout' : ''}>
          <span className="sidebar-link-icon"><FiLogOut /></span>
          {!collapsed && <span className="sidebar-link-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
