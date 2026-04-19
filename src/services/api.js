/**
 * src/services/api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised Axios instance for ZimCrimeWatch frontend → backend communication.
 *
 * Features
 * --------
 *  • baseURL pulled from VITE_API_BASE_URL env variable (falls back to localhost)
 *  • Request interceptor  — attaches "Authorization: Bearer <access>" header
 *  • Response interceptor — on 401, attempts a silent token refresh via
 *    /api/public/auth/token/refresh/ and retries the original request once.
 *    If the refresh also fails the user is redirected to the login page.
 */

import axios from 'axios';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://zcw-backend-production.up.railway.app/api';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor ──────────────────────────────────────────────────────
// Attach the JWT access token (if present) to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor ─────────────────────────────────────────────────────
// On a 401 response, try to silently refresh the access token once.
// If the refresh succeeds, replay the original request.
// If the refresh also returns 401/400, clear storage and go to login.

let isRefreshing = false;
let refreshQueue = []; // callbacks waiting for the new access token

const processQueue = (error, token = null) => {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors that have NOT already been retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh on the login or refresh endpoints themselves
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login/') ||
        originalRequest.url?.includes('/auth/token/refresh/');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh resolves
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh');

      if (!refreshToken) {
        // No refresh token stored — send the user back to login
        _redirectToLogin();
        return Promise.reject(error);
      }

      try {
        // Use a plain axios call (not our instance) to avoid interceptor loops
        const { data } = await axios.post(
          `${BASE_URL}/public/auth/token/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const newAccessToken = data.access;
        localStorage.setItem('token', newAccessToken);

        // If the backend rotates refresh tokens, persist the new one too
        if (data.refresh) {
          localStorage.setItem('refresh', data.refresh);
        }

        // Update the default header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        // Replay the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        _redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Helper ───────────────────────────────────────────────────────────────────
function _redirectToLogin() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
  // Use replace so the browser back-button won't return to the protected page
  window.location.replace('/');
}

export default api;
