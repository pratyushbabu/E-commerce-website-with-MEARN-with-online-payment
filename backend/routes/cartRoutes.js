// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/miscControllers');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('buyer'), getCart);
router.post('/', protect, authorize('buyer'), addToCart);
router.put('/:itemId', protect, authorize('buyer'), updateCartItem);
router.delete('/:itemId', protect, authorize('buyer'), removeFromCart);
router.delete('/', protect, authorize('buyer'), clearCart);

module.exports = router;
