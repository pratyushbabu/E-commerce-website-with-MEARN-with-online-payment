const { Cart, Review, Wishlist, Notification, Payment, Offer } = require('../models/index');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// ─── CART ────────────────────────────────────────────────

exports.getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'name price discountPrice images stock isApproved seller quantity uom category brand',
      populate: { path: 'seller', select: 'name shopName isBlocked' },
    });

  if (!cart) return res.json({ success: true, cart: { items: [] } });

  // Annotate each item with sellerBlocked flag
  const annotatedItems = (cart.items || []).map(item => {
    const obj = item.toObject ? item.toObject() : item;
    const sellerBlocked = obj.product?.seller?.isBlocked === true;
    return { ...obj, sellerBlocked };
  });

  res.json({ success: true, cart: { ...cart.toObject(), items: annotatedItems } });
};

exports.addToCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = await Product.findById(productId).populate('seller', 'isBlocked name');
  if (!product || !product.isApproved) return res.status(404).json({ message: 'Product not found' });
  if (product.seller?.isBlocked) return res.status(403).json({ message: 'This seller is currently unavailable' });
  if (product.stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });

  // Use discounted price if valid discount exists (product-level)
  const effectivePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price)
    ? product.discountPrice
    : product.price;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const idx = cart.items.findIndex(i => i.product.toString() === productId);
  if (idx > -1) {
    cart.items[idx].quantity = Math.min(cart.items[idx].quantity + quantity, product.stock);
    cart.items[idx].effectivePrice = effectivePrice;
    cart.items[idx].price = product.price;
  } else {
    cart.items.push({ product: productId, quantity, price: product.price, effectivePrice });
  }
  await cart.save();
  const populated = await cart.populate({
    path: 'items.product',
    select: 'name price discountPrice images stock isApproved seller quantity uom category brand',
    populate: { path: 'seller', select: 'name shopName isBlocked' },
  });
  res.json({ success: true, cart: populated });
};

exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  const item = cart.items.find(i => i._id.toString() === req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (quantity <= 0) {
    cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
  } else {
    item.quantity = quantity;
  }
  await cart.save();
  const populated = await cart.populate('items.product', 'name price discountPrice images stock quantity uom');
  res.json({ success: true, cart: populated });
};

exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { items: { _id: req.params.itemId } } },
    { new: true }
  ).populate('items.product', 'name price discountPrice images stock quantity uom');
  res.json({ success: true, cart });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ success: true, message: 'Cart cleared' });
};

// ─── REVIEWS ─────────────────────────────────────────────

exports.addReview = async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.productId;

  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) return res.status(400).json({ message: 'Already reviewed this product' });

  const review = await Review.create({ user: req.user._id, product: productId, rating, comment });

  const reviews = await Review.find({ product: productId });
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await Product.findByIdAndUpdate(productId, { ratings: avgRating, numReviews: reviews.length });

  const io = req.app.get('io');
  io.emit('new-review', { productId, rating: avgRating, numReviews: reviews.length });

  await review.populate('user', 'name avatar');
  res.status(201).json({ success: true, review });
};

exports.getProductReviews = async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
  res.json({ success: true, reviews });
};

exports.deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  await review.deleteOne();
  const reviews = await Review.find({ product: review.product });
  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  await Product.findByIdAndUpdate(review.product, { ratings: avgRating, numReviews: reviews.length });
  res.json({ success: true, message: 'Review deleted' });
};

// ─── WISHLIST ─────────────────────────────────────────────

exports.getWishlist = async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products', 'name price images ratings');
  res.json({ success: true, wishlist: wishlist || { products: [] } });
};

exports.toggleWishlist = async (req, res) => {
  const { productId } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });

  const idx = wishlist.products.indexOf(productId);
  let added;
  if (idx > -1) { wishlist.products.splice(idx, 1); added = false; }
  else { wishlist.products.push(productId); added = true; }

  await wishlist.save();
  res.json({ success: true, added, wishlist });
};

// ─── NOTIFICATIONS ───────────────────────────────────────

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, notifications });
};

exports.markNotificationRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
};

// NEW: delete single notification
exports.deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
};

// NEW: clear all notifications
exports.clearAllNotifications = async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ success: true });
};

// ─── SELLER ───────────────────────────────────────────────

// ─── BUYER DASHBOARD ─────────────────────────────────────

exports.getBuyerDashboard = async (req, res) => {
  const buyerId = req.user._id;
  const [orders, wishlist, cart] = await Promise.all([
    Order.find({ buyer: buyerId }),
    Wishlist.findOne({ user: buyerId }),
    Cart.findOne({ user: buyerId }),
  ]);

  let totalSpent = 0;
  const spendingByCategory = {};
  const monthlySpending = {};

  for (const order of orders) {
    if (order.orderStatus !== 'cancelled') {
      totalSpent += order.totalAmount;
      const month = new Date(order.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlySpending[month] = (monthlySpending[month] || 0) + order.totalAmount;

      for (const sub of order.subOrders) {
        for (const item of sub.items) {
          // Note: category isn't in Order.items by default, we'd need to populate or store it.
          // For now let's just use placeholder or aggregate if possible.
        }
      }
    }
  }

  res.json({
    success: true,
    stats: {
      totalOrders: orders.length,
      totalSpent,
      wishlistCount: wishlist?.products?.length || 0,
      cartCount: cart?.items?.length || 0,
      activeOrders: orders.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus)).length,
      deliveredOrders: orders.filter(o => o.orderStatus === 'delivered').length,
    },
    monthlySpending: Object.entries(monthlySpending).map(([month, amount]) => ({ month, amount })),
    recentOrders: orders.sort((a,b) => b.createdAt - a.createdAt).slice(0, 5),
  });
};

exports.getSellerDashboard = async (req, res) => {
  const sellerId = req.user._id;
  const [products, orders, user] = await Promise.all([
    Product.find({ seller: sellerId }),
    Order.find({ 'subOrders.seller': sellerId }).populate('buyer', 'name'),
    User.findById(sellerId).select('totalEarnings withdrawalRequests'),
  ]);

  let lifetimeEarnings = 0, totalSales = 0, totalCommission = 0;
  const salesData = {};
  const orderStatusStats = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };

  for (const order of orders) {
    const sub = order.subOrders.find(s => s.seller.toString() === sellerId.toString());
    if (sub) {
      if (order.orderStatus === 'delivered') {
        lifetimeEarnings += (sub.sellerEarnings || 0);
      }
      totalCommission += (sub.commissionTotal || 0);
      totalSales += (sub.sellerEarnings || 0) + (sub.commissionTotal || 0);
      orderStatusStats[sub.status] = (orderStatusStats[sub.status] || 0) + 1;

      const month = new Date(order.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!salesData[month]) salesData[month] = { revenue: 0, commission: 0 };
      salesData[month].revenue += (sub.sellerEarnings || 0) + (sub.commissionTotal || 0);
      salesData[month].commission += (sub.commissionTotal || 0);
    }
  }

  // Stock alerts: products with stock < 5
  const stockAlerts = products.filter(p => p.stock < 5).length;

  res.json({
    success: true,
    stats: {
      totalProducts: products.length,
      approvedProducts: products.filter(p => p.isApproved).length,
      pendingProducts: products.filter(p => !p.isApproved).length,
      totalOrders: orders.length,
      totalEarnings: user.totalEarnings, // Available balance for withdrawal
      lifetimeEarnings,
      totalSales,
      totalCommission,
      stockAlerts,
      orderStatusStats,
    },
    withdrawalRequests: user.withdrawalRequests.sort((a,b) => b.requestedAt - a.requestedAt),
    salesData: Object.entries(salesData).map(([month, d]) => ({ month, ...d })),
    recentOrders: orders.sort((a,b) => b.createdAt - a.createdAt).slice(0, 5),
  });
};

exports.requestWithdrawal = async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.user._id);
  if (amount > user.totalEarnings) return res.status(400).json({ message: 'Insufficient earnings' });
  user.withdrawalRequests.push({ amount });
  await user.save();
  const io = req.app.get('io');
  io.to('admin-room').emit('withdrawal-request', { sellerId: user._id, sellerName: user.name, amount });
  res.json({ success: true, message: 'Withdrawal request submitted' });
};

// ─── PAYMENTS ─────────────────────────────────────────────

exports.getMyPayments = async (req, res) => {
  const payments = await Payment.find({ buyer: req.user._id })
    .populate('order', 'totalAmount orderStatus createdAt')
    .sort({ createdAt: -1 });
  res.json({ success: true, payments });
};

// ─── SELLER BANK DETAILS ──────────────────────────────────

exports.updateBankDetails = async (req, res) => {
  const { accountNumber, ifsc, holderName, upiId, mobileNumber } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { bankDetails: { accountNumber, ifsc, holderName, upiId, mobileNumber } },
    { new: true }
  ).select('-password');
  res.json({ success: true, user });
};

exports.getSellerOfferStats = async (req, res) => {
  const { Offer } = require('../models/index');
  const offers = await Offer.find({ seller: req.user._id }).populate('applicableProducts', 'name');
  res.json({ success: true, offers });
};
