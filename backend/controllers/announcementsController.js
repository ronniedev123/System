const db = require('../utils/db');
const { sendSMS } = require('../utils/sms');

// Create announcement (admin only)
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, message, sendSMSToMembers } = req.body;
        const createdBy = req.user.id;
        if (!title || !message) return res.status(400).json({ error: 'title and message required' });
        if (sendSMSToMembers && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can send announcement SMS' });
        }

        const [result] = await db.execute(
            'INSERT INTO announcements (title, message, created_by) VALUES (?, ?, ?)',
            [title, message, createdBy]
        );

        const smsSummary = { attempted: !!sendSMSToMembers, sent: false, recipients: 0, error: null };

        // Optionally send SMS to all members
        if (sendSMSToMembers) {
            const [members] = await db.execute('SELECT name, phone FROM members WHERE phone IS NOT NULL AND phone != ""');
            smsSummary.recipients = members.length;

            if (members.length) {
                let successCount = 0;
                for (const member of members) {
                    const ok = await sendSMS(member.phone, message).catch(() => false);
                    if (ok) successCount += 1;
                }
                smsSummary.sent = successCount === members.length;
                if (!smsSummary.sent) smsSummary.error = `Sent to ${successCount}/${members.length} members`;
            } else {
                smsSummary.error = 'No members with phone numbers found';
            }
        }

        res.status(201).json({ id: result.insertId, title, message, smsSummary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// List announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT a.id, a.title, a.message, a.created_at, u.name as created_by_name FROM announcements a LEFT JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Send SMS to individual member (admin only)
exports.sendSMSToMember = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can send SMS messages' });
        }

        const { memberId, message } = req.body;
        
        if (!memberId || !message) {
            return res.status(400).json({ error: 'memberId and message are required' });
        }

        // Get member phone number
        const [members] = await db.execute(
            'SELECT name, phone FROM members WHERE id = ? AND phone IS NOT NULL AND phone != ""',
            [memberId]
        );

        if (members.length === 0) {
            return res.status(404).json({ error: 'Member not found or has no phone number' });
        }

        const member = members[0];
        const success = await sendSMS(member.phone, message);

        if (success) {
            // Log the SMS in announcements if needed
            const [result] = await db.execute(
                'INSERT INTO announcements (title, message, created_by) VALUES (?, ?, ?)',
                [`SMS to ${member.name}`, message, req.user.id]
            );
            res.json({ 
                success: true, 
                message: `SMS sent to ${member.name}`,
                memberName: member.name,
                phone: member.phone
            });
        } else {
            res.status(500).json({ error: 'Failed to send SMS. Please check phone number format.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

