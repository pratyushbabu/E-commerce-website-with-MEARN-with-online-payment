import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { getSocket } from '../../services/socket';
import { computeCartOffers } from '../../services/api';
import { FiTrash2, FiMinus, FiPlus, FiTag, FiAlertTriangle } from 'react-icons/fi';

const getEffectivePrice = (item) => {
  if (item.effectivePrice != null && item.effectivePrice > 0) return item.effectivePrice;
  const p = item.product;
  if (p && p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price) return p.discountPrice;
  return item.price || p?.price || 0;
};

export default function Cart() {
  const { cart, updateItem, removeItem, cartTotal, fetchCart } = useCart();
  const navigate = useNavigate();
  const items = cart?.items || [];
  const [offerSuggestions, setOfferSuggestions] = useState([]); // applied offers
  const [extraSuggestions, setExtraSuggestions] = useState([]); // potential offers
  const [offerDiscount, setOfferDiscount] = useState(0);
  const [itemDiscounts, setItemDiscounts] = useState({}); // productId -> discount amount

  // Compute applicable offers whenever cart changes
  useEffect(() => {
    if (!items.length) { setOfferSuggestions([]); setExtraSuggestions([]); setOfferDiscount(0); setItemDiscounts({}); return; }
    const payload = items.map(i => ({
      sellerId: i.product?.seller?._id || i.product?.seller,
      productId: i.product?._id,
      price: getEffectivePrice(i),
      quantity: i.quantity,
      category: i.product?.category,
    })).filter(x => x.sellerId && x.productId);
    if (!payload.length) return;
    computeCartOffers({ items: payload }).then(r => {
      setOfferSuggestions(r.data.appliedOffers || []);
      setExtraSuggestions(r.data.suggestions || []);
      setOfferDiscount(r.data.totalDiscount || 0);
      setItemDiscounts(r.data.itemDiscounts || {});
    }).catch(() => {});
  }, [cart]);

  // Real-time: refresh cart when a seller is blocked/unblocked
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => fetchCart();
    socket.on('seller-block-status', handler);
    return () => socket.off('seller-block-status', handler);
  }, [fetchCart]);

  if (items.length === 0) return (
    <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</p>
      <h2>Your cart is empty</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>Discover products and add them to your cart</p>
      <Link to="/products" className="btn btn-primary btn-lg">Browse Products</Link>
    </div>
  );

  // Split items: available vs blocked-seller
  const availableItems = items.filter(i => !i.sellerBlocked);
  const blockedItems = items.filter(i => i.sellerBlocked);
  const hasBlockedItems = blockedItems.length > 0;

  // Only sum available items for total
  const availableTotal = availableItems.reduce((s, item) => s + getEffectivePrice(item) * item.quantity, 0);
  const totalOriginal = availableItems.reduce((s, item) => s + (item.price || item.product?.price || 0) * item.quantity, 0);
  const totalSavings = totalOriginal - availableTotal;

  return (
    <div className="container" style={{ padding: '32px 24px 60px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Shopping Cart ({items.length})</h1>

      {/* Blocked seller warning banner */}
      {hasBlockedItems && (
        <div style={{
          background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 12,
          padding: '16px 20px', marginBottom: '24px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <FiAlertTriangle color="#d97706" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>
              ⚠️ Some items are unavailable
            </p>
            <p style={{ fontSize: '13px', color: '#92400e' }}>
              {blockedItems.length} item{blockedItems.length > 1 ? 's' : ''} in your cart{' '}
              {blockedItems.length > 1 ? 'are' : 'is'} from a seller that has been temporarily suspended.
              These cannot be purchased. Please remove them to proceed to checkout.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
        {/* Items list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map(item => {
            const product = item.product;
            if (!product) return null;
            const isBlocked = item.sellerBlocked === true;
            const ep = isBlocked ? 0 : getEffectivePrice(item);
            const hasDiscount = !isBlocked && ep < (item.price || product.price || 0);
            const uomLabel = product.uom ? `${product.quantity || 1} ${product.uom}` : null;

            return (
              <div key={item._id} className="card" style={{
                padding: '16px', display: 'flex', gap: '16px', alignItems: 'center',
                ...(isBlocked ? { opacity: 0.65, border: '1.5px solid #f59e0b', background: '#fffbeb' } : {}),
              }}>
                <Link to={`/products/${product._id}`}>
                  {product.images?.[0]?.url
                    ? <img src={product.images[0].url} alt={product.name}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, filter: isBlocked ? 'grayscale(60%)' : 'none' }} />
                    : <div style={{ width: 80, height: 80, background: 'var(--bg)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>📦</div>
                  }
                </Link>

                <div style={{ flex: 1 }}>
                  <Link to={`/products/${product._id}`} style={{ fontWeight: 600, fontSize: '15px' }}>{product.name}</Link>
                  {uomLabel && (
                    <p style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px', fontWeight: 500 }}>Unit: {uomLabel}</p>
                  )}
                  {isBlocked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <FiAlertTriangle size={13} color="#d97706" />
                      <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
                        Seller unavailable — cannot be purchased
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>₹{ep.toLocaleString()}</span>
                      {hasDiscount && (
                        <>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            ₹{(item.price || product.price).toLocaleString()}
                          </span>
                          <span className="badge badge-danger" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <FiTag size={9} /> Discount applied
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Qty controls — hidden for blocked items */}
                {!isBlocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => updateItem(item._id, item.quantity - 1)}><FiMinus size={12} /></button>
                    <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => updateItem(item._id, item.quantity + 1)}
                      disabled={item.quantity >= product.stock}><FiPlus size={12} /></button>
                  </div>
                )}

                {!isBlocked && (
                  <div style={{ textAlign: 'right', minWidth: '90px' }}>
                    <p style={{ fontWeight: 700, fontSize: '16px' }}>
                      ₹{(ep * item.quantity - (itemDiscounts[product._id] || 0)).toLocaleString()}
                    </p>
                    {itemDiscounts[product._id] > 0 && (
                      <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                        -₹{Math.round(itemDiscounts[product._id]).toLocaleString()} Offer
                      </p>
                    )}
                  </div>
                )}

                <button onClick={() => removeItem(item._id)}
                  style={{ color: isBlocked ? '#d97706' : 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  title={isBlocked ? 'Remove unavailable item' : 'Remove from cart'}>
                  <FiTrash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="card" style={{ padding: '24px', position: 'sticky', top: '90px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Order Summary</h3>

          {/* Offer Suggestions */}
          {offerSuggestions.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiTag size={13} /> 🎁 Offers Applied to Your Cart
              </p>
              {offerSuggestions.map((ao, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#166534', marginBottom: '4px' }}>
                  <span>• {ao.offer?.title} ({ao.type === 'bill' ? 'Bill offer' : 'Item offer'})</span>
                  <span style={{ fontWeight: 700 }}>-₹{ao.discount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Potential Savings */}
          {extraSuggestions.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fcd34d' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiTag size={13} /> 💡 Potential Savings
              </p>
              {extraSuggestions.map((s, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#78350f', marginBottom: '4px', lineHeight: 1.4 }}>
                  • {s.text}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {hasBlockedItems && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d97706', background: '#fef3c7', padding: '8px 10px', borderRadius: 8 }}>
                <span>⚠ Unavailable items ({blockedItems.length})</span>
                <span>excluded</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Subtotal ({availableItems.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span>₹{totalOriginal.toLocaleString()}</span>
            </div>
            {totalSavings > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>
                <span>🎉 Discount Savings</span>
                <span>- ₹{totalSavings.toLocaleString()}</span>
              </div>
            )}
            {offerDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>
                <span>🎁 Offer Discounts</span>
                <span>- ₹{offerDiscount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--success)' }}>
              <span>Delivery</span><span>FREE</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '18px' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>₹{Math.max(0, availableTotal - offerDiscount).toLocaleString()}</span>
            </div>
            {(totalSavings > 0 || offerDiscount > 0) && (
              <p style={{ fontSize: '12px', color: 'var(--success)', textAlign: 'right', marginTop: '-4px' }}>
                You save ₹{(totalSavings + offerDiscount).toLocaleString()} on this order!
              </p>
            )}
          </div>
          <button
            className="btn btn-primary w-full btn-lg"
            onClick={() => navigate('/checkout')}
            disabled={hasBlockedItems || availableItems.length === 0}
            title={hasBlockedItems ? 'Remove unavailable items before checkout' : ''}
          >
            {hasBlockedItems ? '⚠ Remove Unavailable Items First' : 'Proceed to Checkout'}
          </button>
          {hasBlockedItems && (
            <p style={{ fontSize: '12px', color: '#d97706', textAlign: 'center', marginTop: '8px' }}>
              Remove items from blocked sellers to continue
            </p>
          )}
          <Link to="/products" className="btn btn-outline w-full" style={{ marginTop: '10px', justifyContent: 'center' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
