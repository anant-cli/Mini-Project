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

export function requireAuth(allowedRoles = null) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = '/login.html';
    return null;
  }
  if (!user.email_verified) {
    window.location.href = '/verify-email.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    window.location.href = '/index.html';
    return null;
  }
  return user;
}

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
    const initial = (user.name || '?').trim().charAt(0).toUpperCase();
    navLinks.innerHTML = `
      ${navLinksFor(user)}
      <a href="/account.html">Account</a>
      <span class="nav-user" title="${escapeHtml(user.email)}">
        <span class="nav-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
        Hi, ${escapeHtml(user.name.split(' ')[0])}
      </span>
      <button id="logout-btn" class="btn">Logout</button>
    `;

    document.getElementById('logout-btn').addEventListener('click', logout);
  } else {
    navLinks.innerHTML = `
      <a href="/login.html" class="btn btn-primary">Login</a>
      <a href="/signup.html" class="btn btn-primary">Sign Up</a>
    `;
  }

  highlightActiveLink();
}

function highlightActiveLink() {
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/index.html';
  navLinks.querySelectorAll('a').forEach((a) => {
    const linkPath = new URL(a.href, window.location.origin).pathname;
    a.classList.toggle('nav-active', linkPath === currentPath);
  });
}

function setupScrollShadow() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const onScroll = () => navbar.classList.toggle('navbar-scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

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

  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
      navLinks.classList.remove('nav-open');
      toggle.classList.remove('nav-toggle-open');
    }
  });
}

function kycNudgeMessage(user) {
  if (user.kyc_status === 'rejected') {
    return 'Your identity verification was rejected. Please resubmit to book or list parking.';
  }
  return 'Verify your identity to book a spot or list your own parking.';
}

export function renderKycNudge() {
  const user = getUser();
  const existing = document.getElementById('kyc-nudge-banner');
  if (existing) existing.remove();

  if (!user || user.role === 'admin') return;
  if (!user.email_verified) return;
  if (!['unsubmitted', 'rejected'].includes(user.kyc_status)) return;
  if (window.location.pathname.replace(/\/$/, '') === '/kyc-setup.html') return;
  if (sessionStorage.getItem('kyc-nudge-dismissed') === '1') return;

  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const banner = document.createElement('div');
  banner.id = 'kyc-nudge-banner';
  banner.className = 'kyc-nudge-banner';
  banner.innerHTML = `
    <span>${escapeHtml(kycNudgeMessage(user))}</span>
    <span class="kyc-nudge-actions">
      <a href="/kyc-setup.html" class="btn btn-primary">Verify now</a>
      <button type="button" class="kyc-nudge-dismiss" aria-label="Dismiss">&#10005;</button>
    </span>
  `;
  navbar.insertAdjacentElement('afterend', banner);

  banner.querySelector('.kyc-nudge-dismiss').addEventListener('click', () => {
    sessionStorage.setItem('kyc-nudge-dismissed', '1');
    banner.remove();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  renderKycNudge();
  setupMobileNav();
  setupScrollShadow();
});
