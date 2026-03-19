/**
 * src/components/main/home_components/CrimeProfileMatcher.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout addition:
 *  The middle column previously had empty space below the "Match Settings"
 *  card. Two new cards have been added to fill it meaningfully:
 *
 *  1. M.O. Pattern Frequency  — counts the most common modus operandi keywords
 *     across all loaded incidents and renders them as labelled progress bars.
 *     This gives investigators a quick sense of dominant attack patterns before
 *     they run a match, and updates reactively as the incident list filters.
 *
 *  2. Dataset Breakdown  — a compact table showing how many incidents exist per
 *     crime type, with a colour-coded severity indicator. Helps the user pick
 *     the right incident to match against without having to scroll the left list.
 *
 * Bug fix retained from previous version:
 *  getCrimeTypeName() safely resolves crime_type whether it is an object
 *  { id, name } or a plain string, preventing the original TypeError.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncidents, runProfileMatch } from '../../../services/crimeService';

// ─── Safely extract the crime type name ──────────────────────────────────────
const getCrimeTypeName = (incident) => {
  const ct = incident?.crime_type;
  if (!ct) return 'Unknown';
  if (typeof ct === 'string') return ct;
  if (typeof ct === 'object' && ct.name) return ct.name;
  return 'Unknown';
};

// ─── Build a short display ID ─────────────────────────────────────────────────
const buildCaseId = (incident) => {
  if (!incident) return '—';
  const typeName = getCrimeTypeName(incident);          // always a string
  return `${typeName.slice(0, 3).toUpperCase()}-${String(incident.id).padStart(4, '0')}`;
};

// ─── Derive top MO keywords from an array of incidents ───────────────────────
// Splits each modus_operandi / description string into words, strips stopwords,
// and returns the top N by frequency as [{ word, count }].
const STOPWORDS = new Set([
  'the','and','a','an','to','of','in','on','was','were','is','at','by','from',
  'with','into','for','had','has','that','this','which','while','then','their',
  'have','been','its','be','as','or','but','not','are','it','he','she','they',
]);

const getMOKeywords = (incidents, topN = 8) => {
  const freq = {};
  incidents.forEach(inc => {
    const text = (inc.modus_operandi ?? inc.description ?? '').toLowerCase();
    text.replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
      if (w.length > 3 && !STOPWORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1;
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
};

// ─── Count incidents per crime type ──────────────────────────────────────────
const getCrimeTypeCounts = (incidents) => {
  const counts = {};
  incidents.forEach(inc => {
    const name = getCrimeTypeName(inc);
    counts[name] = (counts[name] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
};

// ─── Severity colour by incident count ───────────────────────────────────────
const severityClass = (count, max) => {
  const ratio = count / max;
  if (ratio >= 0.7) return 'danger';
  if (ratio >= 0.4) return 'warning';
  return 'success';
};

// ─── Incident list card ───────────────────────────────────────────────────────
const IncidentCard = ({ incident, selected, onSelect }) => (
  <div
    className={`card mb-2 border ${selected ? 'border-primary shadow' : ''}`}
    style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
    onClick={() => onSelect(incident)}
  >
    <div className="card-body py-2 px-3">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <strong className="text-primary" style={{ fontSize: '0.8rem' }}>
            {buildCaseId(incident)}
          </strong>
          <span className="ms-2 text-muted small">{getCrimeTypeName(incident)}</span>
        </div>
        <span
          className={`badge ${
            incident.status === 'resolved' || incident.status === 'closed'
              ? 'bg-success'
              : incident.status === 'investigating'
              ? 'bg-warning text-dark'
              : 'bg-secondary'
          }`}
          style={{ fontSize: '0.65rem' }}
        >
          {incident.status ?? '—'}
        </span>
      </div>
      <div className="small text-muted mt-1">
        <i className="bi bi-geo-alt me-1"></i>
        {incident.suburb ?? incident.area ?? 'Unknown area'}
        <span className="ms-3">
          <i className="bi bi-calendar me-1"></i>
          {incident.timestamp ? new Date(incident.timestamp).toLocaleDateString() : '—'}
        </span>
      </div>
      {(incident.description || incident.modus_operandi) && (
        <p className="small mb-0 mt-1 text-muted text-truncate" style={{ maxWidth: 280 }}>
          {incident.description ?? incident.modus_operandi}
        </p>
      )}
    </div>
  </div>
);

// ─── Similar case result card ─────────────────────────────────────────────────
const SimilarCard = ({ incident }) => (
  <div className="card mb-2" style={{ borderLeft: '3px solid #1e8449' }}>
    <div className="card-body py-2 px-3">
      <div className="d-flex justify-content-between align-items-start">
        <strong className="text-success" style={{ fontSize: '0.8rem' }}>
          {buildCaseId(incident)}
        </strong>
        <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '0.65rem' }}>
          {incident.similarity_score != null
            ? `${(incident.similarity_score * 100).toFixed(0)}% match`
            : 'Similar'}
        </span>
      </div>
      <div className="small text-muted">
        {getCrimeTypeName(incident)} &mdash;{' '}
        {incident.suburb ?? incident.area ?? '—'}
      </div>
      {(incident.description || incident.modus_operandi) && (
        <p className="small text-muted mb-0 mt-1 text-truncate">
          {incident.description ?? incident.modus_operandi}
        </p>
      )}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
function CrimeProfileMatcher() {
  const [searchQuery, setSearchQuery]           = useState('');
  const [matchThreshold, setMatchThreshold]     = useState(5);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [similarCases, setSimilarCases]         = useState([]);
  const [matchLoading, setMatchLoading]         = useState(false);
  const [matchError, setMatchError]             = useState('');
  const [incidents, setIncidents]               = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [filters, setFilters]                   = useState({ crimeType: 'all', status: 'all' });

  // ── Fetch incidents ────────────────────────────────────────────────────────
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.crimeType !== 'all') params.crime_type_id = filters.crimeType;
      if (filters.status    !== 'all') params.status        = filters.status;
      const data = await getIncidents(params);
      setIncidents(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      console.error('[CPM] fetch error:', err);
      setError('Failed to load incidents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  // ── Client-side search ────────────────────────────────────────────────────
  const filteredIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter(inc =>
      String(inc.id).includes(q) ||
      getCrimeTypeName(inc).toLowerCase().includes(q) ||
      (inc.suburb ?? inc.area ?? '').toLowerCase().includes(q) ||
      (inc.description ?? inc.modus_operandi ?? '').toLowerCase().includes(q),
    );
  }, [incidents, searchQuery]);

  // ── Derived analytics for the new middle-column cards ─────────────────────
  // Recompute whenever the loaded incident list changes.
  const moKeywords    = useMemo(() => getMOKeywords(incidents),        [incidents]);
  const typeCounts    = useMemo(() => getCrimeTypeCounts(incidents),   [incidents]);
  const maxTypeCount  = typeCounts[0]?.count ?? 1;
  const maxKeyword    = moKeywords[0]?.count ?? 1;

  // ── Run profile match ─────────────────────────────────────────────────────
  const handleFindSimilar = async () => {
    if (!selectedIncident) return;
    setMatchLoading(true);
    setMatchError('');
    setSimilarCases([]);
    try {
      const result  = await runProfileMatch(selectedIncident.id, matchThreshold);
      const matches = result.matches ?? result.similar_cases ?? [];
      setSimilarCases(matches);
      if (matches.length === 0)
        setMatchError('No similar cases found. The model may need more training data.');
    } catch (err) {
      setMatchError(err.response?.data?.detail ?? 'Profile matching failed. Please try again.');
    } finally {
      setMatchLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="topbar container-fluid p-0">

      {/* ── Sticky page header ──────────────────────────────────────────── */}
      <div className="page-topbar">
        <div>
          <h1 className="page-title mb-0" style={{ fontSize: '1rem' }}>
            <i className="bi bi-diagram-3"></i> Crime Profile Matcher
          </h1>
          <small className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '26px' }}>
            RandomForest ML — find incidents with similar modus operandi
          </small>
        </div>
        <div className="topbar-actions">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={fetchIncidents}
            disabled={loading}
          >
            <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
            Reload
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="page-content">

        {error && (
          <div className="alert alert-danger alert-dismissible mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        <div className="row g-3">

          {/* ════════════════════════════════════════════════════════════
              LEFT COL — incident search list
          ════════════════════════════════════════════════════════════ */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-blue d-flex align-items-center justify-content-between">
                <span><i className="bi bi-list-ul me-2"></i>Incident List</span>
                <span className="badge badge-reported">{filteredIncidents.length}</span>
              </div>
              <div className="card-body p-2">
                {/* Search */}
                <div className="input-group input-group-sm mb-2">
                  <span className="input-group-text"><i className="bi bi-search"></i></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by type, area, M.O.…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="btn btn-outline-secondary" onClick={() => setSearchQuery('')}>
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
                {/* Status filter */}
                <select
                  className="form-select form-select-sm mb-2"
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="all">All statuses</option>
                  <option value="reported">Reported</option>
                  <option value="investigating">Investigating</option>
                  <option value="closed">Closed</option>
                </select>
                {/* Scrollable list */}
                <div style={{ maxHeight: '100vh', overflowY: 'auto' }}>
                  {loading && (
                    <div className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      <p className="text-muted small mt-2 mb-0">Loading incidents…</p>
                    </div>
                  )}
                  {!loading && filteredIncidents.length === 0 && (
                    <p className="text-muted text-center py-4 small mb-0">
                      No incidents match the current filters.
                    </p>
                  )}
                  {!loading && filteredIncidents.map(inc => (
                    <IncidentCard
                      key={inc.id}
                      incident={inc}
                      selected={selectedIncident?.id === inc.id}
                      onSelect={setSelectedIncident}
                    />
                  ))}
                </div>
              </div>
              {/* Footer count */}
              <div className="card-footer bg-white py-2" style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                <i className="bi bi-info-circle me-1"></i>
                {incidents.length} total incidents loaded
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              MIDDLE COL — selected incident detail + match controls
                           + M.O. pattern analysis + dataset breakdown
          ════════════════════════════════════════════════════════════ */}
          <div className="col-md-4 d-flex flex-column gap-3">

            {/* ── Selected incident detail ──────────────────────────── */}
            <div className="card shadow-sm">
              <div className="card-header card-header-accent-dark">
                <i className="bi bi-file-earmark-text me-2"></i>Selected Incident
              </div>
              <div className="card-body">
                {!selectedIncident ? (
                  <p className="text-muted text-center py-3 small mb-0">
                    <i className="bi bi-hand-index-thumb fs-3 d-block mb-2 text-muted"></i>
                    Click an incident on the left to select it
                  </p>
                ) : (
                  <>
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '35%' }}>Case ID</td>
                          <td><strong className="text-primary">{buildCaseId(selectedIncident)}</strong></td>
                        </tr>
                        <tr>
                          <td className="text-muted">Crime Type</td>
                          <td>{getCrimeTypeName(selectedIncident)}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Area</td>
                          <td>{selectedIncident.suburb ?? selectedIncident.area ?? '—'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Status</td>
                          <td>
                            <span className={`badge ${
                              selectedIncident.status === 'resolved' || selectedIncident.status === 'closed'
                                ? 'badge-closed'
                                : selectedIncident.status === 'investigating'
                                ? 'badge-investigating'
                                : 'badge-reported'
                            }`}>
                              {selectedIncident.status}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted">Date</td>
                          <td>
                            {selectedIncident.timestamp
                              ? new Date(selectedIncident.timestamp).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {(selectedIncident.description || selectedIncident.modus_operandi) && (
                      <p className="small text-muted mt-2 border-top pt-2 mb-0">
                        <strong>M.O.:</strong>{' '}
                        {selectedIncident.description ?? selectedIncident.modus_operandi}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Match settings ────────────────────────────────────── */}
            <div className="card shadow-sm">
              <div className="card-header card-header-accent-dark">
                <i className="bi bi-sliders me-2"></i>Match Settings
              </div>
              <div className="card-body">
                <label className="form-label">
                  Top N results: <strong>{matchThreshold}</strong>
                </label>
                <input
                  type="range"
                  className="form-range mb-3"
                  min={3} max={20} step={1}
                  value={matchThreshold}
                  onChange={e => setMatchThreshold(Number(e.target.value))}
                />
                <button
                  className="btn btn-primary w-100"
                  onClick={handleFindSimilar}
                  disabled={!selectedIncident || matchLoading}
                >
                  {matchLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Matching…
                    </>
                  ) : (
                    <><i className="bi bi-cpu me-2"></i>Find Similar Cases</>
                  )}
                </button>
                {!selectedIncident && (
                  <p className="text-muted small mt-2 mb-0 text-center">
                    Select an incident first
                  </p>
                )}
              </div>
            </div>

            {/* ── M.O. Pattern Frequency ────────────────────────────── */}
            {/*
             * Analyses the modus_operandi / description text of every loaded
             * incident, extracts the most frequently appearing keywords (after
             * stripping stopwords), and renders them as labelled progress bars.
             * Helps investigators spot dominant attack patterns at a glance —
             * e.g. if "vehicle" and "smashed" dominate, vehicle break-ins are
             * the primary concern in the current dataset filter.
             */}
            <div className="card shadow-sm">
              <div className="card-header card-header-accent-blue">
                <i className="bi bi-text-paragraph me-2"></i>M.O. Pattern Frequency
                <span
                  className="ms-2 text-muted"
                  style={{ fontSize: '0.7rem', fontWeight: 400 }}
                >
                  top keywords across loaded incidents
                </span>
              </div>
              <div className="card-body pb-2">
                {moKeywords.length === 0 ? (
                  <p className="text-muted small mb-0 text-center py-2">
                    No modus operandi data available.
                  </p>
                ) : (
                  moKeywords.map(({ word, count }) => (
                    <div key={word} className="mb-2">
                      <div className="d-flex justify-content-between" style={{ fontSize: '0.78rem' }}>
                        {/* Capitalise the first letter of each keyword */}
                        <span className="text-capitalize text-dark">{word}</span>
                        <span className="text-muted">{count}×</span>
                      </div>
                      <div className="progress" style={{ height: '5px' }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: `${(count / maxKeyword) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Dataset Breakdown by Crime Type ──────────────────── */}
            {/*
             * Shows the count of loaded incidents per crime type in a compact
             * table with a colour-coded severity badge. High-count types are
             * marked red, medium yellow, low green — matching ZRP operational
             * risk language. Helps analysts quickly identify which crime types
             * dominate the current filter before running a profile match.
             */}
            <div className="card shadow-sm">
              <div className="card-header card-header-accent-dark">
                <i className="bi bi-bar-chart-steps me-2"></i>Dataset Breakdown
                <span
                  className="ms-2 text-muted"
                  style={{ fontSize: '0.7rem', fontWeight: 400 }}
                >
                  incidents by crime type
                </span>
              </div>
              <div className="card-body p-0">
                {typeCounts.length === 0 ? (
                  <p className="text-muted small mb-0 text-center py-3">
                    No data loaded.
                  </p>
                ) : (
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Crime Type</th>
                        <th className="text-end">Count</th>
                        <th className="text-end">Share</th>
                        <th className="text-center">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeCounts.map(({ name, count }) => {
                        const pct  = incidents.length
                          ? ((count / incidents.length) * 100).toFixed(1)
                          : '0.0';
                        const sev  = severityClass(count, maxTypeCount);
                        const sevLabel = sev === 'danger' ? 'High' : sev === 'warning' ? 'Med' : 'Low';
                        return (
                          <tr key={name}>
                            <td style={{ fontSize: '0.78rem' }}>{name}</td>
                            <td className="text-end fw-semibold" style={{ fontSize: '0.78rem' }}>{count}</td>
                            <td className="text-end text-muted" style={{ fontSize: '0.75rem' }}>{pct}%</td>
                            <td className="text-center">
                              <span className={`badge bg-${sev} ${sev === 'warning' ? 'text-dark' : ''}`}
                                style={{ fontSize: '0.6rem', minWidth: '32px' }}>
                                {sevLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>{/* end middle col */}

          {/* ════════════════════════════════════════════════════════════
              RIGHT COL — similar cases results
          ════════════════════════════════════════════════════════════ */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-green d-flex align-items-center justify-content-between">
                <span><i className="bi bi-diagram-3 me-2"></i>Similar Cases</span>
                {similarCases.length > 0 && (
                  <span className="badge badge-closed">{similarCases.length} found</span>
                )}
              </div>
              <div className="card-body overflow-auto" style={{ maxHeight: 640 }}>
                {matchError && (
                  <div className="alert alert-warning py-2 mb-2" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-exclamation-triangle me-2"></i>{matchError}
                  </div>
                )}
                {!matchLoading && similarCases.length === 0 && !matchError && (
                  <p className="text-muted text-center py-5 small mb-0">
                    <i className="bi bi-cpu fs-2 d-block mb-2 text-muted"></i>
                    Select an incident and run the matcher to see results
                  </p>
                )}
                {matchLoading && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-success" role="status" />
                    <p className="text-muted small mt-2">Running RandomForest matcher…</p>
                  </div>
                )}
                {similarCases.map(inc => (
                  <SimilarCard key={inc.id} incident={inc} />
                ))}
              </div>
            </div>
          </div>

        </div>{/* end row */}
      </div>{/* end page-content */}
    </div>
  );
}

export default CrimeProfileMatcher;