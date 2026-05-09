const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { Payment, Notification, Offer, OfferSchedule, QRConfig } = require('../models/index');
const cloudinary = require('../config/cloudinary');

// @GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  const [
    totalUsers, totalSellers, totalBuyers, totalProducts,
    totalOrders, pendingSellers, pendingProducts,
    revenueData, recentOrders, recentUsers,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'buyer' }),
    Product.countDocuments({ isApproved: true }),
    Order.countDocuments(),
    User.countDocuments({ role: 'seller', isApproved: false }),
    Product.countDocuments({ isApproved: false }),
    Order.aggregate([{ 
      $group: { 
        _id: null, 
        total: { $sum: '$totalAmount' }, 
        count: { $sum: 1 }, 
        commission: { $sum: '$totalCommission' },
        adminDiscounts: { $sum: '$adminDiscountTotal' }
      } 
    }]),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('buyer', 'name'),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
  ]);

  // CATEGORY DISTRIBUTION
  const categoryStats = await Product.aggregate([
    { $match: { isApproved: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const monthlyRevenue = await Order.aggregate([
    { $group: {
      _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
      revenue: { $sum: '$totalAmount' },
      commission: { $sum: { $subtract: ['$totalCommission', '$adminDiscountTotal'] } },
      orders: { $sum: 1 },
    }},
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  const sellersWithPendingWithdrawals = await User.find({
    role: 'seller',
    'withdrawalRequests': { $elemMatch: { status: 'pending' } },
  }).select('withdrawalRequests');
  const pendingWithdrawals = sellersWithPendingWithdrawals.reduce(
    (count, seller) => count + seller.withdrawalRequests.filter(w => w.status === 'pending').length, 0
  );

  const pendingQRPayments = await Payment.countDocuments({ method: 'QR', status: 'awaiting_verification' });
  const pendingCommissions = await Product.countDocuments({ commissionStatus: 'pending', isApproved: true });
  const pendingOffers = await Offer.countDocuments({ isApproved: false, isActive: true });
  const totalCommissionEarned = (revenueData[0]?.commission || 0) - (revenueData[0]?.adminDiscounts || 0);
  const aov = totalOrders > 0 ? (revenueData[0]?.total || 0) / totalOrders : 0;

  res.json({
    success: true,
    stats: {
      totalUsers, totalSellers, totalBuyers, totalProducts, totalOrders,
      pendingSellers, pendingProducts, pendingWithdrawals,
      totalRevenue: revenueData[0]?.total || 0,
      pendingQRPayments, pendingCommissions, pendingOffers, totalCommissionEarned,
      aov, categoryStats,
    },
    monthlyRevenue: monthlyRevenue.reverse(),
    recentOrders,
    recentUsers,
  });
};

// @GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  const { role, page = 1, limit = 20, search } = req.query;
  const query = { role: { $ne: 'admin' } };
  if (role) query.role = role;
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).select('-password').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);
  res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
};

exports.approveSeller = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id, { isApproved: req.body.approve !== false }, { new: true }
  ).select('-password');
  const io = req.app.get('io');
  io.to(`user-${user._id}`).emit('account-approved', { approved: user.isApproved });
  await Notification.create({
    user: user._id,
    message: user.isApproved
      ? 'Your seller account has been approved! You can now list products.'
      : 'Your seller account application was rejected.',
    type: 'system', link: '/seller/dashboard',
  });
  res.json({ success: true, user });
};

exports.blockUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id, { isBlocked: req.body.block !== false }, { new: true }
  ).select('-password');
  const io = req.app.get('io');
  io.to(`user-${user._id}`).emit('account-blocked', { blocked: user.isBlocked });
  if (user.role === 'seller') io.emit('seller-block-status', { sellerId: user._id.toString(), blocked: user.isBlocked });
  res.json({ success: true, user });
};

exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
};

exports.getAllProducts = async (req, res) => {
  const { isApproved, page = 1, limit = 20 } = req.query;
  const query = {};
  if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('seller', 'name shopName email'),
    Product.countDocuments(query),
  ]);
  res.json({ success: true, products, total, pages: Math.ceil(total / limit) });
};

// ─── PAYMENTS / QR VERIFICATION ───────────────────────────

exports.getAllPayments = async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const payments = await Payment.find(query).sort({ createdAt: -1 })
    .populate('buyer', 'name email')
    .populate('order', 'totalAmount orderStatus paymentMethod');
  res.json({ success: true, payments });
};

// Admin verifies QR payment → approves or rejects
exports.verifyQRPayment = async (req, res) => {
  const { action, note } = req.body; // action: 'approve' | 'reject'
  const payment = await Payment.findById(req.params.id).populate('order').populate('buyer', 'name email');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  if (payment.method !== 'QR') return res.status(400).json({ message: 'Not a QR payment' });

  const order = payment.order;

  if (action === 'approve') {
    payment.status = 'completed';
    payment.qrVerificationNote = note || '';
    order.paymentStatus = 'paid';
    order.orderStatus = 'processing';

    // Update each sub-order to processing
    for (const sub of order.subOrders) {
      if (sub.status === 'pending') {
        sub.status = 'pending'; // seller will move to packed/shipped
        sub.statusHistory.push({ status: 'pending', note: 'QR payment verified by admin' });
      }
    }
    await order.save();
    await payment.save();

    const io = req.app.get('io');
    io.to(`user-${payment.buyer._id}`).emit('order-status-update', {
      orderId: order._id.toString(), status: 'processing', orderStatus: 'processing',
    });
    io.to(`user-${payment.buyer._id}`).emit('payment-verified', { orderId: order._id, status: 'approved' });

    await Notification.create({
      user: payment.buyer._id,
      message: `Your QR payment for Order #${order._id.toString().slice(-6).toUpperCase()} has been verified. Order is now processing.`,
      type: 'payment', forRole: 'buyer', link: `/orders/${order._id}`,
    });

    // Notify sellers
    for (const sub of order.subOrders) {
      await Notification.create({
        user: sub.seller,
        message: `Payment verified for order from ${payment.buyer.name}. Please process the order.`,
        type: 'order', forRole: 'seller', link: `/seller/orders`,
      });
    }
  } else if (action === 'reject') {
    payment.status = 'failed';
    payment.qrVerificationNote = note || 'Payment verification failed';
    order.paymentStatus = 'pending';
    order.orderStatus = 'cancelled';
    order.cancelReason = `QR Payment verification failed: ${note || 'Payment could not be verified'}`;

    // Cancel sub-orders and restore stock
    for (const sub of order.subOrders) {
      sub.status = 'cancelled';
      sub.statusHistory.push({ status: 'cancelled', note: order.cancelReason });
      for (const item of sub.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity, soldCount: -item.quantity },
        });
      }
    }
    await order.save();
    await payment.save();

    const io = req.app.get('io');
    io.to(`user-${payment.buyer._id}`).emit('payment-verified', { orderId: order._id, status: 'rejected', reason: note });
    io.to(`user-${payment.buyer._id}`).emit('order-status-update', {
      orderId: order._id.toString(), status: 'cancelled', orderStatus: 'cancelled',
      cancelReason: order.cancelReason,
    });

    await Notification.create({
      user: payment.buyer._id,
      message: `Your QR payment verification failed for Order #${order._id.toString().slice(-6).toUpperCase()}. Reason: ${note || 'Could not verify payment'}. Order has been cancelled.`,
      type: 'payment', forRole: 'buyer', link: `/orders/${order._id}`,
    });
  }

  res.json({ success: true, payment, order });
};

// Admin processes refund: sends money and records details
exports.processRefund = async (req, res) => {
  const { refundPaymentDetails } = req.body;
  const payment = await Payment.findById(req.params.id).populate('buyer', 'name email');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  payment.status = 'refunded';
  payment.refundPaymentDetails = refundPaymentDetails || '';
  payment.refundAt = new Date();
  await payment.save();

  // Update order payment status
  await Order.findByIdAndUpdate(payment.order, { paymentStatus: 'refunded' });

  const io = req.app.get('io');
  io.to(`user-${payment.buyer._id}`).emit('payment-refunded', {
    paymentId: payment._id, amount: payment.amount, refundDetails: refundPaymentDetails,
  });

  await Notification.create({
    user: payment.buyer._id,
    message: `Your refund of ₹${payment.amount.toLocaleString()} has been processed. Details: ${refundPaymentDetails}`,
    type: 'payment', forRole: 'buyer', link: `/orders/${payment.order}`,
  });

  res.json({ success: true, payment });
};

// Legacy refund
exports.refundPayment = async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status: 'refunded', refundReason: req.body.reason },
    { new: true }
  );
  const io = req.app.get('io');
  io.to(`user-${payment.buyer}`).emit('payment-refunded', { paymentId: payment._id, amount: payment.amount });
  res.json({ success: true, payment });
};

// ─── QR CONFIG (Admin's payment QR) ──────────────────────

exports.getQRConfig = async (req, res) => {
  const config = await QRConfig.findOne({ isActive: true });
  res.json({ success: true, config: config || null });
};

exports.saveQRConfig = async (req, res) => {
  const { upiId, accountName, instructions } = req.body;
  let update = { upiId, accountName, instructions, isActive: true };

  if (req.file) {
    // Delete old QR image if exists
    const existing = await QRConfig.findOne({ isActive: true });
    if (existing?.qrImagePublicId) {
      await cloudinary.uploader.destroy(existing.qrImagePublicId);
    }
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'mern-ecommerce/qr-codes' });
    update.qrImageUrl = result.secure_url;
    update.qrImagePublicId = result.public_id;
  }

  const config = await QRConfig.findOneAndUpdate({ isActive: true }, update, { new: true, upsert: true });
  res.json({ success: true, config });
};

// ─── COMMISSIONS ──────────────────────────────────────────

exports.getProductCommissions = async (req, res) => {
  const { status = 'pending' } = req.query;
  const query = { isApproved: true };
  if (status !== 'all') query.commissionStatus = status;
  const products = await Product.find(query)
    .populate('seller', 'name shopName email')
    .sort({ updatedAt: -1 });
  res.json({ success: true, products });
};

exports.approveCommission = async (req, res) => {
  const { action, note } = req.body; // action: 'approve' | 'reject'
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      commissionStatus: action === 'approve' ? 'approved' : 'rejected',
      commissionNote: note || '',
    },
    { new: true }
  ).populate('seller', 'name');

  const io = req.app.get('io');
  io.to(`user-${product.seller._id}`).emit('commission-updated', {
    productId: product._id, status: product.commissionStatus, rate: product.commissionRate,
  });

  await Notification.create({
    user: product.seller._id,
    message: action === 'approve'
      ? `Commission rate of ${product.commissionRate}% for "${product.name}" has been approved.`
      : `Commission rate for "${product.name}" was rejected. ${note ? 'Reason: ' + note : ''}`,
    type: 'commission', forRole: 'seller', link: `/seller/products`,
  });

  res.json({ success: true, product });
};

// ─── WITHDRAWALS ─────────────────────────────────────────

exports.getWithdrawalRequests = async (req, res) => {
  const sellers = await User.find({
    role: 'seller',
    'withdrawalRequests.0': { $exists: true },
  }).select('name email shopName totalEarnings withdrawalRequests bankDetails');

  const requests = [];
  for (const seller of sellers) {
    for (const wr of seller.withdrawalRequests) {
      requests.push({
        _id: wr._id,
        sellerId: seller._id,
        sellerName: seller.name,
        sellerEmail: seller.email,
        shopName: seller.shopName,
        totalEarnings: seller.totalEarnings,
        bankDetails: seller.bankDetails,
        amount: wr.amount,
        status: wr.status,
        requestedAt: wr.requestedAt,
        paymentDetails: wr.paymentDetails,
        processedAt: wr.processedAt,
        processedNote: wr.processedNote,
      });
    }
  }
  requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  res.json({ success: true, requests });
};

exports.processWithdrawal = async (req, res) => {
  const { sellerId, requestId } = req.params;
  const { action, paymentDetails } = req.body;

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ message: 'Action must be approved or rejected' });
  }

  const seller = await User.findById(sellerId);
  if (!seller) return res.status(404).json({ message: 'Seller not found' });

  const wr = seller.withdrawalRequests.id(requestId);
  if (!wr) return res.status(404).json({ message: 'Withdrawal request not found' });
  if (wr.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

  wr.status = action;
  wr.processedAt = new Date();
  wr.paymentDetails = paymentDetails || '';

  if (action === 'approved') {
    // BUG FIX: Ensure seller has bank or UPI details before approving
    const hasBank = seller.bankDetails?.accountNumber && seller.bankDetails?.ifsc;
    const hasUPI = seller.bankDetails?.upiId;
    if (!hasBank && !hasUPI) {
      return res.status(400).json({ message: 'Seller has not provided bank or UPI details. Cannot approve withdrawal.' });
    }

    if (seller.totalEarnings < wr.amount) {
      return res.status(400).json({ message: 'Insufficient earnings' });
    }
    seller.totalEarnings -= wr.amount;
  }

  await seller.save();

  const io = req.app.get('io');
  io.to(`user-${seller._id}`).emit('withdrawal-processed', { requestId, action, amount: wr.amount, paymentDetails });

  await Notification.create({
    user: seller._id,
    message: action === 'approved'
      ? `Your withdrawal of ₹${wr.amount.toLocaleString()} has been approved and sent. ${paymentDetails ? 'Details: ' + paymentDetails : ''} Remaining balance: ₹${seller.totalEarnings.toLocaleString()}`
      : `Your withdrawal request of ₹${wr.amount.toLocaleString()} was rejected.`,
    type: 'withdrawal', forRole: 'seller', link: '/seller/dashboard',
  });

  res.json({ success: true, action, sellerId, requestId, updatedStatus: action });
};

// ─── WITHDRAWAL ANALYSIS ─────────────────────────────────

exports.getWithdrawalAnalysis = async (req, res) => {
  const sellers = await User.find({ role: 'seller' }).select('withdrawalRequests');
  let totalRequests = 0, approved = 0, rejected = 0, pending = 0, totalAmount = 0;
  const dailyData = {};

  for (const s of sellers) {
    for (const wr of s.withdrawalRequests) {
      totalRequests++;
      if (wr.status === 'approved') { approved++; totalAmount += wr.amount; }
      else if (wr.status === 'rejected') rejected++;
      else pending++;

      const date = new Date(wr.requestedAt).toLocaleDateString();
      if (!dailyData[date]) dailyData[date] = { date, count: 0, amount: 0 };
      dailyData[date].count++;
      if (wr.status === 'approved') dailyData[date].amount += wr.amount;
    }
  }

  const analysis = {
    stats: { totalRequests, approved, rejected, pending, totalAmount, successRate: totalRequests ? ((approved / (approved + rejected)) * 100).toFixed(1) : 0 },
    chartData: Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-15),
  };

  res.json({ success: true, analysis });
};


// ─── OFFERS ───────────────────────────────────────────────

exports.getAllOffers = async (req, res) => {
  const { isApproved } = req.query;
  const query = {};
  if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  const offers = await Offer.find(query).sort({ createdAt: -1 })
    .populate('seller', 'name shopName')
    .populate('applicableProducts', 'name');
  res.json({ success: true, offers });
};

exports.approveOffer = async (req, res) => {
  const { action, note } = req.body;
  const offer = await Offer.findByIdAndUpdate(
    req.params.id,
    { isApproved: action === 'approve', approvalNote: note || '' },
    { new: true }
  ).populate('seller', 'name');

  const io = req.app.get('io');
  io.to(`user-${offer.seller._id}`).emit('offer-status-updated', {
    offerId: offer._id, status: offer.isApproved ? 'approved' : 'rejected',
  });

  await Notification.create({
    user: offer.seller._id,
    message: offer.isApproved
      ? `Your offer "${offer.title}" has been approved and is now active.`
      : `Your offer "${offer.title}" was rejected. ${note ? 'Reason: ' + note : ''}`,
    type: 'offer', forRole: 'seller', link: '/seller/dashboard',
  });

  res.json({ success: true, offer });
};

// ─── OFFER SCHEDULES ─────────────────────────────────────

exports.getOfferSchedules = async (req, res) => {
  const schedules = await OfferSchedule.find({ isActive: true }).sort({ startDate: 1 });
  res.json({ success: true, schedules });
};

exports.createOfferSchedule = async (req, res) => {
  const schedule = await OfferSchedule.create(req.body);
  const io = req.app.get('io');
  io.emit('new-offer-schedule', { schedule });
  res.status(201).json({ success: true, schedule });
};

exports.updateOfferSchedule = async (req, res) => {
  const schedule = await OfferSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, schedule });
};

exports.deleteOfferSchedule = async (req, res) => {
  await OfferSchedule.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

// ─── SELLER STATS ─────────────────────────────────────────

exports.getSellerStats = async (req, res) => {
  const sellerId = req.params.id;
  const [productCount, orders] = await Promise.all([
    Product.countDocuments({ seller: sellerId }),
    Order.find({ 'subOrders.seller': sellerId }),
  ]);
  let earnings = 0, commission = 0;
  for (const order of orders) {
    const sub = order.subOrders.find(s => s.seller.toString() === sellerId);
    if (sub) { 
      earnings += (sub.sellerEarnings || 0) + (sub.commissionTotal || 0); // Gross sales
      commission += sub.commissionTotal || 0; 
    }
  }
  res.json({ success: true, stats: { productCount, orderCount: orders.length, earnings, commission } });
};

// ─── ADVANCED INSIGHTS ────────────────────────────────────

exports.getInsights = async (req, res) => {
  const { startDate, endDate, sellerId, category } = req.query;
  const query = {};
  
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  // 1. Sales over time (Daily/Weekly/Monthly)
  const salesOverTime = await Order.aggregate([
    { $match: query },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      revenue: { $sum: '$totalAmount' },
      commission: { $sum: '$totalCommission' },
      orders: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);

  // 2. Performance by Category
  const categoryPerformance = await Order.aggregate([
    { $match: query },
    { $unwind: '$subOrders' },
    { $unwind: '$subOrders.items' },
    { $group: {
      _id: '$subOrders.items.category',
      revenue: { $sum: { $multiply: ['$subOrders.items.price', '$subOrders.items.quantity'] } },
      quantity: { $sum: '$subOrders.items.quantity' },
    }},
    { $sort: { revenue: -1 } },
  ]);

  // 3. Performance by Seller
  const sellerPerformance = await Order.aggregate([
    { $match: query },
    { $unwind: '$subOrders' },
    { $group: {
      _id: '$subOrders.seller',
      revenue: { $sum: '$subOrders.subtotal' },
      commission: { $sum: '$subOrders.commissionTotal' },
      orders: { $sum: 1 },
    }},
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'sellerInfo' } },
    { $unwind: '$sellerInfo' },
    { $project: { shopName: '$sellerInfo.shopName', name: '$sellerInfo.name', revenue: 1, commission: 1, orders: 1 } },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  // 4. Payment Method Distribution
  const paymentDistribution = await Order.aggregate([
    { $match: query },
    { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }
  ]);

  res.json({
    success: true,
    insights: {
      salesOverTime,
      categoryPerformance,
      sellerPerformance,
      paymentDistribution,
    }
  });
};
