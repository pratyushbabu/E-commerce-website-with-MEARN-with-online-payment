const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/offerController');
const { protect, authorize, sellerApproved } = require('../middleware/authMiddleware');

// Public
router.get('/seller/:sellerId', ctrl.getSellerActiveOffers);
router.get('/schedules', ctrl.getOfferSchedules);
router.post('/compute-cart', ctrl.computeCartOffers);

// Protected (Seller or Admin)
router.post('/', protect, authorize('seller', 'admin'), (req, res, next) => req.user.role === 'admin' ? next() : sellerApproved(req, res, next), ctrl.createOffer);
router.get('/my', protect, authorize('seller', 'admin'), ctrl.getMyOffers);
router.put('/:id', protect, authorize('seller', 'admin'), ctrl.updateOffer);
router.delete('/:id', protect, authorize('seller', 'admin'), ctrl.deleteOffer);

module.exports = router;
