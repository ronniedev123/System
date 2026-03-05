const token = localStorage.getItem("token");
let memberChart = null;
let trendChart = null;

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

const urlParams = new URLSearchParams(window.location.search);
const memberId = urlParams.get('id');
const memberName = urlParams.get('name');

if (!memberId) {
    alert('No member selected');
    window.location.href = 'members.html';
}

document.getElementById('memberName').textContent = memberName || `Member #${memberId}`;

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

function monthLabel(year, monthIndex) {
    return new Date(year, monthIndex, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

function getSundaysInMonth(year, monthIndex) {
    const sundays = [];
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) {
            sundays.push(new Date(d));
        }
    }
    return sundays;
}

function setDefaultPeriod() {
    const periodSelect = document.getElementById('periodSelect');
    const currentMonth = pad2(new Date().getMonth() + 1);
    periodSelect.value = currentMonth;
}

function buildMonthlyData(attendanceDates, year) {
    const monthlyData = {};
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const key = `${year}-${pad2(monthIndex + 1)}`;
        const sundays = getSundaysInMonth(year, monthIndex);
        const present = sundays.filter((d) => {
            const dateKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
            return attendanceDates.has(dateKey);
        }).length;
        monthlyData[key] = {
            present,
            total: sundays.length,
            absent: Math.max(sundays.length - present, 0),
            percentage: sundays.length ? Math.round((present / sundays.length) * 100) : 0
        };
    }
    return monthlyData;
}

async function loadMemberAttendanceGraph() {
    const period = document.getElementById('periodSelect').value;
    const selectedYear = new Date().getFullYear();

    try {
        const res = await fetch(`/api/attendance?memberId=${memberId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load attendance');
        const records = await res.json();

        const attendanceDates = new Set();
        records.forEach((r) => {
            const dt = r.check_in || r.date || r.created_at;
            const key = dateKeyFromValue(dt);
            if (key) attendanceDates.add(key);
        });

        const monthlyData = buildMonthlyData(attendanceDates, selectedYear);
        const orderedMonthKeys = Object.keys(monthlyData).sort();
        const monthlyLabels = orderedMonthKeys.map((k) => {
            const [y, m] = k.split('-');
            return monthLabel(parseInt(y, 10), parseInt(m, 10) - 1);
        });
        const monthlyPercentages = orderedMonthKeys.map((k) => monthlyData[k].percentage);
        const yearAverage = monthlyPercentages.length
            ? Math.round(monthlyPercentages.reduce((a, b) => a + b, 0) / monthlyPercentages.length)
            : 0;

        let chartLabels = [];
        let chartValues = [];
        let chartTitle = '';

        if (period === 'year') {
            chartLabels = monthlyLabels;
            chartValues = monthlyPercentages;
            chartTitle = 'Whole Year Average Trend (%)';
        } else {
            const monthIndex = parseInt(period, 10) - 1;
            const sundays = getSundaysInMonth(selectedYear, monthIndex);
            chartLabels = sundays.map((d) => d.toLocaleDateString('default', {
                weekday: 'short', month: 'short', day: 'numeric'
            }));
            chartValues = sundays.map((d) => {
                const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
                return attendanceDates.has(key) ? 100 : 0;
            });
            chartTitle = `${new Date(selectedYear, monthIndex, 1).toLocaleString('default', { month: 'long' })} Sunday Attendance`;
        }

        const ctx1 = document.getElementById('memberAttendanceChart')?.getContext('2d');
        if (ctx1) {
            if (memberChart) memberChart.destroy();
            memberChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: chartTitle,
                        data: chartValues,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.15)',
                        pointBackgroundColor: chartValues.map((v) => v >= 50 ? '#4CAF50' : '#f44336'),
                        pointRadius: 4,
                        borderWidth: 2,
                        tension: 0.2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: (v) => `${v}%`
                            }
                        }
                    },
                    plugins: {
                        legend: { display: true }
                    }
                }
            });
        }

        const ctx2 = document.getElementById('memberTrendChart')?.getContext('2d');
        if (ctx2) {
            if (trendChart) trendChart.destroy();
            trendChart = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: monthlyLabels,
                    datasets: [
                        {
                            label: 'Monthly Attendance %',
                            data: monthlyPercentages,
                            borderColor: '#2196F3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            tension: 0.3,
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Whole Year Average %',
                            data: monthlyLabels.map(() => yearAverage),
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
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { callback: (v) => `${v}%` }
                        }
                    },
                    plugins: {
                        legend: { display: true }
                    }
                }
            });
        }

        const tbody = document.getElementById('summaryTableBody');
        tbody.innerHTML = '';

        if (period === 'year') {
            orderedMonthKeys.forEach((k) => {
                const [yearStr, monthStr] = k.split('-');
                const info = monthlyData[k];
                const monthName = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1)
                    .toLocaleString('default', { month: 'long', year: 'numeric' });

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="border: 1px solid #ddd; padding: 10px;">${monthName}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${info.total}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #4CAF50; font-weight: bold;">${info.present}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #f44336; font-weight: bold;">${info.absent}</td>
                    <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${info.percentage}%</td>
                `;
                tbody.appendChild(tr);
            });

            const avgRow = document.createElement('tr');
            avgRow.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 10px; font-weight: bold;">Whole Year Average</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">-</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">-</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">-</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #ff9800;">${yearAverage}%</td>
            `;
            tbody.appendChild(avgRow);
        } else {
            const key = `${selectedYear}-${period}`;
            const info = monthlyData[key];
            const monthName = new Date(selectedYear, parseInt(period, 10) - 1)
                .toLocaleString('default', { month: 'long', year: 'numeric' });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 10px;">${monthName}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${info.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #4CAF50; font-weight: bold;">${info.present}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: #f44336; font-weight: bold;">${info.absent}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${info.percentage}%</td>
            `;
            tbody.appendChild(tr);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to load attendance data');
    }
}

async function downloadMemberReport() {
    const period = document.getElementById('periodSelect').value;
    const selectedYear = new Date().getFullYear();

    try {
        const res = await fetch(`/api/attendance?memberId=${memberId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load attendance');
        const records = await res.json();

        const attendanceDates = new Set();
        records.forEach((r) => {
            const dt = r.check_in || r.date || r.created_at;
            const key = dateKeyFromValue(dt);
            if (key) attendanceDates.add(key);
        });

        let csv = 'Member Attendance Report\r\n';
        csv += `Member: ${memberName}\r\n`;
        csv += `Generated: ${new Date().toLocaleString()}\r\n`;
        csv += `Year: ${selectedYear}\r\n`;

        let targetMonths = [];
        if (period === 'year') {
            targetMonths = [...Array(12).keys()];
            csv += 'Period: Whole Year Average\r\n\r\n';
        } else {
            targetMonths = [parseInt(period, 10) - 1];
            csv += `Period: ${new Date(selectedYear, parseInt(period, 10) - 1).toLocaleString('default', { month: 'long' })}\r\n\r\n`;
        }

        csv += 'Sunday,Status\r\n';
        let totalSundays = 0;
        let totalPresent = 0;

        targetMonths.forEach((monthIndex) => {
            const sundays = getSundaysInMonth(selectedYear, monthIndex);
            sundays.forEach((d) => {
                const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
                const isPresent = attendanceDates.has(key);
                totalSundays++;
                if (isPresent) totalPresent++;
                csv += `${d.toLocaleDateString()},${isPresent ? 'Present' : 'Absent'}\r\n`;
            });
        });

        const average = totalSundays ? Math.round((totalPresent / totalSundays) * 100) : 0;
        csv += `\r\nAverage Attendance,${average}%\r\n`;

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

setDefaultPeriod();
loadMemberAttendanceGraph();
