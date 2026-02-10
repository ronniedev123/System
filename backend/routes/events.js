const { sendEmail } = require('../utils/email');
const router = require('express').Router();
const eventsController = require('../controllers/eventsController');
const authMiddleware = require('../middlewares/authMiddleware');
const eventsModel = require('../models/eventsModel');

// Accept both '/add' and '/' for creating events (compatibility)
router.post('/add', authMiddleware, eventsController.addEvent);
router.post('/', authMiddleware, eventsController.addEvent);
router.get('/', authMiddleware, eventsController.getEvents);

router.post('/reminder', authMiddleware, async (req, res) => {
    const { eventId, emails } = req.body;
    try {
        const event = await eventsModel.getById(eventId);
        if(!event) return res.status(404).json({ message: "Event not found" });

        for(const email of emails){
            await sendEmail(email, `Reminder: ${event.title}`, `Event ${event.title} is on ${event.date}. ${event.description}`);
        }
        res.json({ message: "Reminders sent successfully" });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete event
router.delete('/:id', authMiddleware, eventsController.deleteEvent);

module.exports = router;
