import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5005/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const logout = () => API.post('/auth/logout');
export const getMe = () => API.get('/auth/me');
export const getSellers = () => API.get('/users/sellers');
export const updateProfile = (data) => API.put('/auth/profile', data);
export const changePassword = (data) => API.put('/auth/change-password', data);
export const forgotPassword = (data) => API.post('/auth/forgot-password', data);
export const resetPassword = (token, data) => API.post(`/auth/reset-password/${token}`, data);
export const addAddress = (data) => API.post('/auth/address', data);
export const deleteAddress = (id) => API.delete(`/auth/address/${id}`);

// Products
export const getProducts = (params) => API.get('/products', { params });
export const getProduct = (id) => API.get(`/products/${id}`);
export const getCategories = () => API.get('/products/categories');
export const createProduct = (data) => API.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateProduct = (id, data) => API.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const approveProduct = (id, data) => API.put(`/products/${id}/approve`, data);

// Cart
export const getCart = () => API.get('/cart');
export const addToCart = (data) => API.post('/cart', data);
export const updateCartItem = (itemId, data) => API.put(`/cart/${itemId}`, data);
export const removeFromCart = (itemId) => API.delete(`/cart/${itemId}`);
export const clearCart = () => API.delete('/cart');

// Orders
export const placeOrder = (data) => API.post('/orders', data);
export const getMyOrders = () => API.get('/orders/my');
export const getSellerOrders = () => API.get('/orders/seller');
export const getAllOrders = (params) => API.get('/orders', { params });
export const getOrder = (id) => API.get(`/orders/${id}`);
export const updateSubOrderStatus = (id, data) => API.put(`/orders/${id}/status`, data);
export const adminUpdateOrderStatus = (id, data) => API.put(`/orders/${id}/admin-status`, data);

// Reviews
export const getProductReviews = (productId) => API.get(`/reviews/${productId}`);
export const addReview = (productId, data) => API.post(`/reviews/${productId}`, data);
export const deleteReview = (id) => API.delete(`/reviews/${id}`);

// Wishlist
export const getWishlist = () => API.get('/wishlist');
export const toggleWishlist = (data) => API.post('/wishlist/toggle', data);

// Notifications
export const getNotifications = () => API.get('/notifications');
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put('/notifications/read-all');
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);
export const clearAllNotifications = () => API.delete('/notifications/clear-all');

// Live search
export const searchProducts = (q, limit = 8) => API.get('/products/search', { params: { q, limit } });

// Admin
export const getAdminDashboard = () => API.get('/admin/dashboard');
export const getAdminInsights = (params) => API.get('/admin/insights', { params });
export const getAllUsers = (params) => API.get('/admin/users', { params });
export const approveSeller = (id, data) => API.put(`/admin/users/${id}/approve`, data);
export const blockUser = (id, data) => API.put(`/admin/users/${id}/block`, data);
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);
export const getAdminProducts = (params) => API.get('/admin/products', { params });
export const getAdminPayments = () => API.get('/admin/payments');
export const refundPayment = (id, data) => API.put(`/admin/payments/${id}/refund`, data);
// Withdrawal management
export const getWithdrawalRequests = () => API.get('/admin/withdrawals');
export const getWithdrawalAnalysis = () => API.get('/admin/withdrawal-analysis');
export const processWithdrawal = (sellerId, requestId, data) => API.put(`/admin/withdrawals/${sellerId}/${requestId}`, data);

// Seller
export const getSellerDashboard = () => API.get('/seller/dashboard');
export const requestWithdrawal = (data) => API.post('/seller/withdrawal', data);

// Buyer
export const getBuyerDashboard = () => API.get('/auth/dashboard');

// Payments
export const getMyPayments = () => API.get('/payments/my');

export default API;

// QR Payment
export const submitQRProof = (orderId, data) => API.post(`/orders/${orderId}/qr-proof`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const submitRefundDetails = (orderId, data) => API.post(`/orders/${orderId}/refund-details`, data);
export const cancelOrder = (orderId, data) => API.put(`/orders/${orderId}/cancel`, data);

// Admin QR
export const getQRConfig = () => API.get('/admin/qr-config');
export const saveQRConfig = (data) => API.post('/admin/qr-config', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getPublicQRConfig = () => API.get('/payments/qr-config');
export const verifyQRPayment = (id, data) => API.put(`/admin/payments/${id}/verify-qr`, data);
export const processRefund = (id, data) => API.put(`/admin/payments/${id}/process-refund`, data);

// Commissions
export const getProductCommissions = (params) => API.get('/admin/commissions', { params });
export const approveCommission = (id, data) => API.put(`/admin/commissions/${id}`, data);

// Offers
export const createOffer = (data) => API.post('/offers', data);
export const getMyOffers = () => API.get('/offers/my');
export const updateOffer = (id, data) => API.put(`/offers/${id}`, data);
export const deleteOffer = (id) => API.delete(`/offers/${id}`);
export const getSellerActiveOffers = (sellerId) => API.get(`/offers/seller/${sellerId}`);
export const computeCartOffers = (data) => API.post('/offers/compute-cart', data);
export const getOfferSchedules = () => API.get('/offers/schedules');
export const getAdminOffers = (params) => API.get('/admin/offers', { params });
export const approveOffer = (id, data) => API.put(`/admin/offers/${id}/approve`, data);

// Offer Schedules (Admin)
export const getAdminOfferSchedules = () => API.get('/admin/offer-schedules');
export const createOfferSchedule = (data) => API.post('/admin/offer-schedules', data);
export const updateOfferSchedule = (id, data) => API.put(`/admin/offer-schedules/${id}`, data);
export const deleteOfferSchedule = (id) => API.delete(`/admin/offer-schedules/${id}`);

// Seller
export const updateBankDetails = (data) => API.put('/seller/bank-details', data);
