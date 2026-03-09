/**
 * src/services/crimeService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All backend API calls for ZimCrimeWatch — one import covers every component.
 * Every function uses the shared `api` Axios instance (JWT auto-attached,
 * 401 refresh/redirect handled transparently).
 *
 * Backend base: /api   (set via VITE_API_BASE_URL in .env)
 *
 * Endpoints mapped
 * ────────────────
 * Dashboard   GET  /zrp/dashboard/summary/
 * Incidents   GET  /zrp/incidents/          POST /zrp/incidents/
 *             GET  /zrp/incidents/:id/      PUT  /zrp/incidents/:id/
 *             DEL  /zrp/incidents/:id/      GET  /zrp/incidents/:id/similar/
 * Crime Types GET  /zrp/crime-types/        POST /zrp/crime-types/
 *             GET  /zrp/crime-types/:id/    PUT  /zrp/crime-types/:id/
 *             DEL  /zrp/crime-types/:id/
 * Analytics   POST /zrp/analytics/heatmap/
 *             POST /zrp/analytics/timeseries/
 *             POST /zrp/analytics/hotspots/
 *             POST /zrp/analytics/profile-match/
 * Users       GET  /zrp/users/              POST /zrp/users/
 *             GET  /zrp/users/:id/          PUT  /zrp/users/:id/
 *             DEL  /zrp/users/:id/
 * ML          POST /zrp/ml/train/
 * Public      GET  /public/crimes/
 *             GET  /public/crime-types/
 */

import api from './api';

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/zrp/dashboard/summary/
 * Returns KPI counts: total_incidents, last_7_days, last_30_days, by_status, top_types
 */
export const getDashboardSummary = () =>
  api.get('/zrp/dashboard/summary/').then((r) => r.data);

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENTS (ZRP CRUD)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/zrp/incidents/
 * @param {object} params  — optional filters: crime_type_id, suburb, status, start_date, end_date
 */
export const getIncidents = (params = {}) =>
  api.get('/zrp/incidents/', { params }).then((r) => r.data);

/**
 * POST /api/zrp/incidents/
 * @param {object} data — incident payload
 */
export const createIncident = (data) =>
  api.post('/zrp/incidents/', data).then((r) => r.data);

/**
 * GET /api/zrp/incidents/:id/
 */
export const getIncident = (id) =>
  api.get(`/zrp/incidents/${id}/`).then((r) => r.data);

/**
 * PUT /api/zrp/incidents/:id/   (partial update)
 */
export const updateIncident = (id, data) =>
  api.put(`/zrp/incidents/${id}/`, data).then((r) => r.data);

/**
 * DELETE /api/zrp/incidents/:id/
 */
export const deleteIncident = (id) =>
  api.delete(`/zrp/incidents/${id}/`);

/**
 * GET /api/zrp/incidents/:id/similar/
 * Returns top-N similar incidents via the RandomForest ProfileMatcher.
 * @param {number} id
 * @param {number} topN   default 5
 */
export const getSimilarIncidents = (id, topN = 5) =>
  api.get(`/zrp/incidents/${id}/similar/`, { params: { top_n: topN } }).then((r) => r.data);

// ═══════════════════════════════════════════════════════════════════════════════
// CRIME TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/zrp/crime-types/ */
export const getCrimeTypes = () =>
  api.get('/zrp/crime-types/').then((r) => r.data);

/** POST /api/zrp/crime-types/ */
export const createCrimeType = (data) =>
  api.post('/zrp/crime-types/', data).then((r) => r.data);

/** PUT /api/zrp/crime-types/:id/ */
export const updateCrimeType = (id, data) =>
  api.put(`/zrp/crime-types/${id}/`, data).then((r) => r.data);

/** DELETE /api/zrp/crime-types/:id/ */
export const deleteCrimeType = (id) =>
  api.delete(`/zrp/crime-types/${id}/`);

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/zrp/analytics/heatmap/
 * Returns [[lat, lng, intensity], …] for Leaflet heatmap plugin.
 *
 * @param {object} filters
 *   crime_type_id?: number
 *   start_date?:   'YYYY-MM-DD'
 *   end_date?:     'YYYY-MM-DD'
 *   bandwidth?:    number   (KDE bandwidth, default 0.01)
 */
export const getHeatmapData = (filters = {}) =>
  api.post('/zrp/analytics/heatmap/', filters).then((r) => r.data);

/**
 * POST /api/zrp/analytics/timeseries/
 * Returns { dates[], observed[], trend[], seasonal[], residual[] }
 *
 * @param {object} filters
 *   crime_type_id?: number
 *   start_date?:   'YYYY-MM-DD'
 *   end_date?:     'YYYY-MM-DD'
 *   freq?:         'D' | 'W' | 'M'  (default 'M')
 */
export const getTimeSeries = (filters = {}) =>
  api.post('/zrp/analytics/timeseries/', filters).then((r) => r.data);

/**
 * POST /api/zrp/analytics/hotspots/
 * Returns [{ area, suburb, incident_count, risk_level, centre_lat, centre_lng }, …]
 *
 * @param {object} filters — same optional params as heatmap
 */
export const getHotspots = (filters = {}) =>
  api.post('/zrp/analytics/hotspots/', filters).then((r) => r.data);

/**
 * POST /api/zrp/analytics/profile-match/
 * Runs the RandomForest ProfileMatcher and returns similar incidents.
 *
 * @param {number} incidentId
 * @param {number} topN         default 5
 */
export const runProfileMatch = (incidentId, topN = 5) =>
  api
    .post('/zrp/analytics/profile-match/', { incident_id: incidentId, top_n: topN })
    .then((r) => r.data);

// ═══════════════════════════════════════════════════════════════════════════════
// USERS  (admin only)
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/zrp/users/ */
export const getUsers = () =>
  api.get('/zrp/users/').then((r) => r.data);

/** POST /api/zrp/users/ */
export const createUser = (data) =>
  api.post('/zrp/users/', data).then((r) => r.data);

/** PUT /api/zrp/users/:id/ */
export const updateUser = (id, data) =>
  api.put(`/zrp/users/${id}/`, data).then((r) => r.data);

/** DELETE /api/zrp/users/:id/ */
export const deleteUser = (id) =>
  api.delete(`/zrp/users/${id}/`);

// ═══════════════════════════════════════════════════════════════════════════════
// ML TRAINING  (admin only)
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /api/zrp/ml/train/  — triggers re-training of the RandomForest model */
export const triggerMLTraining = () =>
  api.post('/zrp/ml/train/').then((r) => r.data);

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC  (no auth required — Flutter app & public map)
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/public/crimes/ — anonymised, public-facing crime pins */
export const getPublicCrimes = (params = {}) =>
  api.get('/public/crimes/', { params }).then((r) => r.data);

/** GET /api/public/crime-types/ */
export const getPublicCrimeTypes = () =>
  api.get('/public/crime-types/').then((r) => r.data);

// ═══════════════════════════════════════════════════════════════════════════════
// DATA UPLOAD  — add this block to the bottom of src/services/crimeService.js
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * uploadCSV
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/zrp/data/upload-csv/
 *
 * Sends a CSV file to the backend bulk-upload endpoint.
 * Must be sent as multipart/form-data with the file under the key "file".
 *
 * The shared `api` Axios instance automatically attaches the JWT Bearer token
 * via its request interceptor, so no manual auth header is needed here.
 *
 * @param {File}     file           — the File object from an <input type="file">
 * @param {Function} onProgress     — optional callback(percentComplete: number)
 * @returns {Promise<{ created: number, skipped: number, errors: Array }>}
 */
export const uploadCSV = (file, onProgress) => {
  // Build a FormData payload — this forces Axios to use multipart/form-data
  // and properly encode the binary file alongside any metadata fields.
  const formData = new FormData();
  formData.append('file', file); // key must match request.FILES.get("file") in Django

  return api
    .post('/zrp/data/upload-csv/', formData, {
      // Override the default 'application/json' Content-Type so Axios sets
      // the correct multipart boundary that the server needs to parse the body.
      headers: { 'Content-Type': 'multipart/form-data' },

      // onUploadProgress fires as the browser streams the file to the server.
      // loaded / total gives us a 0–100 percentage we can pass to a progress bar.
      onUploadProgress: onProgress
        ? (progressEvent) => {
            const percent = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            onProgress(percent);
          }
        : undefined,
    })
    .then((r) => r.data);
};