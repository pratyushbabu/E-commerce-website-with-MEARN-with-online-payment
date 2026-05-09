const express = require('express');
const router = express.Router();
const { getMyPayments } = require('../controllers/miscControllers');
const { protect, authorize } = require('../middleware/authMiddleware');
const { QRConfig } = require('../models/index');

router.get('/my', protect, authorize('buyer'), getMyPayments);

// Public: get active QR config for checkout
router.get('/qr-config', async (req, res) => {
  const config = await QRConfig.findOne({ isActive: true });
  res.json({ success: true, config: config || null });
});

module.exports = router;
