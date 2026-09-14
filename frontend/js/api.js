import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

// On Vercel (or any static host), there is no backend at "/api" on the same
// domain — the API lives on a separate host (e.g. Render). If VITE_API_URL
// isn't set as a build-time environment variable, every request falls back
// to a relative "/api" path, which the static host will 404 on. This is the
// #1 cause of "signup failed / 404" after deploying. Warn loudly in the
// console so it's obvious what to fix instead of a silent, confusing 404.
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const looksMisconfigured = baseURL === '/api' && !isLocalHost;
if (looksMisconfigured) {
  console.warn(
    '[ParkSlot] VITE_API_URL is not set for this deployment, so API calls are ' +
    `going to ${window.location.origin}/api, which has no backend and will 404. ` +
    'Set VITE_API_URL to your deployed backend URL (e.g. https://your-app.onrender.com/api) ' +
    'in your hosting provider\'s environment variables and redeploy.'
  );
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const path = window.location.pathname;
      const publicPages = ['/login.html', '/signup.html', '/index.html', '/'];
      if (!publicPages.includes(path)) {
        window.location.href = '/login.html';
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error) return err.response.data.error;
  const status = err?.response?.status;
  const isUnreachable =
    err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || status === 502 || status === 503 || status === 504;
  if (isUnreachable) {
    return 'Cannot reach the server. Make sure the backend is running and try again.';
  }
  // A bare, JSON-less 404 on a request to our own baseURL almost always means
  // the frontend is misconfigured (no VITE_API_URL) rather than a real "not
  // found" from the API, which normally returns a JSON { error } body instead.
  if (status === 404 && looksMisconfigured) {
    return 'The app cannot reach its backend (server URL is not configured for this deployment). Please contact the site owner.';
  }
  return err?.message || fallback;
}

export default api;
