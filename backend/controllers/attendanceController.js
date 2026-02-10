const attendanceModel = require('../models/attendanceModel');
const memberModel = require('../models/memberModel');

// Record attendance
exports.markAttendance = async (req, res) => {
    try {
        let { memberId, memberName, date } = req.body;
        const userId = req.user.id;

        // If memberName is provided, look up the member by name
        if (memberName && !memberId) {
            const member = await memberModel.getMemberByName(memberName);
            if (!member) return res.status(404).json({ error: 'Member not found. Please create the member first.' });
            memberId = member.id;
        }

        // require memberId
        if (!memberId) return res.status(400).json({ error: 'memberId or memberName is required' });
        memberId = parseInt(memberId, 10);
        if (isNaN(memberId)) return res.status(400).json({ error: 'memberId must be a number' });

        // verify member exists
        const member = await memberModel.getById(memberId);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        // normalize date (allow null -> now)
        date = date === undefined || date === null ? null : date;

        const record = await attendanceModel.addAttendance({ memberId, date, createdBy: userId });
        res.json({ message: "Attendance marked successfully", attendance: record });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get attendance trends
exports.getAttendanceTrends = async (req, res) => {
    try {
        const trends = await attendanceModel.getTrends(req.user);
        res.json(trends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Return full attendance records (joined with member names)
exports.getAttendanceRecords = async (req, res) => {
    try {
        const records = await attendanceModel.getAllRecords(req.user);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

function countSundaysBetween(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    let count = 0;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) count++; // Sunday
    }
    return count;
}

// Monthly report: returns per-member attendance count and remark for given year/month
exports.getMonthlyReport = async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = parseInt(req.query.month, 10); // 1-12
        if (!month || month < 1 || month > 12) return res.status(400).json({ error: 'month query param required (1-12)' });

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0); // last day of month

        const startISO = start.toISOString().split('T')[0] + ' 00:00:00';
        const endISO = end.toISOString().split('T')[0] + ' 23:59:59';

        const totalSundays = countSundaysBetween(start, end);
        const counts = await attendanceModel.getCountsByMemberBetween(startISO, endISO);

        const result = counts.map(c => {
            const pct = totalSundays === 0 ? 0 : (c.count / totalSundays) * 100;
            let remark = 'Poor';
            if (pct >= 75) remark = 'Good';
            else if (pct >= 50) remark = 'Fair';
            return { member_id: c.member_id, member_name: c.member_name, count: c.count, totalSundays, pct: Math.round(pct), remark };
        });

        res.json({ year, month, totalSundays, report: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Yearly report (per member)
exports.getYearlyReport = async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        const startISO = start.toISOString().split('T')[0] + ' 00:00:00';
        const endISO = end.toISOString().split('T')[0] + ' 23:59:59';

        const totalSundays = countSundaysBetween(start, end);
        const counts = await attendanceModel.getCountsByMemberBetween(startISO, endISO);

        const result = counts.map(c => {
            const pct = totalSundays === 0 ? 0 : (c.count / totalSundays) * 100;
            let remark = 'Poor';
            if (pct >= 75) remark = 'Good';
            else if (pct >= 50) remark = 'Fair';
            return { member_id: c.member_id, member_name: c.member_name, count: c.count, totalSundays, pct: Math.round(pct), remark };
        });

        res.json({ year, totalSundays, report: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Member stats for a period
exports.getMemberStats = async (req, res) => {
    try {
        const memberId = req.params.id;
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = parseInt(req.query.month, 10); // optional
        let start, end;
        if (month && month >= 1 && month <= 12) {
            start = new Date(year, month - 1, 1);
            end = new Date(year, month, 0);
        } else {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
        }
        const startISO = start.toISOString().split('T')[0] + ' 00:00:00';
        const endISO = end.toISOString().split('T')[0] + ' 23:59:59';

        const totalSundays = countSundaysBetween(start, end);
        const attended = await attendanceModel.getCountForMemberBetween(memberId, startISO, endISO);
        const pct = totalSundays === 0 ? 0 : (attended / totalSundays) * 100;
        let remark = 'Poor';
        if (pct >= 75) remark = 'Good';
        else if (pct >= 50) remark = 'Fair';

        res.json({ member_id: memberId, attended, totalSundays, pct: Math.round(pct), remark });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete attendance record by member ID and date
exports.deleteAttendance = async (req, res) => {
    try {
        const { memberId, date } = req.body;
        const userId = req.user.id;
        
        if (!memberId || !date) {
            return res.status(400).json({ error: 'memberId and date are required' });
        }
        
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete attendance records' });
        }
        
        const result = await attendanceModel.deleteByMemberAndDate(memberId, date);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        
        res.json({ message: 'Attendance record deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
