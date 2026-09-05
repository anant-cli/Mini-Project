import { escapeHtml } from '/js/sanitize.js';

export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function isLoggedIn() {
  return Boolean(getToken() && getUser());
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// Call at the top of any page that requires login. Optionally restrict to
// specific roles. Redirects and returns null if the check fails, so pages
// can do: `const user = requireAuth(); if (!user) return;`
export function requireAuth(allowedRoles = null) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = '/login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.href = '/index.html';
    return null;
  }
  return user;
}

// Each role sees only the links that match what they're allowed to do:
// a driver searches/books/saves spots, a host/business_host only manages
// their own listings, and an admin only gets the moderation console —
// admins don't book slots or list spots themselves, they oversee the
// platform (users, listings, disputes, reports) from /admin.html.
function navLinksFor(user) {
  switch (user.role) {
    case 'host':
    case 'business_host':
      return '<a href="/host.html">Dashboard</a>';
    case 'admin':
      return '<a href="/admin.html">Admin Console</a>';
    case 'driver':
    default:
      return `
        <a href="/search.html">Search</a>
        <a href="/bookings.html">Bookings</a>
        <a href="/saved.html">Saved</a>
      `;
  }
}

export function updateNavbar() {
  const user = getUser();
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  if (user) {
    navLinks.innerHTML = `
      ${navLinksFor(user)}
      <a href="/account.html">Account</a>
      <span class="nav-user" title="${escapeHtml(user.email)}">Hi, ${escapeHtml(user.name.split(' ')[0])}</span>
      <button id="logout-btn" class="btn">Logout</button>
    `;

    document.getElementById('logout-btn').addEventListener('click', logout);
  } else {
    navLinks.innerHTML = `
      <a href="/login.html" class="btn btn-primary">Login</a>
      <a href="/signup.html" class="btn btn-primary">Sign Up</a>
    `;
  }
}

// Turns the nav into a slide-out mobile menu below the breakpoint. Works by
// toggling a class on <body> that the CSS keys off of, and injecting a
// hamburger button next to the links if one isn't already there.
function setupMobileNav() {
  const navbar = document.querySelector('.navbar .container');
  const navLinks = document.getElementById('nav-links');
  if (!navbar || !navLinks) return;
  if (document.getElementById('nav-toggle')) return;

  const toggle = document.createElement('button');
  toggle.id = 'nav-toggle';
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Toggle menu');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  navbar.appendChild(toggle);

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('nav-open');
    toggle.classList.toggle('nav-toggle-open');
  });

  // Close the menu after tapping a link (better mobile UX).
  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
      navLinks.classList.remove('nav-open');
      toggle.classList.remove('nav-toggle-open');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  setupMobileNav();
});
