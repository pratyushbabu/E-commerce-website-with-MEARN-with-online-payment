const mongoose = require('mongoose');

// ─── CART ────────────────────────────────────────────────
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1, min: 1 },
    price: Number,
    effectivePrice: Number,
  }],
}, { timestamps: true });
const Cart = mongoose.model('Cart', cartSchema);

// ─── REVIEW ──────────────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);

// ─── WISHLIST ─────────────────────────────────────────────
const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });
const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// ─── NOTIFICATION ─────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  type: { type: String, enum: ['order', 'product', 'payment', 'system', 'review', 'offer', 'withdrawal', 'commission'], default: 'system' },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '' },
  forRole: { type: String, enum: ['buyer', 'seller', 'admin', 'all'], default: 'all' },
}, { timestamps: true });
const Notification = mongoose.model('Notification', notificationSchema);

// ─── PAYMENT ──────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'COD' }, // 'COD' | 'QR' | 'Razorpay'
  status: { type: String, enum: ['pending', 'awaiting_verification', 'completed', 'refunded', 'failed', 'cancelled'], default: 'pending' },
  transactionId: { type: String, default: '' },
  refundReason: { type: String, default: '' },
  // QR Payment fields
  qrPaymentProof: { type: String, default: '' },
  qrPaymentProofPublicId: { type: String, default: '' },
  qrTransactionRef: { type: String, default: '' },
  qrVerificationNote: { type: String, default: '' },
  // Refund details (buyer fills)
  refundDetails: {
    upiId: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    accountName: { type: String, default: '' },
  },
  refundPaymentDetails: { type: String, default: '' }, // admin fills after refund sent
  refundAt: Date,
}, { timestamps: true });
const Payment = mongoose.model('Payment', paymentSchema);

// ─── OFFER ────────────────────────────────────────────────
const offerSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if admin offer
  createdBy: { type: String, enum: ['seller', 'admin'], default: 'seller' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['item', 'bill'], required: true },
  discountType: { 
    type: String, 
    enum: ['percent', 'flat', 'buyXGetX', 'buyXGetYPercent', 'buyXGetYOff'], 
    required: true 
  },
  discountValue: { type: Number, default: 0 },
  buyQuantity: { type: Number, default: 0 },
  getQuantity: { type: Number, default: 0 },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [String],
  minBillAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  approvalNote: { type: String, default: '' },
}, { timestamps: true });
const Offer = mongoose.model('Offer', offerSchema);

// ─── ADMIN OFFER SCHEDULE ─────────────────────────────────
const offerScheduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  discountHint: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  bannerColor: { type: String, default: '#6366f1' },
  isActive: { type: Boolean, default: true },
  visibleTo: { type: String, enum: ['all', 'seller', 'buyer'], default: 'all' },
}, { timestamps: true });
const OfferSchedule = mongoose.model('OfferSchedule', offerScheduleSchema);

// ─── QR CONFIG ────────────────────────────────────────────
const qrConfigSchema = new mongoose.Schema({
  qrImageUrl: { type: String, default: '' },
  qrImagePublicId: { type: String, default: '' },
  upiId: { type: String, default: '' },
  accountName: { type: String, default: '' },
  instructions: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const QRConfig = mongoose.model('QRConfig', qrConfigSchema);

module.exports = { Cart, Review, Wishlist, Notification, Payment, Offer, OfferSchedule, QRConfig };
