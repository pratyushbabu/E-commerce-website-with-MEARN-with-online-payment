import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import {
  getNotifications, markAllNotificationsRead,
  deleteNotification, clearAllNotifications,
  searchProducts,
} from '../../services/api';
import {
  FiShoppingCart, FiBell, FiUser, FiSearch, FiMenu, FiX,
  FiHeart, FiLogOut, FiPackage, FiSettings, FiTrash2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { unreadCount, markRead, notifications: liveNotifs, setNotifications } = useSocket();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const notifRef = useRef();
  const searchRef = useRef();
  const searchDebounce = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchInput = useCallback((val) => {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    if (!val.trim()) { setSearchResults([]); setShowSearch(false); return; }
    setSearchLoading(true);
    setShowSearch(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await searchProducts(val.trim(), 8);
        setSearchResults(res.data.products);
      } catch {}
      setSearchLoading(false);
    }, 300);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (search.trim()) {
      setShowSearch(false);
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleSearchSelect = (id) => {
    setShowSearch(false);
    setSearch('');
    navigate(`/products/${id}`);
  };

  const openNotifs = async () => {
    const next = !showNotifs;
    setShowNotifs(next);
    if (next && user) {
      try {
        const res = await getNotifications();
        setNotifs(res.data.notifications);
        await markAllNotificationsRead();
        markRead();
      } catch {}
    }
  };

  const handleDeleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifs(prev => prev.filter(n => n._id !== id));
      if (setNotifications) setNotifications(prev => prev.filter(n => n._id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifs([]);
      if (setNotifications) setNotifications([]);
      markRead();
      toast.success('All notifications cleared');
    } catch { toast.error('Failed'); }
  };

  const displayNotifs = notifs.length > 0 ? notifs : liveNotifs;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🛍</span>
          <span className="brand-text">ShopHive</span>
        </Link>

        <div className="navbar-search" ref={searchRef}>
          <form className="search-bar" onSubmit={handleSearchSubmit}>
            <FiSearch size={16} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Search products, brands, categories..."
              onFocus={() => search.trim() && setShowSearch(true)}
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchResults([]); setShowSearch(false); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <FiX size={14} />
              </button>
            )}
          </form>

          {showSearch && (
            <div className="search-dropdown">
              {searchLoading ? (
                <div className="search-loading">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="search-loading">No results for "{search}"</div>
              ) : (
                <>
                  {searchResults.map(p => {
                    const ep = p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price;
                    return (
                      <button key={p._id} className="search-result-item" onClick={() => handleSearchSelect(p._id)}>
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt="" className="search-result-img" />
                          : <div className="search-result-img-placeholder">📦</div>
                        }
                        <div className="search-result-info">
                          <p className="search-result-name">{p.name}</p>
                          <p className="search-result-meta">{p.category} · {p.seller?.shopName}</p>
                        </div>
                        <div className="search-result-price">
                          <span>₹{ep?.toLocaleString()}</span>
                          {p.discountPrice > 0 && p.discountPrice < p.price && (
                            <span className="search-original-price">₹{p.price?.toLocaleString()}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <button className="search-view-all" onClick={handleSearchSubmit}>
                    View all results for "{search}"
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="navbar-actions">
          {user?.role === 'buyer' && (
            <>
              <Link to="/wishlist" className="nav-icon-btn" title="Wishlist"><FiHeart size={20} /></Link>
              <Link to="/cart" className="nav-icon-btn relative" title="Cart">
                <FiShoppingCart size={20} />
                {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </Link>
            </>
          )}

          {user && (
            <div ref={notifRef} className="notif-wrapper">
              <button className="nav-icon-btn relative" onClick={openNotifs} title="Notifications">
                <FiBell size={20} />
                {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span>Notifications</span>
                    {displayNotifs.length > 0 && (
                      <button className="notif-clear-btn" onClick={handleClearAll}>
                        <FiTrash2 size={12} /> Clear All
                      </button>
                    )}
                  </div>
                  {displayNotifs.length === 0 ? (
                    <div className="notif-empty">🔔 No notifications</div>
                  ) : (
                    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      {displayNotifs.map(n => (
                        <div key={n._id} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                          <div className="notif-dot-sm" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="notif-msg">{n.message}</p>
                            <p className="notif-time">
                              {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button className="notif-delete-btn" onClick={(e) => handleDeleteNotif(e, n._id)} title="Delete notification">
                            <FiX size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="user-menu-wrapper">
              <button className="user-avatar-btn" onClick={() => setShowUser(v => !v)}>
                {user.avatar ? <img src={user.avatar} alt="" /> : <span>{user.name[0].toUpperCase()}</span>}
              </button>
              {showUser && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <p className="user-dropdown-name">{user.name}</p>
                    <p className="user-dropdown-role">{user.role}</p>
                  </div>
                  {user.role === 'buyer' && (
                    <>
                      <Link to="/profile" className="user-dropdown-item" onClick={() => setShowUser(false)}><FiSettings size={14} /> Profile</Link>
                      <Link to="/orders" className="user-dropdown-item" onClick={() => setShowUser(false)}><FiPackage size={14} /> My Orders</Link>
                    </>
                  )}
                  {user.role === 'seller' && (
                    <Link to="/seller/dashboard" className="user-dropdown-item" onClick={() => setShowUser(false)}><FiSettings size={14} /> Dashboard</Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin/dashboard" className="user-dropdown-item" onClick={() => setShowUser(false)}><FiSettings size={14} /> Admin Panel</Link>
                  )}
                  <button className="user-dropdown-item danger" onClick={logout}><FiLogOut size={14} /> Logout</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-btns">
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}

          <button className="mobile-menu-btn" onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          <form onSubmit={handleSearchSubmit} className="mobile-search">
            <div className="search-bar">
              <FiSearch size={16} />
              <input value={search} onChange={e => handleSearchInput(e.target.value)} placeholder="Search..." />
            </div>
          </form>
          <Link to="/" className="mobile-link" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/products" className="mobile-link" onClick={() => setMobileOpen(false)}>Products</Link>
          {user?.role === 'buyer' && <>
            <Link to="/cart" className="mobile-link" onClick={() => setMobileOpen(false)}>Cart ({cartCount})</Link>
            <Link to="/wishlist" className="mobile-link" onClick={() => setMobileOpen(false)}>Wishlist</Link>
            <Link to="/orders" className="mobile-link" onClick={() => setMobileOpen(false)}>Orders</Link>
          </>}
          {!user && <>
            <Link to="/login" className="mobile-link" onClick={() => setMobileOpen(false)}>Login</Link>
            <Link to="/register" className="mobile-link" onClick={() => setMobileOpen(false)}>Register</Link>
          </>}
          {user && <button className="mobile-link danger-link" onClick={logout}>Logout</button>}
        </div>
      )}
    </nav>
  );
}
