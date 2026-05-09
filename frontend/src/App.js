import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Buyer Pages
import Home from './pages/buyer/Home';
import Products from './pages/buyer/Products';
import ProductDetail from './pages/buyer/ProductDetail';
import Cart from './pages/buyer/Cart';
import Checkout from './pages/buyer/Checkout';
import Orders from './pages/buyer/Orders';
import OrderDetail from './pages/buyer/OrderDetail';
import Wishlist from './pages/buyer/Wishlist';
import Profile from './pages/buyer/Profile';

// Seller Pages
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProducts from './pages/seller/SellerProducts';
import SellerOrders from './pages/seller/SellerOrders';
import AddProduct from './pages/seller/AddProduct';
import EditProduct from './pages/seller/EditProduct';
import SellerOffers from './pages/seller/SellerOffers';
import SellerBankDetails from './pages/seller/SellerBankDetails';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminInsights from './pages/admin/AdminInsights';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPayments from './pages/admin/AdminPayments';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminQRConfig from './pages/admin/AdminQRConfig';
import AdminCommissions from './pages/admin/AdminCommissions';
import AdminOffers from './pages/admin/AdminOffers';

// Layout
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import Footer from './components/common/Footer';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'seller') return <Navigate to="/seller/dashboard" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

const BuyerLayout = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Navbar />
    <main style={{ flex: 1, paddingTop: '70px' }}>{children}</main>
    <Footer />
  </div>
);

const DashboardLayout = ({ children, role }) => (
  <div className="dashboard-layout">
    <Sidebar role={role} />
    <div className="main-content">{children}</div>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Buyer */}
      <Route path="/" element={<BuyerLayout><Home /></BuyerLayout>} />
      <Route path="/products" element={<BuyerLayout><Products /></BuyerLayout>} />
      <Route path="/products/:id" element={<BuyerLayout><ProductDetail /></BuyerLayout>} />
      <Route path="/cart" element={<ProtectedRoute roles={['buyer']}><BuyerLayout><Cart /></BuyerLayout></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute roles={['buyer']}><BuyerLayout><Checkout /></BuyerLayout></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute roles={['buyer']}><BuyerLayout><Orders /></BuyerLayout></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute roles={['buyer']}><BuyerLayout><OrderDetail /></BuyerLayout></ProtectedRoute>} />
      <Route path="/wishlist" element={<ProtectedRoute roles={['buyer']}><BuyerLayout><Wishlist /></BuyerLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute roles={['buyer']}><BuyerLayout><Profile /></BuyerLayout></ProtectedRoute>} />

      {/* Seller */}
      <Route path="/seller/dashboard" element={<ProtectedRoute roles={['seller']}><DashboardLayout role="seller"><SellerDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/products" element={<ProtectedRoute roles={['seller']}><DashboardLayout role="seller"><SellerProducts /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/products/add" element={<ProtectedRoute roles={['seller']}><DashboardLayout role="seller"><AddProduct /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/products/edit/:id" element={<ProtectedRoute roles={['seller']}><DashboardLayout role="seller"><EditProduct /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/orders" element={<ProtectedRoute roles={['seller']}><DashboardLayout role="seller"><SellerOrders /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/offers" element={<ProtectedRoute roles={['seller']}><DashboardLayout role="seller"><SellerOffers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/bank-details" element={<ProtectedRoute roles={['seller']}><DashboardLayout role="seller"><SellerBankDetails /></DashboardLayout></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/insights" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminInsights /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminUsers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminProducts /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminOrders /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminPayments /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminWithdrawals /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/qr-config" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminQRConfig /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/commissions" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminCommissions /></DashboardLayout></ProtectedRoute>} />
      <Route path="/admin/offers" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin"><AdminOffers /></DashboardLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <SocketProvider>
            <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
            <AppRoutes />
          </SocketProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
