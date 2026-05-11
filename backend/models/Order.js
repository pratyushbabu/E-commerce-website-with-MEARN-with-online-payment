const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  image: String,
  price: Number, // price after seller discount
  originalPrice: Number, // MRP
  sellerDiscount: { type: Number, default: 0 },
  adminDiscount: { type: Number, default: 0 },
  quantity: { type: Number, required: true, min: 1 },
  uom: String,
  unitQuantity: Number,
  commissionRate: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
});

const sellerSubOrderSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  subtotal: Number, // subtotal after seller discount
  sellerDiscountTotal: { type: Number, default: 0 },
  adminDiscountTotal: { type: Number, default: 0 },
  commissionTotal: { type: Number, default: 0 },
  sellerEarnings: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    note: String,
  }],
});

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subOrders: [sellerSubOrderSchema],
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: { type: String, default: 'India' },
    phone: String,
  },
  paymentMethod: { type: String, default: 'COD' }, // 'COD' | 'QR' | 'Razorpay'
  paymentStatus: { type: String, enum: ['pending', 'awaiting_verification', 'paid', 'refunded'], default: 'pending' },
  totalAmount: { type: Number, required: true }, // net amount buyer pays
  totalCommission: { type: Number, default: 0 },
  sellerDiscountTotal: { type: Number, default: 0 },
  adminDiscountTotal: { type: Number, default: 0 },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  cancelReason: { type: String, default: '' },
  deliveredAt: Date,
  note: { type: String, default: '' },
  appliedOffers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
