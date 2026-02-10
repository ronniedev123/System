const donationsModel = require('../models/donationsModel');
const Member = require('../models/memberModel');

// Add donation
exports.addDonation = async (req, res) => {
    try {
        let { memberId, memberName, amount, date, description } = req.body;
        
        // If memberName is provided, look up the member by name
        if (memberName && !memberId) {
            const member = await Member.getMemberByName(memberName);
            if (!member) return res.status(404).json({ error: 'Member not found' });
            memberId = member.id;
        }
        
        // Member must be provided — donations made by members only
        if (!memberId) return res.status(400).json({ error: 'memberId or memberName is required' });

        // Validate amount
        if (amount === undefined || amount === null || amount === "") {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const member = await Member.getById(memberId);
        if (!member) return res.status(400).json({ error: 'Member not found' });

        // Use member name as donor_name
        const donor_name = member.name;

        // Normalize optional fields
        const donation_date = date === undefined ? null : date;
        description = description === undefined ? null : description;

        const donation = await donationsModel.addDonation({ donor_name, amount, donation_date, createdBy: req.user.id, description });
        res.json({ message: "Donation added", donation });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get donations
exports.getDonations = async (req, res) => {
    try {
        const donations = await donationsModel.getAll(req.user);
        res.json(donations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: update donation
exports.updateDonation = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const id = req.params.id;
        const { amount, date, description, donor_name } = req.body;
        // Fetch existing
        const existing = await donationsModel.getById(id);
        if (!existing) return res.status(404).json({ error: 'Donation not found' });

        const donorNameFinal = donor_name === undefined ? existing.user_name : donor_name;
        const donationDateFinal = date === undefined ? existing.date : date;
        const descriptionFinal = description === undefined ? existing.description : description;
        const amountFinal = amount === undefined ? existing.amount : amount;

        const affected = await donationsModel.updateById(id, { donor_name: donorNameFinal, amount: amountFinal, donation_date: donationDateFinal, description: descriptionFinal });
        if (affected > 0) return res.json({ message: 'Donation updated' });
        res.status(500).json({ error: 'Update failed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: delete donation
exports.deleteDonation = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const id = req.params.id;
        const existing = await donationsModel.getById(id);
        if (!existing) return res.status(404).json({ error: 'Donation not found' });
        const affected = await donationsModel.deleteById(id);
        if (affected > 0) return res.json({ message: 'Donation deleted' });
        res.status(500).json({ error: 'Delete failed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single donation by id
exports.getDonationById = async (req, res) => {
    try {
        const id = req.params.id;
        const donation = await donationsModel.getById(id);
        if (!donation) return res.status(404).json({ error: 'Donation not found' });
        res.json(donation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
