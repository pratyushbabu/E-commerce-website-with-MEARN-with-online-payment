const Order = require('../models/Order');
const Product = require('../models/Product');
const { Cart, Notification, Payment, Offer } = require('../models/index');
const User = require('../models/User');

// Helper: calculate commission for an item
const calcCommission = (price, qty, commissionRate) => {
  if (!commissionRate || commissionRate <= 0) return 0;
  return Math.round((price * qty * commissionRate) / 100 * 100) / 100;
};

// Helper: find active approved offers for a seller's cart items
const getActiveOffers = async (sellerId, items, subtotal) => {
  const now = new Date();
  const offers = await Offer.find({
    seller: sellerId,
    isApproved: true,
    isActive: true,
    $or: [{ startDate: { $lte: now } }, { startDate: null }],
    $or: [{ endDate: { $gte: now } }, { endDate: null }],
  }).populate('applicableProducts', '_id');

  return offers;
};

// @POST /api/orders - Buyer places order
exports.placeOrder = async (req, res) => {
  const { shippingAddress, note, paymentMethod = 'COD', appliedOfferIds = [] } = req.body;
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' });

  if (!['COD', 'QR', 'Razorpay'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  const sellerMap = {};
  let totalMRP = 0;
  
  // 1. Initial items grouping and MRP calculation
  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isApproved) continue;
    if (product.stock < item.quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    }
    const seller = await User.findById(product.seller).select('isBlocked name shopName');
    if (seller?.isBlocked) {
      return res.status(403).json({ message: `Seller "${seller.shopName || seller.name}" is currently unavailable.` });
    }
    const sellerId = product.seller.toString();
    if (!sellerMap[sellerId]) sellerMap[sellerId] = { 
      seller: product.seller, 
      items: [], 
      subtotal: 0, 
      commissionTotal: 0, 
      sellerDiscountTotal: 0,
      adminDiscountTotal: 0
    };

    const mrp = product.price;
    const basePrice = (product.discountPrice && product.discountPrice < product.price) ? product.discountPrice : mrp;
    const prodDiscountAmount = mrp - basePrice;

    totalMRP += mrp * item.quantity;

    sellerMap[sellerId].items.push({
      product: product._id,
      seller: product.seller,
      name: product.name,
      image: product.images[0]?.url || '',
      price: basePrice, // INITIAL base price for offers
      originalPrice: mrp,
      quantity: item.quantity,
      category: product.category, // Added category
      uom: product.uom || 'pcs',
      unitQuantity: product.quantity || 1,
      commissionRate: product.commissionStatus === 'approved' ? product.commissionRate : 0,
      sellerDiscount: prodDiscountAmount * item.quantity,
      adminDiscount: 0,
    });
    sellerMap[sellerId].sellerDiscountTotal += prodDiscountAmount * item.quantity;
  }

  // 2. Apply Offers (Automatic Application)
  const now = new Date();
  const allActiveOffers = await Offer.find({
    isApproved: true,
    isActive: true,
    $or: [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
    ],
  }).populate('applicableProducts', '_id');

  const sellerOffers = allActiveOffers.filter(o => o.createdBy === 'seller');
  const adminOffers = allActiveOffers.filter(o => o.createdBy === 'admin');

  // Track applied offers for the order record
  const autoAppliedOfferIds = [];

  // Apply Seller Offers
  for (const sellerId in sellerMap) {
    const sub = sellerMap[sellerId];
    const sellerSpecificOffers = sellerOffers.filter(o => o.seller && o.seller.toString() === sellerId);
    
    for (const offer of sellerSpecificOffers) {
      let applied = false;
      if (offer.type === 'bill') {
        const subtotal = sub.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        if (subtotal >= offer.minBillAmount) {
          let discount = 0;
          if (offer.discountType === 'percent') discount = subtotal * offer.discountValue / 100;
          else if (offer.discountType === 'flat') discount = offer.discountValue;
          if (offer.maxDiscount > 0) discount = Math.min(discount, offer.maxDiscount);
          
          if (discount > 0) {
            sub.sellerDiscountTotal += discount;
            for (const item of sub.items) {
              const share = ( (item.price * item.quantity) / subtotal ) * discount;
              item.sellerDiscount += share;
            }
            applied = true;
          }
        }
      } else if (offer.type === 'item') {
        const productIds = offer.applicableProducts.map(p => p._id?.toString() || p.toString());
        const categories = offer.applicableCategories || [];

        const appItems = sub.items.filter(i => {
          // Standardized logic: Products override Categories
          if (productIds.length > 0) return productIds.includes(i.product.toString());
          if (categories.length > 0) return categories.includes(i.category);
          return true;
        });

        for (const item of appItems) {
          let itemDiscount = 0;
          if (offer.discountType === 'percent') itemDiscount = item.price * item.quantity * offer.discountValue / 100;
          else if (offer.discountType === 'flat') itemDiscount = offer.discountValue * item.quantity;
          else if (offer.discountType === 'buyXGetX' || offer.discountType === 'buyXGetYPercent' || offer.discountType === 'buyXGetYOff') {
            const sets = Math.floor(item.quantity / (offer.buyQuantity + offer.getQuantity));
            const freeQty = sets * offer.getQuantity;
            if (offer.discountType === 'buyXGetX') itemDiscount = freeQty * item.price;
            else if (offer.discountType === 'buyXGetYPercent') itemDiscount = freeQty * item.price * offer.discountValue / 100;
            else if (offer.discountType === 'buyXGetYOff') itemDiscount = freeQty * offer.discountValue;
          }
          if (itemDiscount > 0) {
            item.sellerDiscount += itemDiscount;
            sub.sellerDiscountTotal += itemDiscount;
            applied = true;
          }
        }
      }
      if (applied) autoAppliedOfferIds.push(offer._id);
    }
    // Update item prices after seller discount (this is the base for commission)
    sub.subtotal = 0;
    for (const item of sub.items) {
      item.price = Math.max(0, item.originalPrice - (item.sellerDiscount / item.quantity));
      sub.subtotal += item.price * item.quantity;
    }
  }

  // Apply Admin Offers
  const allSubOrdersItems = Object.values(sellerMap).flatMap(s => s.items);
  const totalSubtotalAfterSellerDiscount = Object.values(sellerMap).reduce((sum, s) => sum + s.subtotal, 0);

  for (const offer of adminOffers) {
    let applied = false;
    if (offer.type === 'bill') {
      if (totalSubtotalAfterSellerDiscount >= offer.minBillAmount) {
        let discount = 0;
        if (offer.discountType === 'percent') discount = totalSubtotalAfterSellerDiscount * offer.discountValue / 100;
        else if (offer.discountType === 'flat') discount = offer.discountValue;
        if (offer.maxDiscount > 0) discount = Math.min(discount, offer.maxDiscount);
        
        if (discount > 0) {
          for (const sellerId in sellerMap) {
            const sub = sellerMap[sellerId];
            const share = (sub.subtotal / totalSubtotalAfterSellerDiscount) * discount;
            sub.adminDiscountTotal += share;
            for (const item of sub.items) {
              const itemShare = ((item.price * item.quantity) / sub.subtotal) * share;
              item.adminDiscount += itemShare;
            }
          }
          applied = true;
        }
      }
    } else if (offer.type === 'item') {
      const productIds = offer.applicableProducts.map(p => p._id?.toString() || p.toString());
      const categories = offer.applicableCategories || [];

      const appItems = allSubOrdersItems.filter(i => {
        // Standardized logic: Products override Categories
        if (productIds.length > 0) return productIds.includes(i.product.toString());
        if (categories.length > 0) return categories.includes(i.category);
        return true;
      });

      for (const item of appItems) {
        let itemDiscount = 0;
        const currentPrice = item.price; // price after seller discount
        if (offer.discountType === 'percent') itemDiscount = currentPrice * item.quantity * offer.discountValue / 100;
        else if (offer.discountType === 'flat') itemDiscount = offer.discountValue * item.quantity;
        else if (offer.discountType === 'buyXGetX' || offer.discountType === 'buyXGetYPercent' || offer.discountType === 'buyXGetYOff') {
          const sets = Math.floor(item.quantity / (offer.buyQuantity + offer.getQuantity));
          const freeQty = sets * offer.getQuantity;
          if (offer.discountType === 'buyXGetX') itemDiscount = freeQty * currentPrice;
          else if (offer.discountType === 'buyXGetYPercent') itemDiscount = freeQty * currentPrice * offer.discountValue / 100;
          else if (offer.discountType === 'buyXGetYOff') itemDiscount = freeQty * offer.discountValue;
        }
        if (itemDiscount > 0) {
          item.adminDiscount += itemDiscount;
          const sub = Object.values(sellerMap).find(s => s.items.includes(item));
          if (sub) sub.adminDiscountTotal += itemDiscount;
          applied = true;
        }
      }
    }
    if (applied) autoAppliedOfferIds.push(offer._id);
  }


  let finalTotalAmount = 0;
  let finalTotalCommission = 0;
  let finalSellerDiscountTotal = 0;
  let finalAdminDiscountTotal = 0;

  for (const sellerId in sellerMap) {
    const sub = sellerMap[sellerId];
    // Recalculate commission based on subtotal (after seller discount)
    sub.commissionTotal = 0;
    const subtotalAfterSeller = sub.subtotal; // BEFORE admin discount
    
    for (const item of sub.items) {
      item.commissionAmount = calcCommission(item.price, item.quantity, item.commissionRate);
      sub.commissionTotal += item.commissionAmount;
      // Note: item.price already reflects price after seller discount. 
      // Admin discount is stored in item.adminDiscount and sub.adminDiscountTotal.
      // We do NOT subtract admin discount from item.price here to stay consistent with the schema comment:
      // "price: Number, // price after seller discount"
    }
    
    // sellerEarnings = subtotal after seller discount - commission
    sub.sellerEarnings = Math.round((subtotalAfterSeller - sub.commissionTotal) * 100) / 100;

    // subtotal in order model is final net subtotal for buyer (after admin discount)
    sub.subtotal = Math.max(0, subtotalAfterSeller - sub.adminDiscountTotal);

    finalTotalAmount += sub.subtotal;
    finalTotalCommission += sub.commissionTotal;
    finalSellerDiscountTotal += sub.sellerDiscountTotal;
    finalAdminDiscountTotal += sub.adminDiscountTotal;
  }

  const subOrders = Object.values(sellerMap);

  const order = await Order.create({
    buyer: req.user._id,
    subOrders,
    shippingAddress,
    paymentMethod,
    paymentStatus: paymentMethod === 'QR' ? 'awaiting_verification' : 'pending',
    totalAmount: Math.round(finalTotalAmount * 100) / 100,
    totalCommission: Math.round(finalTotalCommission * 100) / 100,
    sellerDiscountTotal: Math.round(finalSellerDiscountTotal * 100) / 100,
    adminDiscountTotal: Math.round(finalAdminDiscountTotal * 100) / 100,
    note,
    orderStatus: 'pending',
    appliedOffers: autoAppliedOfferIds,
  });

  // Update stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { stock: -item.quantity, soldCount: item.quantity },
    });
  }

  // Create payment record
  await Payment.create({
    order: order._id,
    buyer: req.user._id,
    amount: order.totalAmount,
    method: paymentMethod,
    status: paymentMethod === 'QR' ? 'awaiting_verification' : 'pending',
  });

  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  const io = req.app.get('io');
  for (const sub of subOrders) {
    if (paymentMethod !== 'QR' && paymentMethod !== 'Razorpay') {
      io.to(`user-${sub.seller}`).emit('new-order', { orderId: order._id, buyerName: req.user.name });
      await Notification.create({
        user: sub.seller,
        message: `New order received from ${req.user.name}`,
        type: 'order',
        link: `/seller/orders`,
      });
    }
  }
  // Admin is always notified
  io.to('admin-room').emit('new-order', { orderId: order._id, total: order.totalAmount, paymentMethod });
  io.to(`user-${req.user._id}`).emit('order-placed', { orderId: order._id });

  for (const item of cart.items) {
    const updated = await Product.findById(item.product._id);
    if (updated) io.emit('stock-update', { productId: updated._id, stock: updated.stock });
  }

  res.status(201).json({ success: true, order });
};

// @POST /api/orders/:id/qr-proof - Buyer submits QR payment proof
exports.submitQRProof = async (req, res) => {
  const { qrTransactionRef } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.buyer.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
  if (order.paymentMethod !== 'QR') return res.status(400).json({ message: 'Not a QR payment order' });

  let qrPaymentProof = '';
  let qrPaymentProofPublicId = '';
  if (req.file) {
    const cloudinary = require('../config/cloudinary');
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'mern-ecommerce/payment-proofs' });
    qrPaymentProof = result.secure_url;
    qrPaymentProofPublicId = result.public_id;
  }

  const payment = await Payment.findOneAndUpdate(
    { order: order._id },
    {
      qrTransactionRef: qrTransactionRef || '',
      qrPaymentProof,
      qrPaymentProofPublicId,
      status: 'awaiting_verification',
    },
    { new: true }
  );

  const io = req.app.get('io');
  io.to('admin-room').emit('qr-proof-submitted', { orderId: order._id, buyerName: req.user.name });

  await Notification.create({
    message: `QR payment proof submitted for Order #${order._id.toString().slice(-6).toUpperCase()}`,
    type: 'payment',
    forRole: 'admin',
    link: `/admin/payments`,
  });

  res.json({ success: true, payment });
};

// @GET /api/orders/my - Buyer's orders
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('subOrders.seller', 'name shopName')
    .populate('subOrders.items.product', 'name images');
  res.json({ success: true, orders });
};

// @GET /api/orders/:id
exports.getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer', 'name email phone')
    .populate('subOrders.seller', 'name shopName phone')
    .populate('subOrders.items.product', 'name images price')
    .populate('appliedOffers', 'title discountType discountValue createdBy');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const isBuyer = order.buyer._id.toString() === req.user._id.toString();
  const isSeller = order.subOrders.some(s => s.seller._id.toString() === req.user._id.toString());
  const isAdmin = req.user.role === 'admin';

  if (!isBuyer && !isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

  // Attach payment info for buyer/admin
  const payment = (isBuyer || isAdmin)
    ? await require('../models/index').Payment.findOne({ order: order._id })
    : null;

  res.json({ success: true, order, payment });
};

// @PUT /api/orders/:id/cancel - Buyer cancels order (only if not yet shipped)
exports.cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.buyer.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

  const nonCancellableStatuses = ['shipped', 'delivered', 'cancelled'];
  if (nonCancellableStatuses.includes(order.orderStatus)) {
    return res.status(400).json({ message: `Cannot cancel order that is already ${order.orderStatus}` });
  }

  // Check sub-order statuses — block if any suborder is shipped
  const hasShipped = order.subOrders.some(s => s.status === 'shipped' || s.status === 'delivered');
  if (hasShipped) {
    return res.status(400).json({ message: 'Cannot cancel: some items have already been shipped' });
  }

  order.orderStatus = 'cancelled';
  order.cancelReason = req.body.reason || 'Cancelled by buyer';
  for (const sub of order.subOrders) {
    sub.status = 'cancelled';
    sub.statusHistory.push({ status: 'cancelled', note: order.cancelReason });
  }
  await order.save();

  // Restore stock
  for (const sub of order.subOrders) {
    for (const item of sub.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, soldCount: -item.quantity },
      });
    }
  }

  // Handle payment/refund
  const payment = await Payment.findOne({ order: order._id });
  if (payment) {
    if ((payment.method === 'QR' || payment.method === 'Razorpay') && payment.status === 'completed') {
      payment.status = 'refunded';
      payment.refundReason = order.cancelReason;
      await payment.save();
    } else if (payment.method === 'COD') {
      payment.status = 'cancelled';
      await payment.save();
    } else {
      payment.status = 'cancelled';
      await payment.save();
    }
  }

  const io = req.app.get('io');
  for (const sub of order.subOrders) {
    io.to(`user-${sub.seller}`).emit('order-cancelled', { orderId: order._id, reason: order.cancelReason });
    await Notification.create({
      user: sub.seller,
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} cancelled by buyer: ${order.cancelReason}`,
      type: 'order',
      link: `/seller/orders`,
    });
  }
  io.to('admin-room').emit('order-cancelled', { orderId: order._id });

  res.json({ success: true, order });
};

// @POST /api/orders/:id/refund-details - Buyer submits refund account info (for QR cancelled orders)
exports.submitRefundDetails = async (req, res) => {
  const { upiId, mobileNumber, accountName } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.buyer.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

  const payment = await Payment.findOneAndUpdate(
    { order: order._id },
    { refundDetails: { upiId, mobileNumber, accountName } },
    { new: true }
  );

  const io = req.app.get('io');
  io.to('admin-room').emit('refund-details-submitted', { orderId: order._id, buyerName: req.user.name });

  await Notification.create({
    message: `Refund details submitted for Order #${order._id.toString().slice(-6).toUpperCase()}`,
    type: 'payment',
    forRole: 'admin',
    link: `/admin/payments`,
  });

  res.json({ success: true, payment });
};

// @PUT /api/orders/:id/status - Seller updates sub-order status
exports.updateSubOrderStatus = async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id).populate('subOrders.seller', '_id name');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const subOrder = order.subOrders.find(s => {
    const sellerId = s.seller._id ? s.seller._id.toString() : s.seller.toString();
    return sellerId === req.user._id.toString();
  });
  if (!subOrder) return res.status(403).json({ message: 'Not your order' });

  const allowed = ['packed', 'shipped'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Sellers can only set packed/shipped' });

  subOrder.status = status;
  subOrder.statusHistory.push({ status, note });

  const allStatuses = order.subOrders.map(s => s.status);
  if (allStatuses.every(s => s === 'delivered')) {
    order.orderStatus = 'delivered';
  } else if (allStatuses.some(s => s === 'shipped')) {
    order.orderStatus = 'shipped';
  } else if (allStatuses.every(s => s === 'packed')) {
    order.orderStatus = 'processing';
  }

  await order.save();

  const io = req.app.get('io');
  const orderStatus = order.orderStatus;

  io.to(`user-${order.buyer}`).emit('order-status-update', {
    orderId: order._id.toString(), status: orderStatus, subStatus: status, orderStatus, sellerName: req.user.name,
  });
  io.to('admin-room').emit('order-status-update', { orderId: order._id.toString(), status: orderStatus, orderStatus });

  await Notification.create({
    user: order.buyer,
    message: `Your order status updated to "${orderStatus}"`,
    type: 'order', forRole: 'buyer', link: `/orders/${order._id}`,
  });

  res.json({ success: true, order });
};

// @PUT /api/orders/:id/admin-status - Admin updates
exports.adminUpdateOrderStatus = async (req, res) => {
  const { status, cancelReason } = req.body;
  const order = await Order.findById(req.params.id).populate('subOrders.seller', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  order.orderStatus = status;

  if (status === 'cancelled' && cancelReason) {
    order.cancelReason = cancelReason;
    for (const sub of order.subOrders) {
      sub.status = 'cancelled';
      sub.statusHistory.push({ status: 'cancelled', note: cancelReason });
    }
    // Restore stock on admin cancel
    for (const sub of order.subOrders) {
      for (const item of sub.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity, soldCount: -item.quantity },
        });
      }
    }
    // Update payment status
    await Payment.findOneAndUpdate({ order: order._id }, { status: 'cancelled' });

    // Notify buyer of cancellation reason
    await Notification.create({
      user: order.buyer,
      message: `Your order #${order._id.toString().slice(-6).toUpperCase()} was cancelled. Reason: ${cancelReason}`,
      type: 'order', forRole: 'buyer', link: `/orders/${order._id}`,
    });
  }

  if (status === 'delivered') {
    order.deliveredAt = Date.now();
    order.paymentStatus = 'paid';

    await Payment.findOneAndUpdate({ order: order._id }, { status: 'completed' }, { new: true });

    for (const sub of order.subOrders) {
      sub.status = 'delivered';
      sub.statusHistory.push({ status: 'delivered', note: 'Marked delivered by admin' });
      // Use pre-calculated sellerEarnings
      await User.findByIdAndUpdate(sub.seller, { $inc: { totalEarnings: sub.sellerEarnings || 0 } });
    }
  }

  await order.save();

  const io = req.app.get('io');
  io.to(`user-${order.buyer}`).emit('order-status-update', {
    orderId: order._id.toString(), status, orderStatus: status, cancelReason: order.cancelReason,
  });
  for (const sub of order.subOrders) {
    io.to(`user-${sub.seller._id || sub.seller}`).emit('order-status-update', {
      orderId: order._id.toString(), status, orderStatus: status,
    });
  }
  io.to('admin-room').emit('order-status-update', { orderId: order._id.toString(), status, orderStatus: status });

  if (status !== 'cancelled') {
    await Notification.create({
      user: order.buyer,
      message: `Your order has been marked as "${status}"`,
      type: 'order', forRole: 'buyer', link: `/orders/${order._id}`,
    });
  }

  if (status === 'delivered') {
    for (const sub of order.subOrders) {
      const earnings = sub.sellerEarnings || (sub.subtotal - (sub.commissionTotal || 0));
      await Notification.create({
        user: sub.seller._id || sub.seller,
        message: `Order #${order._id.toString().slice(-6).toUpperCase()} delivered. ₹${earnings.toLocaleString()} added to earnings (commission: ₹${(sub.commissionTotal || 0).toLocaleString()}).`,
        type: 'payment', forRole: 'seller', link: `/seller/orders`,
      });
      io.to(`user-${sub.seller._id || sub.seller}`).emit('earnings-updated', {
        orderId: order._id.toString(), amount: earnings,
      });
    }
  }

  res.json({ success: true, order });
};

// @GET /api/orders/seller
exports.getSellerOrders = async (req, res) => {
  // REQUIREMENT 6: Only show QR orders if payment is NOT 'awaiting_verification'
  const orders = await Order.find({ 
    'subOrders.seller': req.user._id,
    $or: [
      { paymentMethod: 'COD' },
      { paymentMethod: 'QR', paymentStatus: { $nin: ['pending', 'awaiting_verification'] } },
      { paymentMethod: 'Razorpay', paymentStatus: 'paid' }
    ]
  })
    .sort({ createdAt: -1 })
    .populate('buyer', 'name email phone')
    .populate('subOrders.items.product', 'name images');

  const filtered = orders.map(o => ({
    ...o.toObject(),
    subOrders: o.subOrders.filter(s => s.seller.toString() === req.user._id.toString()),
  }));

  res.json({ success: true, orders: filtered });
};

// @GET /api/orders - Admin: all orders
exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = status ? { orderStatus: status } : {};
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('buyer', 'name email')
      .populate('subOrders.seller', 'name shopName'),
    Order.countDocuments(query),
  ]);
  res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
};
