const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Public: get all approved sellers
router.get('/sellers', async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller', isApproved: true, isBlocked: false })
      .select('name shopName avatar');
    res.json({ success: true, sellers });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Public seller profile
router.get('/seller/:id', async (req, res) => {
  const seller = await User.findOne({ _id: req.params.id, role: 'seller', isApproved: true })
    .select('name shopName shopDescription avatar createdAt');
  if (!seller) return res.status(404).json({ message: 'Seller not found' });
  res.json({ success: true, seller });
});

module.exports = router;
