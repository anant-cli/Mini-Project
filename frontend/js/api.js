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

// Pulls a readable message out of an API error response.
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error || err?.message || fallback;
}

export default api;
