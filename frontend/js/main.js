// js/main.js

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorEl = document.getElementById('error');

// ==================== LOGIN ====================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token); // store JWT
                localStorage.setItem('role', data.role || (data.user && data.user.role));
                localStorage.setItem('name', data.name || (data.user && data.user.name));
                window.location.href = 'dashboard.html';
            } else {
                errorEl.textContent = data.error || data.message || 'Login failed';
            }
        } catch (err) {
            console.error(err);
            errorEl.textContent = 'Server error';
        }
    });
}

// ==================== REGISTRATION ====================
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const res = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();
            if (res.ok) {
                // Automatically log in the new user
                const loginRes = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const loginData = await loginRes.json();
                if (loginRes.ok) {
                    localStorage.setItem('token', loginData.token);
                    localStorage.setItem('role', loginData.role || (loginData.user && loginData.user.role));
                    window.location.href = 'dashboard.html';
                } else {
                    errorEl.textContent = loginData.error || loginData.message || 'Login failed after registration';
                }
            } else {
                errorEl.textContent = data.message || 'Registration failed';
            }
        } catch (err) {
            console.error(err);
            errorEl.textContent = 'Server error';
        }
    });
}
