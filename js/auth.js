// Simple authentication (client-side only - not secure for production)
const VALID_USERS = [
    { username: 'user', password: 'pass' }
];

// Check if user is logged in
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const currentUser = sessionStorage.getItem('currentUser');
    const path = window.location.pathname.toLowerCase();
    const onLoginPage = path.endsWith('/index.html') || path.endsWith('/');

    if (!isLoggedIn && !onLoginPage) {
        window.location.href = 'index.html';
        return;
    }

    if (isLoggedIn && currentUser) {
        const welcomeEl = document.getElementById('welcomeUser');
        if (welcomeEl) {
            welcomeEl.textContent = `Welcome, ${currentUser}!`;
        }
    }
}

// Handle login
function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const user = VALID_USERS.find(u =>
        u.username === username && u.password === password
    );

    if (user) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('currentUser', username);
        window.location.href = 'dashboard.html';
    } else {
        let errorDiv = document.querySelector('.error-msg');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-msg';
            const form = document.getElementById('loginForm');
            form.parentNode.insertBefore(errorDiv, form);
        }
        errorDiv.textContent = 'Invalid username or password';
        errorDiv.style.display = 'block';
    }

    return false;
}

// Handle logout
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Add custom user (call this in console to add more users)
function addUser(username, password) {
    VALID_USERS.push({ username, password });
    console.log(`User ${username} added!`);
}
