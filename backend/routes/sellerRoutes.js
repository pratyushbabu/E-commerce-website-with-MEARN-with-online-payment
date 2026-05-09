const express = require('express');
const router = express.Router();
const { getSellerDashboard, requestWithdrawal } = require('../controllers/miscControllers');
const { protect, authorize, sellerApproved } = require('../middleware/authMiddleware');

router.use(protect, authorize('seller'), sellerApproved);
router.get('/dashboard', getSellerDashboard);
router.post('/withdrawal', requestWithdrawal);
router.put('/bank-details', require('../controllers/miscControllers').updateBankDetails);

module.exports = router;
