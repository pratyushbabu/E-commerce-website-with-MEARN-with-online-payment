const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/', protect, authorize('buyer'), ctrl.placeOrder);
router.get('/my', protect, authorize('buyer'), ctrl.getMyOrders);
router.get('/seller', protect, authorize('seller'), ctrl.getSellerOrders);
router.get('/', protect, authorize('admin'), ctrl.getAllOrders);
router.get('/:id', protect, ctrl.getOrder);
router.put('/:id/status', protect, authorize('seller'), ctrl.updateSubOrderStatus);
router.put('/:id/admin-status', protect, authorize('admin'), ctrl.adminUpdateOrderStatus);
router.put('/:id/cancel', protect, authorize('buyer'), ctrl.cancelOrder);
router.post('/:id/qr-proof', protect, authorize('buyer'), upload.single('proof'), ctrl.submitQRProof);
router.post('/:id/refund-details', protect, authorize('buyer'), ctrl.submitRefundDetails);

module.exports = router;
