const express = require('express');
const router = express.Router();
const { getMyPayments } = require('../controllers/miscControllers');
const { createRazorpayOrder, verifyRazorpayPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { QRConfig } = require('../models/index');

router.get('/my', protect, authorize('buyer'), getMyPayments);

// Razorpay routes
router.post('/razorpay/order', protect, authorize('buyer'), createRazorpayOrder);
router.post('/razorpay/verify', protect, authorize('buyer'), verifyRazorpayPayment);

// Public: get active QR config for checkout
router.get('/qr-config', async (req, res) => {
  const config = await QRConfig.findOne({ isActive: true });
  res.json({ success: true, config: config || null });
});

module.exports = router;
