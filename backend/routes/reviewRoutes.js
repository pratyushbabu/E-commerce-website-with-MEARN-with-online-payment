const express = require('express');
const router = express.Router();
const { addReview, getProductReviews, deleteReview } = require('../controllers/miscControllers');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/:productId', getProductReviews);
router.post('/:productId', protect, authorize('buyer'), addReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
