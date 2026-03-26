// js/main.js

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorEl = document.getElementById('error');
const regErrorEl = document.getElementById('regError');

async function readJsonSafely(res) {
    const text = await res.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (err) {
        const compactText = text.replace(/\s+/g, " ").trim();
        return {
            message: compactText,
            rawText: text,
            isHtmlResponse: /<html[\s>]/i.test(text)
        };
    }
}

// ==================== LOGIN ====================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (errorEl) errorEl.textContent = '';
        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });

            const data = await readJsonSafely(res);
            if (res.ok) {
                localStorage.setItem('token', data.token); // store JWT
                localStorage.setItem('role', data.role || (data.user && data.user.role));
                localStorage.setItem('name', data.name || (data.user && data.user.name));
                window.location.href = 'dashboard.html';
            } else {
                const deploymentHint = data.isHtmlResponse && res.status === 405
                    ? 'Login API is not available on this deployed link. Deploy the Node server, not only the static site.'
                    : '';
                if (errorEl) errorEl.textContent = deploymentHint || data.error || data.message || 'Login failed';
            }
        } catch (err) {
            console.error(err);
            if (errorEl) errorEl.textContent = 'Unable to reach the server. Please try again.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// ==================== REGISTRATION ====================
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('regRole').value;
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        if (regErrorEl) regErrorEl.textContent = '';
        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password, role })
            });

            const data = await readJsonSafely(res);
            if (res.ok) {
                if (regErrorEl) regErrorEl.textContent = data.message || 'Account created. Wait for admin approval.';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1800);
            } else {
                if (regErrorEl) regErrorEl.textContent = data.error || data.message || 'Registration failed';
            }
        } catch (err) {
            console.error(err);
            if (regErrorEl) regErrorEl.textContent = 'Unable to reach the server. Please try again.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}
