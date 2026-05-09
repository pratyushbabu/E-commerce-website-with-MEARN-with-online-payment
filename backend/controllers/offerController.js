const { Offer, OfferSchedule, Notification } = require('../models/index');
const Product = require('../models/Product');

// Seller or Admin creates an offer
exports.createOffer = async (req, res) => {
  const { 
    title, description, type, discountType, discountValue, 
    buyQuantity, getQuantity,
    applicableProducts, applicableCategories, minBillAmount, maxDiscount, startDate, endDate 
  } = req.body;

  const createdBy = req.user.role === 'admin' ? 'admin' : 'seller';

  // Validate products belong to this seller if not admin
  if (createdBy === 'seller' && applicableProducts && applicableProducts.length > 0) {
    const products = await Product.find({ _id: { $in: applicableProducts }, seller: req.user._id });
    if (products.length !== applicableProducts.length) {
      return res.status(403).json({ message: 'Some products do not belong to you' });
    }
  }

  const offer = await Offer.create({
    seller: createdBy === 'seller' ? req.user._id : null,
    createdBy,
    title, description, type, discountType, 
    discountValue: discountValue || 0,
    buyQuantity: buyQuantity || 0,
    getQuantity: getQuantity || 0,
    applicableProducts: applicableProducts || [],
    applicableCategories: applicableCategories || [],
    minBillAmount: minBillAmount || 0,
    maxDiscount: maxDiscount || 0,
    startDate: startDate || null,
    endDate: endDate || null,
    isApproved: createdBy === 'admin', // Admin offers auto-approved
  });

  // Notify admin if created by seller
  if (createdBy === 'seller') {
    const io = req.app.get('io');
    io.to('admin-room').emit('new-offer-pending', { offerId: offer._id, sellerName: req.user.name, title });
  }

  res.status(201).json({ success: true, offer });
};

// Seller gets their offers
exports.getMyOffers = async (req, res) => {
  const offers = await Offer.find({ seller: req.user._id })
    .sort({ createdAt: -1 })
    .populate('applicableProducts', 'name price images');
  res.json({ success: true, offers });
};

// Seller updates an offer (reset approval)
exports.updateOffer = async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id });
  if (!offer) return res.status(404).json({ message: 'Offer not found' });

  // If seller is editing
  if (req.user.role === 'seller') {
    if (!offer.seller || offer.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this offer' });
    }
    // Sellers can edit their own offers
    Object.assign(offer, req.body);
    offer.isApproved = false; // Reset approval after seller edit
    offer.approvalNote = '';
  } 
  // If admin is editing
  else if (req.user.role === 'admin') {
    if (offer.createdBy === 'seller') {
      // REQUIREMENT 2: Admin cannot edit seller created offers
      // They can only approve/reject via approveOffer route
      return res.status(403).json({ message: 'Admin cannot edit offers created by sellers' });
    }
    // Admin can edit their own offers
    Object.assign(offer, req.body);
  } else {
    return res.status(403).json({ message: 'Not authorized' });
  }

  await offer.save();
  res.json({ success: true, offer });
};

// Seller deletes an offer
exports.deleteOffer = async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) return res.status(404).json({ message: 'Offer not found' });
  
  if (req.user.role !== 'admin' && (!offer.seller || offer.seller.toString() !== req.user._id.toString())) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  await offer.deleteOne();
  res.json({ success: true });
};

// Public: Get active approved offers for a seller or all (used in buyer cart/product view)
exports.getSellerActiveOffers = async (req, res) => {
  const { sellerId } = req.params;
  const now = new Date();
  
  const query = {
    isApproved: true,
    isActive: true,
    $or: [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
    ],
  };

  if (sellerId && sellerId !== 'all') {
    query.$or = [{ seller: sellerId }, { createdBy: 'admin' }];
  }

  const offers = await Offer.find(query)
    .populate('seller', 'name shopName')
    .populate('applicableProducts', 'name price images');
    
  res.json({ success: true, offers });
};

// Public: Get all active offer schedules (visible to all)
exports.getOfferSchedules = async (req, res) => {
  const now = new Date();
  const schedules = await OfferSchedule.find({
    isActive: true,
    endDate: { $gte: now },
  }).sort({ startDate: 1 });
  res.json({ success: true, schedules });
};

// Helper to calculate offer discount
const calculateDiscount = (offer, items, subtotal) => {
  let discount = 0;
  const itemDiscounts = {}; // productId -> discountAmount

  if (offer.type === 'bill') {
    if (subtotal >= (offer.minBillAmount || 0)) {
      if (offer.discountType === 'percent') {
        discount = subtotal * (offer.discountValue || 0) / 100;
      } else if (offer.discountType === 'flat') {
        discount = offer.discountValue || 0;
      }
      if (offer.maxDiscount > 0) discount = Math.min(discount, offer.maxDiscount);

      // Distribute bill discount proportionally to items
      if (discount > 0 && subtotal > 0) {
        items.forEach(item => {
          const pid = item.productId || item.product?._id?.toString() || item.product?.toString();
          const share = ((item.price * item.quantity) / subtotal) * discount;
          itemDiscounts[pid] = (itemDiscounts[pid] || 0) + share;
        });
      }
    }
  } else if (offer.type === 'item') {
    const productIds = offer.applicableProducts.map(p => p._id?.toString() || p.toString());
    const categories = offer.applicableCategories || [];

    const appItems = items.filter(i => {
      const pid = i.productId || i.product?._id?.toString() || i.product?.toString();
      const pcat = i.category || i.product?.category;
      
      // Standardized logic: Products override Categories
      if (productIds.length > 0) return productIds.includes(pid);
      if (categories.length > 0) return categories.includes(pcat);
      return true;
    });

    let totalItemDiscount = 0;
    for (const item of appItems) {
      const pid = item.productId || item.product?._id?.toString() || item.product?.toString();
      const price = item.price || item.product?.price || 0;
      const quantity = item.quantity || 1;
      let d = 0;

      if (offer.discountType === 'percent') {
        d = price * quantity * (offer.discountValue || 0) / 100;
      } else if (offer.discountType === 'flat') {
        d = (offer.discountValue || 0) * quantity;
      } else if (offer.discountType === 'buyXGetX' || offer.discountType === 'buyXGetYPercent' || offer.discountType === 'buyXGetYOff') {
        const sets = Math.floor(quantity / (offer.buyQuantity + offer.getQuantity));
        const freeQty = sets * offer.getQuantity;
        if (offer.discountType === 'buyXGetX') d = freeQty * price;
        else if (offer.discountType === 'buyXGetYPercent') d = freeQty * price * (offer.discountValue || 0) / 100;
        else if (offer.discountType === 'buyXGetYOff') d = freeQty * (offer.discountValue || 0);
      }
      totalItemDiscount += d;
      itemDiscounts[pid] = (itemDiscounts[pid] || 0) + d;
    }

    if (offer.maxDiscount > 0 && totalItemDiscount > offer.maxDiscount) {
      const ratio = offer.maxDiscount / totalItemDiscount;
      discount = offer.maxDiscount;
      Object.keys(itemDiscounts).forEach(pid => {
        itemDiscounts[pid] *= ratio;
      });
    } else {
      discount = totalItemDiscount;
    }
  }
  return { total: Math.round(discount * 100) / 100, itemDiscounts };
};

// Compute applicable offer discount for a cart (called from cart logic)
exports.computeCartOffers = async (req, res) => {
  const { items } = req.body;
  if (!items || !items.length) return res.json({ success: true, offers: [], totalDiscount: 0, itemDiscounts: {}, suggestions: [] });

  const now = new Date();
  const sellerIds = [...new Set(items.map(i => i.sellerId))];

  let totalSellerDiscount = 0;
  let totalAdminDiscount = 0;
  const appliedOffers = [];
  const suggestions = [];
  const cumulativeItemDiscounts = {}; // productId -> total discount from all offers

  // 1. Get Admin offers
  const adminOffers = await Offer.find({
    createdBy: 'admin',
    isApproved: true,
    isActive: true,
    $or: [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
    ],
  }).populate('applicableProducts', '_id');

  // 2. Process each seller's items
  // Standardized logic: Seller offers are summed based on original base price.
  const itemsAfterSellerDiscount = JSON.parse(JSON.stringify(items));
  const sellerBaseItems = JSON.parse(JSON.stringify(items));
  
  for (const sellerId of sellerIds) {
    const sellerItems = sellerBaseItems.filter(i => i.sellerId === sellerId);
    const sellerSubtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const sellerOffers = await Offer.find({
      seller: sellerId,
      createdBy: 'seller',
      isApproved: true,
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
      ],
    }).populate('applicableProducts', '_id');

    for (const offer of sellerOffers) {
      const { total: discount, itemDiscounts } = calculateDiscount(offer, sellerItems, sellerSubtotal);
      if (discount > 0) {
        appliedOffers.push({ 
          offer: {
            _id: offer._id,
            title: offer.title,
            type: offer.type,
            discountType: offer.discountType,
            discountValue: offer.discountValue
          }, 
          discount, 
          createdBy: 'seller', 
          sellerId 
        });
        totalSellerDiscount += discount;
        Object.entries(itemDiscounts).forEach(([pid, d]) => {
          cumulativeItemDiscounts[pid] = (cumulativeItemDiscounts[pid] || 0) + d;
          // Update itemsAfterSellerDiscount for subsequent admin offer calculation
          const item = itemsAfterSellerDiscount.find(i => (i.productId || i.product?._id?.toString() || i.product?.toString()) === pid);
          if (item) item.price = Math.max(0, item.price - (d / item.quantity));
        });
      } else if (offer.type === 'bill' && sellerSubtotal < offer.minBillAmount) {
        suggestions.push({
          title: offer.title,
          text: `Add ₹${(offer.minBillAmount - sellerSubtotal).toLocaleString()} more from this seller to get ${offer.discountType === 'percent' ? offer.discountValue + '%' : '₹' + offer.discountValue} off!`,
          sellerId
        });
      }
    }
  }

  // 3. Apply Admin offers
  // Standardized logic: Admin offers are layered on top of seller discount, but summed with each other.
  const adminBaseItems = JSON.parse(JSON.stringify(itemsAfterSellerDiscount));
  const fullSubtotalAfterSeller = adminBaseItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  
  for (const offer of adminOffers) {
    const { total: discount, itemDiscounts } = calculateDiscount(offer, adminBaseItems, fullSubtotalAfterSeller);
    if (discount > 0) {
      appliedOffers.push({ 
        offer: {
          _id: offer._id,
          title: offer.title,
          type: offer.type,
          discountType: offer.discountType,
          discountValue: offer.discountValue
        }, 
        discount, 
        createdBy: 'admin' 
      });
      totalAdminDiscount += discount;
      Object.entries(itemDiscounts).forEach(([pid, d]) => {
        cumulativeItemDiscounts[pid] = (cumulativeItemDiscounts[pid] || 0) + d;
      });
    } else if (offer.type === 'bill' && fullSubtotalAfterSeller < offer.minBillAmount) {
      suggestions.push({
        title: offer.title,
        text: `Add ₹${(offer.minBillAmount - fullSubtotalAfterSeller).toLocaleString()} more to your cart to get ${offer.discountType === 'percent' ? offer.discountValue + '%' : '₹' + offer.discountValue} off (Admin Offer)!`,
        createdBy: 'admin'
      });
    }
  }

  res.json({ 
    success: true, 
    appliedOffers, 
    totalSellerDiscount, 
    totalAdminDiscount, 
    totalDiscount: Math.round((totalSellerDiscount + totalAdminDiscount) * 100) / 100,
    itemDiscounts: cumulativeItemDiscounts,
    suggestions
  });
};
