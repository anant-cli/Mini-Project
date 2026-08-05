export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

export function updateNavbar() {
  const user = getUser();
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  if (user) {
    navLinks.innerHTML = `
      <a href="/search.html">Search</a>
      ${['host', 'business_host'].includes(user.role) ? '<a href="/host.html">Dashboard</a>' : ''}
      ${user.role === 'admin' ? '<a href="/admin.html">Admin</a>' : ''}
      <a href="/bookings.html">Bookings</a>
      <a href="/saved.html">Saved</a>
      <button id="logout-btn" class="clay-btn">Logout</button>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', logout);
  } else {
    navLinks.innerHTML = `
      <a href="/login.html" class="clay-btn">Login</a>
      <a href="/signup.html" class="clay-btn clay-btn-primary">Sign Up</a>
    `;
  }
}

// Call automatically if nav exists
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
});
