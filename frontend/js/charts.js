const token = localStorage.getItem("token");
let attendanceChartInstance = null;
let trendChartInstance = null;

if (!token) {
    window.location.href = 'index.html';
}

async function loadAttendanceChart() {
    const period = document.getElementById('periodSelect').value;
    let months = 1;
    
    switch(period) {
        case 'quarter': months = 3; break;
        case 'semester': months = 6; break;
        case 'year': months = 12; break;
        default: months = 1;
    }
    
    try {
        // Fetch all members
        const membersRes = await fetch('http://localhost:3000/api/members', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!membersRes.ok) throw new Error('Failed to load members');
        const members = await membersRes.json();
        
        // Fetch attendance records
        const attendanceRes = await fetch('http://localhost:3000/api/attendance', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!attendanceRes.ok) throw new Error('Failed to load attendance');
        const attendanceData = await attendanceRes.json();
        
        // Calculate all Sundays and their attendance across all members
        const sundayAttendance = {};
        const monthlyAttendance = {};
        const now = new Date();
        
        // Initialize monthly data
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${String(month).padStart(2, '0')}`;
            monthlyAttendance[key] = { sundays: [], totalAttendance: 0 };
        }
        
        // Build set of all attendance records by date
        const attendanceByDate = {};
        attendanceData.forEach(r => {
            const dt = r.check_in || r.date || r.created_at;
            if (!dt) return;
            // Extract date part without timezone conversion
            const datePart = dt.split('T')[0] || dt.split(' ')[0];
            if (!attendanceByDate[datePart]) attendanceByDate[datePart] = [];
            attendanceByDate[datePart].push(r.member_id || r.memberId);
        });
        
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
                    const attendanceCount = attendanceByDate[dateStr] ? attendanceByDate[dateStr].length : 0;
                    const averagePercent = members.length > 0 ? Math.round((attendanceCount / members.length) * 100) : 0;
                    
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
        }
        
        // Prepare Sunday-by-Sunday chart data
        const sortedSundays = Object.keys(sundayAttendance).sort().reverse();
        const sundayLabels = sortedSundays.map(dateStr => {
            // Parse date as local - avoid UTC timezone shift
            const [yyyy, mm, dd] = dateStr.split('-');
            const date = new Date(yyyy, mm - 1, dd);
            return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
        });
        
        const sundayPercentages = sortedSundays.map(dateStr => sundayAttendance[dateStr].percent);
        
        // Update bar chart - Sunday by Sunday averages
        const ctx1 = document.getElementById('attendanceChart')?.getContext('2d');
        if (ctx1) {
            if (attendanceChartInstance) attendanceChartInstance.destroy();
            attendanceChartInstance = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: sundayLabels,
                    datasets: [{
                        label: 'Average Attendance %',
                        data: sundayPercentages,
                        backgroundColor: sundayPercentages.map(p => 
                            p >= 80 ? '#4CAF50' : (p >= 60 ? '#FFC107' : '#f44336')
                        ),
                        borderColor: '#333',
                        borderWidth: 1
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
        
        // Update trend chart - monthly trend
        const sortedMonths = Object.keys(monthlyAttendance).sort().reverse();
        const monthLabels = sortedMonths.map(k => {
            const [year, month] = k.split('-');
            return new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        });
        
        const monthlyAverages = sortedMonths.map(k => {
            const data = monthlyAttendance[k];
            return data.sundays.length > 0 ? Math.round(data.totalAttendance / data.sundays.length) : 0;
        });
        
        const ctx2 = document.getElementById('trendChart')?.getContext('2d');
        if (ctx2) {
            if (trendChartInstance) trendChartInstance.destroy();
            trendChartInstance = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: 'Average Monthly Attendance %',
                        data: monthlyAverages,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
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
        
        // Update summary table
        const tbody = document.getElementById('summaryTableBody');
        tbody.innerHTML = '';
        
        sortedMonths.forEach(k => {
            const data = monthlyAttendance[k];
            const [year, month] = k.split('-');
            const monthName = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            
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
        const membersRes = await fetch('http://localhost:3000/api/members', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const members = await membersRes.json();
        
        const attendanceRes = await fetch('http://localhost:3000/api/attendance', {
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
        const membersRes = await fetch('http://localhost:3000/api/members', {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const members = await membersRes.json();
        
        const attendanceRes = await fetch('http://localhost:3000/api/attendance', {
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

loadAttendanceChart();
