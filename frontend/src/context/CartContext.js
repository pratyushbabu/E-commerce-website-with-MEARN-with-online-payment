import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCart as apiGetCart, addToCart as apiAdd, updateCartItem as apiUpdate, removeFromCart as apiRemove, clearCart as apiClear } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user || user.role !== 'buyer') return;
    try {
      const res = await apiGetCart();
      setCart(res.data.cart || { items: [] });
    } catch {}
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      const res = await apiAdd({ productId, quantity });
      setCart(res.data.cart);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    } finally { setLoading(false); }
  };

  const updateItem = async (itemId, quantity) => {
    try {
      const res = await apiUpdate(itemId, { quantity });
      setCart(res.data.cart);
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };

  const removeItem = async (itemId) => {
    try {
      const res = await apiRemove(itemId);
      setCart(res.data.cart);
      toast.success('Removed from cart');
    } catch { toast.error('Failed to remove'); }
  };

  const clearCart = async () => {
    try { await apiClear(); setCart({ items: [] }); } catch {}
  };

  const cartCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  // Use effectivePrice (discounted) for total — fall back to price if not set
  const cartTotal = cart?.items?.reduce((s, i) => {
    const ep = i.effectivePrice ?? i.price ?? i.product?.discountPrice ?? i.product?.price ?? 0;
    return s + ep * i.quantity;
  }, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateItem, removeItem, clearCart, cartCount, cartTotal, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
