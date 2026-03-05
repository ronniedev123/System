// This file is deprecated - all attendance functionality is now in attendance.html
// Keeping minimal compatible code for backward compatibility

const token = localStorage.getItem("token");

if (!token && window.location.pathname.endsWith('attendance.html')) {
    window.location.href = 'index.html';
}

// All functionality is now in attendance.html
console.log('Attendance system loaded');
