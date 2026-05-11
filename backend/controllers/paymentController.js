const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Payment, Notification } = require('../models/index');
const Order = require('../models/Order');

// For now, using keys from CSV. In production, these should be in .env
const RAZORPAY_KEY_ID = 'rzp_test_So7Yc02wXbdKOi';
const RAZORPAY_KEY_SECRET = 'tE6k9Gegsch1PSxh1mgzjKEn';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body; // Amount in INR
    const options = {
      amount: Math.round(amount * 100), // razorpay expects amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    res.status(500).json({ message: 'Could not create Razorpay order' });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // our internal order ID
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (isSignatureValid) {
      // Update our order and payment record
      const order = await Order.findById(orderId).populate('buyer', 'name');
      if (!order) return res.status(404).json({ message: 'Order not found' });

      order.paymentStatus = 'paid';
      order.orderStatus = 'processing';
      await order.save();

      await Payment.findOneAndUpdate(
        { order: orderId },
        {
          status: 'completed',
          transactionId: razorpay_payment_id,
        }
      );

      // Notifications
      const io = req.app.get('io');
      for (const sub of order.subOrders) {
        io.to(`user-${sub.seller}`).emit('new-order', { orderId: order._id, buyerName: order.buyer.name });
        await Notification.create({
          user: sub.seller,
          message: `New order received and paid from ${order.buyer.name}`,
          type: 'order',
          link: `/seller/orders`,
        });
      }
      io.to('admin-room').emit('new-payment', { orderId: order._id, amount: order.totalAmount, method: 'Razorpay' });

      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Razorpay Verification Error:', error);
    res.status(500).json({ message: 'Internal server error during verification' });
  }
};
