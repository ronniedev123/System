const eventsModel = require('../models/eventsModel');

// Add event
exports.addEvent = async (req, res) => {
    try {
        let { title, description, date } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });
        if (!date) return res.status(400).json({ error: 'Date is required' });
        description = description === undefined ? null : description;
        date = date === undefined ? null : date;

        const event = await eventsModel.addEvent({ title, description, date, createdBy: req.user.id });
        res.json({ message: "Event created", event });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get events
exports.getEvents = async (req, res) => {
    try {
        const events = await eventsModel.getAll(req.user);
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete event (admin or owner)
exports.deleteEvent = async (req, res) => {
    try {
        const id = req.params.id;
        const user = req.user;
        const event = await eventsModel.getById(id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (user.role !== 'admin' && event.created_by !== user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const affected = await eventsModel.deleteById(id);
        if (affected > 0) return res.json({ message: 'Event deleted' });
        res.status(500).json({ message: 'Delete failed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
