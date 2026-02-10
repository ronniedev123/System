const token = localStorage.getItem("token");
let memberChart = null;
let trendChart = null;

if (!token) {
    window.location.href = 'index.html';
}

// Get member ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const memberId = urlParams.get('id');
const memberName = urlParams.get('name');

if (!memberId) {
    alert('No member selected');
    window.location.href = 'members.html';
}

document.getElementById('memberName').textContent = memberName || `Member #${memberId}`;

async function loadMemberAttendanceGraph() {
    const months = parseInt(document.getElementById('periodSelect').value);
    const now = new Date();
    
    try {
        // Fetch attendance records for this member
        const res = await fetch(`http://localhost:3000/api/attendance?memberId=${memberId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to load attendance');
        const records = await res.json();
        
        // Build set of attendance dates
        const attendanceDates = new Set();
        records.forEach(r => {
            const dt = r.check_in || r.date || r.created_at;
            if (!dt) return;
            // Extract date part without timezone conversion
            const datePart = dt.split('T')[0] || dt.split(' ')[0];
            attendanceDates.add(datePart);
        });
        
        // Calculate all Sundays and their attendance in the period
        const sundayData = {};
        const monthlyData = {};
        const now = new Date();
        
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${String(month).padStart(2, '0')}`;
            monthlyData[key] = { present: 0, absent: 0, total: 0 };
        }
        
        // Get all Sundays in the period
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            
            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 0) { // Sunday
                    // Format date as local YYYY-MM-DD without timezone conversion
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    const isPresent = attendanceDates.has(dateStr);
                    
                    sundayData[dateStr] = isPresent ? 100 : 0;
                    monthlyData[monthKey].total++;
                    
                    if (isPresent) {
                        monthlyData[monthKey].present++;
                    } else {
                        monthlyData[monthKey].absent++;
                    }
                }
            }
        }
        
        // Prepare data for chart - all Sundays in reverse chronological order
        const sortedSundays = Object.keys(sundayData).sort().reverse();
        const sundayLabels = sortedSundays.map(dateStr => {
            // Parse date as local - avoid UTC timezone shift
            const [yyyy, mm, dd] = dateStr.split('-');
            const date = new Date(yyyy, mm - 1, dd);
            return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
        });
        
        const attendancePercentages = sortedSundays.map(dateStr => sundayData[dateStr]);
        
        // Update attendance chart - Sunday by Sunday
        const ctx1 = document.getElementById('memberAttendanceChart')?.getContext('2d');
        if (ctx1) {
            if (memberChart) memberChart.destroy();
            memberChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: sundayLabels,
                    datasets: [{
                        label: 'Attendance',
                        data: attendancePercentages,
                        backgroundColor: attendancePercentages.map(p => p === 100 ? '#4CAF50' : '#f44336')
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: v => v === 0 ? 'Absent' : (v === 100 ? 'Present' : v)
                            }
                        }
                    },
                    plugins: {
                        legend: { display: true }
                    }
                }
            });
        }
        
        // Update trend chart - monthly trend line
        const sortedMonths = Object.keys(monthlyData).sort().reverse();
        const monthLabels = sortedMonths.map(k => {
            const [year, month] = k.split('-');
            return new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        });
        
        const monthlyPercentages = sortedMonths.map(k => {
            const data = monthlyData[k];
            return data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
        });
        
        const ctx2 = document.getElementById('memberTrendChart')?.getContext('2d');
        if (ctx2) {
            if (trendChart) trendChart.destroy();
            trendChart = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: 'Monthly Attendance %',
                        data: monthlyPercentages,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { callback: v => v + '%' }
                        }
                    },
                    plugins: {
                        legend: { display: true }
                    }
                }
            });
        }
        
        // Update summary table - based on actual Sundays
        const tbody = document.getElementById('summaryTableBody');
        tbody.innerHTML = '';
        sortedMonths.forEach(k => {
            const data = monthlyData[k];
            const [year, month] = k.split('-');
            const monthName = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            const percentage = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 10px;">${monthName}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${data.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #4CAF50; font-weight: bold;">${data.present}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #f44336; font-weight: bold;">${data.absent}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${percentage}%</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (err) {
        console.error(err);
        alert('Failed to load attendance data');
    }
}

async function downloadMemberReport() {
    const months = parseInt(document.getElementById('periodSelect').value);
    const now = new Date();
    
    try {
        const res = await fetch(`http://localhost:3000/api/attendance?memberId=${memberId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to load attendance');
        const records = await res.json();
        
        // Build set of attendance dates
        const attendanceDates = new Set();
        records.forEach(r => {
            const dt = r.check_in || r.date || r.created_at;
            if (!dt) return;
            // Extract date part without timezone conversion
            const datePart = dt.split('T')[0] || dt.split(' ')[0];
            attendanceDates.add(datePart);
        });
        
        // Build CSV with all Sundays
        let csv = 'Member Attendance Report\r\n';
        csv += `Member: ${memberName}\r\n`;
        csv += `Generated: ${new Date().toLocaleString()}\r\n`;
        csv += `Period: Last ${months} month(s)\r\n\r\n`;
        csv += 'Sunday,Status\r\n';
        
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            
            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 0) { // Sunday
                    // Format date as local YYYY-MM-DD without timezone conversion
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    const isPresent = attendanceDates.has(dateStr);
                    csv += `${d.toLocaleDateString()},${isPresent ? 'Present' : 'Absent'}\r\n`;
                }
            }
        }
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${memberId}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error(err);
        alert('Failed to download report');
    }
}

loadMemberAttendanceGraph();
