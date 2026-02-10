const router = require('express').Router();
const announcementsController = require('../controllers/announcementsController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, announcementsController.createAnnouncement);
router.get('/', authMiddleware, announcementsController.getAnnouncements);
router.post('/sms/send', authMiddleware, announcementsController.sendSMSToMember);

module.exports = router;
