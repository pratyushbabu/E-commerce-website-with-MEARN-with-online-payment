import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts, getCategories, getWishlist, getSellers } from '../../services/api';
import { getSocket } from '../../services/socket';
import ProductCard from '../../components/common/ProductCard';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';
import './Products.css';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    seller: searchParams.get('seller') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
    page: Number(searchParams.get('page')) || 1,
    offerId: searchParams.get('offerId') || '',
  });

  const searchDebounce = useRef(null);

  const fetchProducts = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const params = { limit: 12, ...f };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await getProducts(params);
      setProducts(res.data.products);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    const f = {
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      seller: searchParams.get('seller') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      sort: searchParams.get('sort') || 'newest',
      page: Number(searchParams.get('page')) || 1,
      offerId: searchParams.get('offerId') || '',
    };
    setFilters(f);
    fetchProducts(f);
  }, [searchParams, fetchProducts]);

  useEffect(() => {
    getCategories().then(r => setCategories(r.data.categories || [])).catch(() => {});
    getSellers().then(r => setSellers(r.data.sellers || [])).catch(() => {});
  }, []);

  // Real-time stock updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ productId, stock }) => {
      setProducts(prev => prev.map(p => p._id === productId ? { ...p, stock } : p));
    };
    const newProductHandler = ({ product }) => {
      setProducts(prev => [product, ...prev].slice(0, 12));
    };
    socket.on('stock-update', handler);
    socket.on('new-product', newProductHandler);
    return () => { socket.off('stock-update', handler); socket.off('new-product', newProductHandler); };
  }, []);

  const handleSearchChange = (val) => {
    setFilters(f => ({ ...f, search: val, page: 1 }));
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      const newF = { ...filters, search: val, page: 1 };
      fetchProducts(newF);
      updateParams(newF);
    }, 400);
  };

  const handleFilterChange = (key, val) => {
    const newF = { ...filters, [key]: val, page: 1 };
    setFilters(newF);
    fetchProducts(newF);
    updateParams(newF);
  };

  const updateParams = (f) => {
    const p = {};
    Object.keys(f).forEach(k => { if (f[k]) p[k] = f[k]; });
    setSearchParams(p);
  };

  const handlePage = (p) => {
    const newF = { ...filters, page: p };
    setFilters(newF);
    fetchProducts(newF);
    window.scrollTo(0, 0);
  };

  const clearFilters = () => {
    const newF = { search: '', category: '', seller: '', minPrice: '', maxPrice: '', sort: 'newest', page: 1 };
    setFilters(newF);
    fetchProducts(newF);
    setSearchParams({});
  };

  const hasFilters = filters.search || filters.category || filters.seller || filters.minPrice || filters.maxPrice;

  return (
    <div className="products-page">
      <div className="products-header container">
        <div>
          <h1 className="products-title">All Products</h1>
          <p className="products-count">{total} products found</p>
        </div>
        <div className="products-header-actions">
          <div className="search-bar" style={{ width: '320px' }}>
            <FiSearch size={15} color="var(--text-muted)" />
            <input
              value={filters.search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search products..."
            />
            {filters.search && (
              <button onClick={() => handleSearchChange('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <FiX size={14} />
              </button>
            )}
          </div>
          <select className="form-input" style={{ width: 'auto' }} value={filters.sort} onChange={e => handleFilterChange('sort', e.target.value)}>
            <option value="newest">Newest</option>
            <option value="popular">Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(v => !v)}>
            <FiFilter size={14} /> Filters
          </button>
        </div>
      </div>

      <div className="products-layout container">
        {/* Filters sidebar */}
        <aside className={`filters-sidebar ${showFilters ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px' }}>Filters</h3>
            {hasFilters && <button onClick={clearFilters} className="btn btn-sm" style={{ color: 'var(--danger)', background: 'none', border: 'none' }}>Clear all</button>}
          </div>

          <div className="filter-group">
            <p className="filter-label">Category</p>
            <div className="filter-cats">
              <button className={`filter-cat-btn ${!filters.category ? 'active' : ''}`} onClick={() => handleFilterChange('category', '')}>All</button>
              {categories.map(cat => (
                <button key={cat} className={`filter-cat-btn ${filters.category === cat ? 'active' : ''}`} onClick={() => handleFilterChange('category', cat)}>{cat}</button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <p className="filter-label">Sellers</p>
            <div className="filter-cats">
              <button className={`filter-cat-btn ${!filters.seller ? 'active' : ''}`} onClick={() => handleFilterChange('seller', '')}>All Sellers</button>
              {sellers.map(s => (
                <button key={s._id} className={`filter-cat-btn ${filters.seller === s._id ? 'active' : ''}`} onClick={() => handleFilterChange('seller', s._id)}>
                  {s.shopName || s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <p className="filter-label">Price Range</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input className="form-input" type="number" placeholder="Min" value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                onBlur={() => handleFilterChange('minPrice', filters.minPrice)} />
              <span style={{ color: 'var(--text-muted)' }}>—</span>
              <input className="form-input" type="number" placeholder="Max" value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                onBlur={() => handleFilterChange('maxPrice', filters.maxPrice)} />
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <div className="products-main">
          {loading ? (
            <div className="spinner" />
          ) : products.length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: '48px' }}>🔍</p>
              <h3>No products found</h3>
              <p>Try different search terms or filters</p>
              <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <>
              <div className="products-grid fade-in">
                {products.map(p => (
                  <ProductCard key={p._id} product={p} wishlistIds={wishlistIds}
                    onWishlistToggle={(id, added) => setWishlistIds(prev => added ? [...prev, id] : prev.filter(x => x !== id))} />
                ))}
              </div>
              {pages > 1 && (
                <div className="pagination">
                  {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`page-btn ${filters.page === p ? 'active' : ''}`} onClick={() => handlePage(p)}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
