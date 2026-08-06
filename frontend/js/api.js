import axios from 'axios';

// In dev, Vite proxies /api to the local backend (see vite.config.js).
// In production (Vercel), there is no proxy, so we need the real backend
// URL. Set VITE_API_URL in Vercel's project env vars, e.g.
//   VITE_API_URL=https://mini-project-io6q.onrender.com/api
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
    }
    return Promise.reject(error);
  }
);

// Pulls a readable message out of an API error response.
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error || err?.message || fallback;
}

export default api;
