import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the JWT token to every request, if we have one.
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

// If the token is invalid/expired, the API returns 401 — clear local
// session state so the UI doesn't keep pretending the user is logged in.
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

// Pulls a readable message out of an API error response. Network failures
// (backend not running, no internet, CORS misconfig) don't get a
// `response` at all, so surface that distinctly instead of a vague
// "Something went wrong" that reads like a wrong-password error.
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error) return err.response.data.error;
  const status = err?.response?.status;
  const isUnreachable =
    err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || status === 502 || status === 503 || status === 504;
  if (isUnreachable) {
    return 'Cannot reach the server. Make sure the backend is running and try again.';
  }
  return err?.message || fallback;
}

export default api;
