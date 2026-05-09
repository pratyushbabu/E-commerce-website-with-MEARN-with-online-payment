const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(protect, authorize('admin'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/users', ctrl.getAllUsers);
router.put('/users/:id/approve', ctrl.approveSeller);
router.put('/users/:id/block', ctrl.blockUser);
router.delete('/users/:id', ctrl.deleteUser);
router.get('/products', ctrl.getAllProducts);

// Payments & QR
router.get('/payments', ctrl.getAllPayments);
router.put('/payments/:id/refund', ctrl.refundPayment);
router.put('/payments/:id/verify-qr', ctrl.verifyQRPayment);
router.put('/payments/:id/process-refund', ctrl.processRefund);

// QR Config
router.get('/qr-config', ctrl.getQRConfig);
router.post('/qr-config', upload.single('qrImage'), ctrl.saveQRConfig);

// Commissions
router.get('/commissions', ctrl.getProductCommissions);
router.put('/commissions/:id', ctrl.approveCommission);

// Withdrawals
router.get('/withdrawals', ctrl.getWithdrawalRequests);
router.get('/withdrawal-analysis', ctrl.getWithdrawalAnalysis);
router.put('/withdrawals/:sellerId/:requestId', ctrl.processWithdrawal);

// Offers
router.get('/offers', ctrl.getAllOffers);
router.put('/offers/:id/approve', ctrl.approveOffer);

// Offer Schedules
router.get('/offer-schedules', ctrl.getOfferSchedules);
router.post('/offer-schedules', ctrl.createOfferSchedule);
router.put('/offer-schedules/:id', ctrl.updateOfferSchedule);
router.delete('/offer-schedules/:id', ctrl.deleteOfferSchedule);

router.get('/seller-stats/:id', ctrl.getSellerStats);
router.get('/insights', ctrl.getInsights);

module.exports = router;
