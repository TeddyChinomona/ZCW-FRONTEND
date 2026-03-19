/**
 * src/services/authService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper around the ZimCrimeWatch authentication endpoints.
 *
 * All paths match zimcrimewatch/urls.py:
 *   POST  /api/public/auth/login/
 *   POST  /api/public/auth/token/refresh/
 *   POST  /api/public/auth/logout/
 */

import api from './api';

// ─── Login ────────────────────────────────────────────────────────────────────
/**
 * Authenticate a ZRP officer.
 *
 * @param {string} zrp_badge_number
 * @param {string} password
 * @returns {Promise<{ access: string, refresh: string, user: object }>}
 */
export async function login(zrp_badge_number, password) {
  const response = await api.post('https://d0fe-2605-59c1-3525-a310-6411-19be-d719-3b70.ngrok-free.app/public/auth/login/', {
    zrp_badge_number,
    password,
  });

  const { access, refresh, user } = response.data;

  // Persist tokens and basic user info
  localStorage.setItem('token', access);
  localStorage.setItem('refresh', refresh);
  localStorage.setItem('user', JSON.stringify(user));

  return response.data;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
/**
 * Blacklist the current refresh token on the backend, then clear local storage.
 */
export async function logout() {
  const refresh = localStorage.getItem('refresh');

  try {
    if (refresh) {
      // Tell the backend to blacklist this refresh token
      await api.post('/public/auth/logout/', { refresh });
    }
  } finally {
    // Always clear local state regardless of server response
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
  }
}

// ─── Get current user ─────────────────────────────────────────────────────────
/**
 * Return the stored user object, or null if not logged in.
 * @returns {object|null}
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Check auth ───────────────────────────────────────────────────────────────
/**
 * Quick check — true if an access token is present in localStorage.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('token');
}
