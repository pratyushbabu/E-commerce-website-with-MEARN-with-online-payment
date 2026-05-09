const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlist } = require('../controllers/miscControllers');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('buyer'), getWishlist);
router.post('/toggle', protect, authorize('buyer'), toggleWishlist);

module.exports = router;
