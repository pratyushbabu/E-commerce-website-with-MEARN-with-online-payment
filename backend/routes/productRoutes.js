const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');
const { protect, authorize, sellerApproved } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

router.get('/search', ctrl.searchProducts);       // live search
router.get('/categories', ctrl.getCategories);
router.get('/', ctrl.getProducts);
router.get('/:id', ctrl.getProduct);
router.post('/', protect, authorize('seller'), sellerApproved, upload.array('images', 5), ctrl.createProduct);
router.put('/:id', protect, authorize('seller', 'admin'), upload.array('images', 5), ctrl.updateProduct);
router.delete('/:id', protect, authorize('seller', 'admin'), ctrl.deleteProduct);
router.put('/:id/approve', protect, authorize('admin'), ctrl.approveProduct);

module.exports = router;
