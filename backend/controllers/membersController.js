const Member = require("../models/memberModel");

exports.createMember = async (req, res) => {
    try {
        const { name, gender, department, departments, phone, address, photo_url } = req.body;
        const created_by = req.user.id;
        const insertId = await Member.createMember({ name, gender, department, departments, phone, address, photo_url, created_by });
        res.json({ message: "Member added", id: insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        const rows = await Member.getMembersByUser(userId, role);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete member (admin or any authenticated user)
exports.deleteMember = async (req, res) => {
    try {
        const id = req.params.id;
        const member = await Member.getById(id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        
        const affected = await Member.deleteById(id);
        if (affected > 0) return res.json({ message: 'Member deleted successfully' });
        res.status(500).json({ message: 'Delete failed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update member (admin or owner)
exports.updateMember = async (req, res) => {
    try {
        const id = req.params.id;
        const user = req.user;
        const member = await Member.getById(id);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        if (user.role !== 'admin' && member.created_by !== user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { name, gender, department, departments, phone, address, photo_url } = req.body;
        const affected = await Member.updateById(id, { name, gender, department, departments, phone, address, photo_url });
        if (affected > 0) return res.json({ message: 'Member updated' });
        res.status(500).json({ message: 'Update failed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
