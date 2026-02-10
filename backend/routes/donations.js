const router = require('express').Router();
const donationsController = require('../controllers/donationsController');
const authMiddleware = require('../middlewares/authMiddleware');

// Accept both '/add' and '/' for creating donations (compatibility)
router.post('/add', authMiddleware, donationsController.addDonation);
router.post('/', authMiddleware, donationsController.addDonation);
router.get('/', authMiddleware, donationsController.getDonations);
router.get('/:id', authMiddleware, donationsController.getDonationById);

// Admin-only update/delete
router.put('/:id', authMiddleware, donationsController.updateDonation);
router.delete('/:id', authMiddleware, donationsController.deleteDonation);

module.exports = router;
