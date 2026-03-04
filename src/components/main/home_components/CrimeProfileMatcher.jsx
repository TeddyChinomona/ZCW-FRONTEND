/**
 * src/components/main/home_components/CrimeProfileMatcher.jsx  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *  • Removed all hardcoded suspectProfiles, crimeCases, moPatterns mock arrays
 *  • On mount: loads real incidents from GET /api/zrp/incidents/
 *  • Search input now filters live incident data by case reference, crime type,
 *    suburb, and modus operandi description
 *  • Selecting an incident and clicking "Find Similar" calls:
 *      POST /api/zrp/analytics/profile-match/  (RandomForest ML backend)
 *    and displays the returned similar cases
 *  • All UI structure (tabs, MatchCard, detail panel) preserved and adapted
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncidents, runProfileMatch } from '../../../services/crimeService';

// ─── Risk badge helper ────────────────────────────────────────────────────────
const riskBadge = (level) => {
  const map = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'success' };
  return map[level] ?? 'secondary';
};

// ─── Incident card ────────────────────────────────────────────────────────────
const IncidentCard = ({ incident, selected, onSelect }) => (
  <div
    className={`card mb-2 border ${selected ? 'border-primary shadow' : ''}`}
    style={{ cursor: 'pointer' }}
    onClick={() => onSelect(incident)}
  >
    <div className="card-body py-2 px-3">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <strong className="text-primary">#{incident.id}</strong>
          <span className="ms-2 text-muted small">{incident.crime_type?.name ?? 'Unknown'}</span>
        </div>
        <span className={`badge bg-${incident.status === 'resolved' ? 'success' : 'warning'}`}>
          {incident.status}
        </span>
      </div>
      <div className="small text-muted mt-1">
        <i className="bi bi-geo-alt me-1"></i>{incident.suburb ?? 'Unknown area'}
        <span className="ms-3">
          <i className="bi bi-calendar me-1"></i>
          {incident.timestamp ? new Date(incident.timestamp).toLocaleDateString() : '—'}
        </span>
      </div>
      {incident.description && (
        <p className="small mb-0 mt-1 text-truncate" style={{ maxWidth: 280 }}>
          {incident.description}
        </p>
      )}
    </div>
  </div>
);

// ─── Similar case card ────────────────────────────────────────────────────────
const SimilarCard = ({ incident }) => (
  <div className="card mb-2 border-success">
    <div className="card-body py-2 px-3">
      <div className="d-flex justify-content-between">
        <strong className="text-success">#{incident.id}</strong>
        <span className="badge bg-success bg-opacity-10 text-success">
          {incident.similarity_score != null ? `${(incident.similarity_score * 100).toFixed(0)}% match` : 'Similar'}
        </span>
      </div>
      <div className="small text-muted">
        {incident.crime_type?.name ?? '—'} &mdash; {incident.suburb ?? '—'}
      </div>
      {incident.description && (
        <p className="small text-muted mb-0 text-truncate">{incident.description}</p>
      )}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
function CrimeProfileMatcher() {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchThreshold, setMatchThreshold] = useState(5); // top_n
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [similarCases, setSimilarCases] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState('');

  // ── Incidents from API ───────────────────────────────────────────────────
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ crimeType: 'all', status: 'all' });

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.crimeType !== 'all') params.crime_type_id = filters.crimeType;
      if (filters.status !== 'all') params.status = filters.status;
      const data = await getIncidents(params);
      setIncidents(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      console.error('Incidents fetch error:', err);
      setError('Failed to load incidents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // ── Client-side search over loaded incidents ──────────────────────────────
  const filteredIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter(
      (inc) =>
        String(inc.id).includes(q) ||
        inc.crime_type?.name?.toLowerCase().includes(q) ||
        inc.suburb?.toLowerCase().includes(q) ||
        inc.description?.toLowerCase().includes(q) ||
        inc.modus_operandi?.toLowerCase().includes(q),
    );
  }, [incidents, searchQuery]);

  // ── Run profile match on the backend ────────────────────────────────────
  const handleFindSimilar = async () => {
    if (!selectedIncident) return;
    setMatchLoading(true);
    setMatchError('');
    setSimilarCases([]);
    try {
      const result = await runProfileMatch(selectedIncident.id, matchThreshold);
      setSimilarCases(result.similar_cases ?? []);
      if ((result.similar_cases ?? []).length === 0) {
        setMatchError('No similar cases found. The model may need more data or re-training.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Profile matching failed. Ensure the ML model is trained.';
      setMatchError(detail);
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom mb-4">
          <div>
            <h1 className="display-6 fw-bold text-dark">
              <i className="bi bi-person-lines-fill me-3 text-primary"></i>
              Crime Profile Matcher
            </h1>
            <p className="text-muted small mb-0">
              Select an incident then click <strong>Find Similar Cases</strong> to run the RandomForest ML matcher.
            </p>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchIncidents} disabled={loading}>
            <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''}`}></i>
          </button>
        </header>

        {error && (
          <div className="alert alert-danger alert-dismissible mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        <div className="row g-4">
          {/* ── Left panel: incident list ─────────────────────────────────── */}
          <div className="col-md-5">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <h5 className="mb-2"><i className="bi bi-search me-2 text-primary"></i>Search Incidents</h5>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="ID, crime type, suburb, MO…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="d-flex gap-2 mt-2">
                  <select
                    className="form-select form-select-sm"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="all">All statuses</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="card-body overflow-auto" style={{ maxHeight: 520 }}>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                    <p className="text-muted small mt-2">Loading incidents…</p>
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <p className="text-muted text-center py-4">No incidents found</p>
                ) : (
                  filteredIncidents.map((inc) => (
                    <IncidentCard
                      key={inc.id}
                      incident={inc}
                      selected={selectedIncident?.id === inc.id}
                      onSelect={setSelectedIncident}
                    />
                  ))
                )}
              </div>
              <div className="card-footer bg-white small text-muted">
                {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''} shown
              </div>
            </div>
          </div>

          {/* ── Middle panel: selected incident + match controls ─────────── */}
          <div className="col-md-3">
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white">
                <h6 className="mb-0"><i className="bi bi-file-earmark-text me-2 text-primary"></i>Selected Incident</h6>
              </div>
              <div className="card-body">
                {!selectedIncident ? (
                  <p className="text-muted small text-center py-3">Select an incident from the list</p>
                ) : (
                  <>
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr><td className="text-muted">ID</td><td><strong>#{selectedIncident.id}</strong></td></tr>
                        <tr><td className="text-muted">Type</td><td>{selectedIncident.crime_type?.name ?? '—'}</td></tr>
                        <tr><td className="text-muted">Suburb</td><td>{selectedIncident.suburb ?? '—'}</td></tr>
                        <tr><td className="text-muted">Status</td><td>
                          <span className={`badge bg-${selectedIncident.status === 'resolved' ? 'success' : 'warning'}`}>
                            {selectedIncident.status}
                          </span>
                        </td></tr>
                        <tr><td className="text-muted">Date</td><td>{selectedIncident.timestamp ? new Date(selectedIncident.timestamp).toLocaleDateString() : '—'}</td></tr>
                      </tbody>
                    </table>
                    {selectedIncident.description && (
                      <p className="small text-muted mt-2 border-top pt-2">{selectedIncident.description}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Match controls */}
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h6 className="mb-0"><i className="bi bi-sliders me-2 text-primary"></i>Match Settings</h6>
              </div>
              <div className="card-body">
                <label className="form-label small">Top N results: <strong>{matchThreshold}</strong></label>
                <input
                  type="range"
                  className="form-range mb-3"
                  min={3} max={20} step={1}
                  value={matchThreshold}
                  onChange={(e) => setMatchThreshold(Number(e.target.value))}
                />
                <button
                  className="btn btn-primary w-100"
                  onClick={handleFindSimilar}
                  disabled={!selectedIncident || matchLoading}
                >
                  {matchLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" />Matching…</>
                  ) : (
                    <><i className="bi bi-cpu me-2"></i>Find Similar Cases</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right panel: similar cases results ───────────────────────── */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0"><i className="bi bi-diagram-3 me-2 text-success"></i>Similar Cases</h6>
                {similarCases.length > 0 && (
                  <span className="badge bg-success">{similarCases.length} found</span>
                )}
              </div>
              <div className="card-body overflow-auto" style={{ maxHeight: 560 }}>
                {matchError && (
                  <div className="alert alert-warning py-2 small">{matchError}</div>
                )}
                {!matchLoading && similarCases.length === 0 && !matchError && (
                  <p className="text-muted text-center py-4">
                    <i className="bi bi-cpu fs-2 d-block mb-2 text-muted"></i>
                    Select an incident and run the matcher to see results
                  </p>
                )}
                {matchLoading && (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status" />
                    <p className="text-muted small mt-2">Running RandomForest matcher…</p>
                  </div>
                )}
                {similarCases.map((inc) => (
                  <SimilarCard key={inc.id} incident={inc} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrimeProfileMatcher;
