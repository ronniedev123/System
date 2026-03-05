const token = localStorage.getItem("token");
let attendanceChartInstance = null;
let trendChartInstance = null;

if (!token) {
    window.location.href = 'index.html';
}

try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role === 'normaluser') {
        window.location.href = 'dashboard.html';
    }
} catch (err) {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function pad2(n) {
    return String(n).padStart(2, '0');
}

function dateKeyFromValue(dtValue) {
    if (!dtValue) return null;
    const raw = String(dtValue);
    const datePart = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
}

function setDefaultPeriod() {
    const month = pad2(new Date().getMonth() + 1);
    const select = document.getElementById('periodSelect');
    if (select) select.value = month;
}

async function loadAttendanceChart() {
    const period = document.getElementById('periodSelect').value;
    const selectedYear = new Date().getFullYear();

    try {
        // Fetch all members
        const membersRes = await fetch('/api/members', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!membersRes.ok) throw new Error('Failed to load members');
        const members = await membersRes.json();
        
        // Fetch attendance records
        const attendanceRes = await fetch('/api/attendance', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!attendanceRes.ok) throw new Error('Failed to load attendance');
        const attendanceData = await attendanceRes.json();
        
        // Calculate all Sundays and their attendance across all members
        const sundayAttendance = {};
        const monthlyAttendance = {};
        const now = new Date();
        
        // Initialize monthly data

        if (period === "year") {
            // Initialize all 12 months
            for (let m = 0; m < 12; m++) {
                const key = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
                monthlyAttendance[key] = { sundays: [], totalAttendance: 0 };
            }
        } else {
            // Single selected month
            const key = `${selectedYear}-${period}`;
            monthlyAttendance[key] = { sundays: [], totalAttendance: 0 };
        }
        
        // Build set of all attendance records by date
        const attendanceByDate = {};
        attendanceData.forEach((r) => {
            const dt = r.check_in || r.date || r.created_at;
            const datePart = dateKeyFromValue(dt);
            if (!datePart) return;
            if (!attendanceByDate[datePart]) attendanceByDate[datePart] = [];
            attendanceByDate[datePart].push(r.member_id || r.memberId);
        });
        
        // Get all Sundays in the period
        const monthsToProcess = period === "year"
            ? [...Array(12).keys()]
            : [parseInt(period) - 1];

        monthsToProcess.forEach(monthIndex => {

            const year = selectedYear;
            const month = monthIndex + 1;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;

            const firstDay = new Date(year, monthIndex, 1);
            const lastDay = new Date(year, monthIndex + 1, 0);

            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 0) {

                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}-${mm}-${dd}`;

                    const attendanceCount = attendanceByDate[dateStr] ? attendanceByDate[dateStr].length : 0;
                    const averagePercent = members.length > 0
                        ? Math.round((attendanceCount / members.length) * 100)
                        : 0;

                    sundayAttendance[dateStr] = {
                        count: attendanceCount,
                        percent: averagePercent
                    };
                    
                    monthlyAttendance[monthKey].sundays.push({
                        date: dateStr,
                        attendance: attendanceCount,
                        percent: averagePercent
                    });

                    monthlyAttendance[monthKey].totalAttendance += averagePercent;
                }
            }
        });

        
        let sundayLabels = [];
        let sundayPercentages = [];
        let firstChartLabel = 'Average Attendance %';

        if (period !== "year") {
            const sortedSundays = Object.keys(sundayAttendance).sort();
            sundayLabels = sortedSundays.map((dateStr) => {
                const [yyyy, mm, dd] = dateStr.split('-');
                const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
                return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
            });
            sundayPercentages = sortedSundays.map((dateStr) => sundayAttendance[dateStr].percent);
            firstChartLabel = 'Sunday Attendance %';
        }

        const sortedMonths = Object.keys(monthlyAttendance).sort();
        const monthLabels = sortedMonths.map((k) => {
            const [year, month] = k.split('-');
            return new Date(parseInt(year, 10), parseInt(month, 10) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        });

        const monthlyAverages = sortedMonths.map((k) => {
            const data = monthlyAttendance[k];
            return data.sundays.length > 0 ? Math.round(data.totalAttendance / data.sundays.length) : 0;
        });

        if (period === "year") {
            sundayLabels = monthLabels;
            sundayPercentages = monthlyAverages;
            firstChartLabel = 'Monthly Average Attendance %';
        }

        // Update line chart
        const ctx1 = document.getElementById('attendanceChart')?.getContext('2d');
        if (ctx1) {
            if (attendanceChartInstance) attendanceChartInstance.destroy();
            attendanceChartInstance = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: sundayLabels,
                    datasets: [{
                        label: firstChartLabel,
                        data: sundayPercentages,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.15)',
                        pointBackgroundColor: sundayPercentages.map((p) =>
                            p >= 80 ? '#4CAF50' : (p >= 60 ? '#FFC107' : '#f44336')
                        ),
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.25,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { callback: v => v + '%' }
                        }
                    }
                }
            });
        }

        const yearAverage = monthlyAverages.length
            ? Math.round(monthlyAverages.reduce((a, b) => a + b, 0) / monthlyAverages.length)
            : 0;
        
        const ctx2 = document.getElementById('trendChart')?.getContext('2d');
        if (ctx2) {
            if (trendChartInstance) trendChartInstance.destroy();
            trendChartInstance = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: [
                        {
                            label: 'Average Monthly Attendance %',
                            data: monthlyAverages,
                            borderColor: '#2196F3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Whole Year Average %',
                            data: monthLabels.map(() => yearAverage),
                            borderColor: '#ff9800',
                            borderDash: [6, 6],
                            pointRadius: 0,
                            borderWidth: 2,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { callback: v => v + '%' }
                        }
                    }
                }
            });
        }
        
        // Update summary table
        const tbody = document.getElementById('summaryTableBody');
        tbody.innerHTML = '';
        
        sortedMonths.forEach((k) => {
            const data = monthlyAttendance[k];
            const [year, month] = k.split('-');
            const monthName = new Date(parseInt(year, 10), parseInt(month, 10) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            
            const numSundays = data.sundays.length;
            const averagePercent = numSundays > 0 ? Math.round(data.totalAttendance / numSundays) : 0;
            
            // Get min and max percentages for the month
            const percentages = data.sundays.map(s => s.percent);
            const maxPercent = percentages.length > 0 ? Math.max(...percentages) : 0;
            const minPercent = percentages.length > 0 ? Math.min(...percentages) : 0;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 12px;">${monthName}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${members.length}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">${numSundays}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">${averagePercent}%</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #4CAF50; font-weight: bold;">${maxPercent}%</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #f44336; font-weight: bold;">${minPercent}%</td>
            `;
            tbody.appendChild(tr);
        });

        if (period === "year") {
            const avgRow = document.createElement('tr');
            avgRow.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">Whole Year Average</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">-</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">-</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold; color:#ff9800;">${yearAverage}%</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">-</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">-</td>
            `;
            tbody.appendChild(avgRow);
        }
        
    } catch (err) {
        console.error(err);
        alert('Failed to load attendance data');
    }
}

async function downloadAllReport() {
    const period = document.getElementById('periodSelect').value;
    let months = 1;
    
    switch(period) {
        case 'quarter': months = 3; break;
        case 'semester': months = 6; break;
        case 'year': months = 12; break;
        default: months = 1;
    }
    
    try {
        const membersRes = await fetch('/api/members', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const members = await membersRes.json();
        
        const attendanceRes = await fetch('/api/attendance', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const records = await attendanceRes.json();
        
        let csv = 'All Members Attendance Report\r\n';
        csv += `Generated: ${new Date().toLocaleString()}\r\n`;
        csv += `Period: Last ${months} month(s)\r\n\r\n`;
        csv += 'Member,Date,Status\r\n';
        
        members.forEach(m => {
            const memberRecords = records.filter(r => (r.member_id || r.memberId) == m.id);
            if (memberRecords.length > 0) {
                memberRecords.forEach(r => {
                    const date = new Date(r.check_in || r.date || r.created_at);
                    csv += `${m.name},${date.toLocaleDateString()},Present\r\n`;
                });
            } else {
                csv += `${m.name},N/A,No Records\r\n`;
            }
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `all_members_attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error(err);
        alert('Failed to download report');
    }
}

async function downloadAverageReport() {
    const period = document.getElementById('periodSelect').value;
    let months = 1;
    
    switch(period) {
        case 'quarter': months = 3; break;
        case 'semester': months = 6; break;
        case 'year': months = 12; break;
        default: months = 1;
    }
    
    try {
        const membersRes = await fetch('/api/members', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const members = await membersRes.json();
        
        const attendanceRes = await fetch('/api/attendance', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const records = await attendanceRes.json();
        
        // Build attendance by date
        const attendanceByDate = {};
        records.forEach(r => {
            const attendanceDate = new Date(r.check_in || r.date || r.created_at);
            const dateStr = attendanceDate.toISOString().split('T')[0];
            if (!attendanceByDate[dateStr]) attendanceByDate[dateStr] = [];
            attendanceByDate[dateStr].push(r.member_id || r.memberId);
        });
        
        // Calculate summaries
        const now = new Date();
        let csv = 'Attendance Summary Report\r\n';
        csv += `Generated: ${new Date().toLocaleString()}\r\n`;
        csv += `Period: Last ${months} month(s)\r\n`;
        csv += `Total Members: ${members.length}\r\n\r\n`;
        csv += 'Month,Sundays,Average Attendance %,Highest %,Lowest %\r\n';
        
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            // Get all Sundays in this month
            let sundays = 0;
            const sundayPercentages = [];
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            
            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 0) {
                    sundays++;
                    const dateStr = d.toISOString().split('T')[0];
                    const attendanceCount = attendanceByDate[dateStr] ? attendanceByDate[dateStr].length : 0;
                    const percent = members.length > 0 ? Math.round((attendanceCount / members.length) * 100) : 0;
                    sundayPercentages.push(percent);
                }
            }
            
            const avgPercent = sundayPercentages.length > 0
                ? Math.round(sundayPercentages.reduce((a, b) => a + b, 0) / sundayPercentages.length)
                : 0;
            const maxPercent = sundayPercentages.length > 0 ? Math.max(...sundayPercentages) : 0;
            const minPercent = sundayPercentages.length > 0 ? Math.min(...sundayPercentages) : 0;
            
            csv += `${monthName},${sundays},${avgPercent}%,${maxPercent}%,${minPercent}%\r\n`;
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_summary_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error(err);
        alert('Failed to download report');
    }
}

setDefaultPeriod();
loadAttendanceChart();
