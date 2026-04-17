/**
 * src/components/main/home_components/SerialGroupReview.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyst review panel for DBSCAN-generated serial crime clusters.
 *
 * Purpose:
 *  After the unsupervised SerialCrimeLinkageModel (DBSCAN) runs, it produces
 *  candidate "serial groups" — clusters of incidents it believes may be linked.
 *  This page lets an analyst review each cluster, inspect the member incidents,
 *  and either:
 *    • CONFIRM  — assigns the cluster's serial_group_label to all member cases
 *                 via PUT /api/zrp/incidents/:id/  (serial_group_label = label)
 *    • DENY     — leaves the cases unlinked (serial_group_label stays empty)
 *    • PARTIAL  — allows the analyst to select individual cases to accept
 *
 * API calls:
 *  POST /api/zrp/analytics/serial-linkage/cluster/  → get cluster assignments
 *  PUT  /api/zrp/incidents/:id/                      → write serial_group_label
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

// ─── Risk badge colours ───────────────────────────────────────────────────────
const RISK_BADGE = {
  Critical: 'bg-danger',
  High:     'bg-warning text-dark',
  Medium:   'bg-info text-dark',
  Low:      'bg-success',
};

// ─── Status badge for a cluster the analyst has already acted on ──────────────
const ReviewStatusBadge = ({ status }) => {
  if (status === 'confirmed') return <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>Confirmed</span>;
  if (status === 'denied')    return <span className="badge bg-danger"><i className="bi bi-x-circle me-1"></i>Denied</span>;
  if (status === 'partial')   return <span className="badge bg-warning text-dark"><i className="bi bi-dash-circle me-1"></i>Partial</span>;
  return <span className="badge bg-secondary">Pending Review</span>;
};

function SerialGroupReview() {
  // ── State ────────────────────────────────────────────────────────────────────
  const [clusters,       setClusters]       = useState([]);   // DBSCAN cluster objects
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [expandedId,     setExpandedId]     = useState(null); // which cluster is open
  const [reviewStatus,   setReviewStatus]   = useState({});   // { clusterId: 'confirmed'|'denied'|'partial' }
  const [selectedCases,  setSelectedCases]  = useState({});   // { clusterId: Set<caseNumber> }
  const [saving,         setSaving]         = useState({});   // { clusterId: bool }
  const [toast,          setToast]          = useState('');   // success/error toast message

  // ── Fetch clusters from the backend ──────────────────────────────────────────
  const fetchClusters = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // POST with empty body triggers the endpoint to return ALL cluster assignments
      const res = await api.post('/zrp/analytics/serial-linkage/cluster/', {});
      const summary = res.data?.cluster_summary ?? [];

      // Initialise selectedCases — default to ALL cases in cluster selected
      const initSelected = {};
      summary.forEach(c => {
        initSelected[c.cluster_id] = new Set(c.case_numbers);
      });
      setSelectedCases(initSelected);
      setClusters(summary);
    } catch (err) {
      // Handle the case where the model hasn't been trained yet
      const detail = err.response?.data?.detail ?? err.message;
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  // ── Toggle case selection within a cluster ────────────────────────────────────
  const toggleCase = (clusterId, caseNumber) => {
    setSelectedCases(prev => {
      const next = new Set(prev[clusterId] ?? []);
      next.has(caseNumber) ? next.delete(caseNumber) : next.add(caseNumber);
      return { ...prev, [clusterId]: next };
    });
  };

  // ── Confirm handler — writes serial_group_label to selected incidents ─────────
  const handleConfirm = async (cluster) => {
    const selectedSet = selectedCases[cluster.cluster_id] ?? new Set();
    const casesToLabel = cluster.case_numbers.filter(cn => selectedSet.has(cn));

    if (!casesToLabel.length) {
      setToast('⚠ No cases selected. Please select at least one case.');
      setTimeout(() => setToast(''), 4000);
      return;
    }

    // Generate a human-readable label e.g. "Serial Group 3"
    const label = cluster.label ?? `Serial Group ${cluster.cluster_id}`;

    setSaving(prev => ({ ...prev, [cluster.cluster_id]: true }));
    try {
      // Fetch all incidents to get their IDs (we only have case_numbers from DBSCAN)
      const listRes = await api.get('/zrp/incidents/');
      const allIncidents = Array.isArray(listRes.data)
        ? listRes.data
        : listRes.data?.results ?? [];

      // Build a map from case_number → incident id
      const caseNumberToId = {};
      allIncidents.forEach(inc => { caseNumberToId[inc.case_number] = inc.id; });

      // PUT serial_group_label on each confirmed case
      const updates = casesToLabel
        .filter(cn => caseNumberToId[cn])
        .map(cn =>
          api.put(`/zrp/incidents/${caseNumberToId[cn]}/`, {
            serial_group_label: label,
          })
        );
      await Promise.all(updates);

      // Mark as confirmed (or partial if not all cases were selected)
      const status = casesToLabel.length === cluster.case_numbers.length
        ? 'confirmed'
        : 'partial';
      setReviewStatus(prev => ({ ...prev, [cluster.cluster_id]: status }));
      setToast(`✓ ${casesToLabel.length} case(s) labelled as "${label}"`);
    } catch (err) {
      setToast(`✗ Failed to save: ${err.response?.data?.detail ?? err.message}`);
    } finally {
      setSaving(prev => ({ ...prev, [cluster.cluster_id]: false }));
      setTimeout(() => setToast(''), 5000);
    }
  };

  // ── Deny handler — no DB writes, just marks the cluster locally ──────────────
  const handleDeny = (clusterId) => {
    setReviewStatus(prev => ({ ...prev, [clusterId]: 'denied' }));
    setToast('Cluster marked as unlinked — no labels written to incidents.');
    setTimeout(() => setToast(''), 3500);
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const pendingCount   = clusters.filter(c => !reviewStatus[c.cluster_id]).length;
  const confirmedCount = Object.values(reviewStatus).filter(s => s === 'confirmed' || s === 'partial').length;
  const deniedCount    = Object.values(reviewStatus).filter(s => s === 'denied').length;

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom mb-4">
          <div>
            <h1 className="display-6 fw-bold text-dark">
              <i className="bi bi-diagram-3 me-3 text-primary"></i>
              Serial Group Review
            </h1>
            <p className="text-muted small mb-0 ms-5">
              Review DBSCAN-generated serial crime clusters and assign
              <code className="ms-1">serial_group_label</code> to confirmed groups
            </p>
          </div>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={fetchClusters}
            disabled={loading}
          >
            <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
            Refresh
          </button>
        </header>

        {/* ── Toast ──────────────────────────────────────────────────────────── */}
        {toast && (
          <div className="alert alert-info alert-dismissible d-flex align-items-center gap-2 mb-4">
            <i className="bi bi-info-circle-fill"></i>
            {toast}
            <button className="btn-close ms-auto" onClick={() => setToast('')}></button>
          </div>
        )}

        {/* ── Summary KPI bar ─────────────────────────────────────────────── */}
        {clusters.length > 0 && (
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Clusters', value: clusters.length, color: 'primary', icon: 'collection' },
              { label: 'Pending Review', value: pendingCount,   color: 'warning',  icon: 'hourglass-split' },
              { label: 'Confirmed',      value: confirmedCount, color: 'success',  icon: 'check-circle' },
              { label: 'Denied',         value: deniedCount,    color: 'danger',   icon: 'x-circle' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="col-6 col-md-3">
                <div className={`kpi-card kpi-${color} h-100`}>
                  <i className={`bi bi-${icon} fs-4 text-${color} mb-2 d-block`}></i>
                  <div className="kpi-value">{value}</div>
                  <div className="kpi-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2">Loading cluster assignments from model…</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="alert alert-warning d-flex align-items-start gap-3">
            <i className="bi bi-exclamation-triangle-fill fs-4 text-warning mt-1 flex-shrink-0"></i>
            <div>
              <strong>Could not load clusters</strong>
              <p className="mb-2 small">{error}</p>
              <p className="mb-0 small text-muted">
                Go to <strong>ML Training</strong> and run the model first, then return here.
              </p>
            </div>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!loading && !error && clusters.length === 0 && (
          <div className="card shadow-sm text-center py-5">
            <i className="bi bi-diagram-3 fs-1 text-muted d-block mb-3"></i>
            <h5 className="text-muted">No serial clusters found</h5>
            <p className="text-muted small">
              Run ML Training to generate candidate serial crime groups.
            </p>
          </div>
        )}

        {/* ── Cluster list ─────────────────────────────────────────────────── */}
        {!loading && clusters.map(cluster => {
          const isOpen     = expandedId === cluster.cluster_id;
          const status     = reviewStatus[cluster.cluster_id];
          const isSaving   = saving[cluster.cluster_id];
          const selected   = selectedCases[cluster.cluster_id] ?? new Set();
          const totalCases = cluster.case_numbers?.length ?? 0;
          const selCount   = selected.size;

          return (
            <div
              key={cluster.cluster_id}
              className={`card shadow-sm mb-3 ${
                status === 'confirmed' ? 'border-success' :
                status === 'denied'   ? 'border-danger'  :
                status === 'partial'  ? 'border-warning' : ''
              }`}
            >
              {/* ── Cluster header row ────────────────────────────────────── */}
              <div
                className="card-header bg-white d-flex align-items-center gap-3 py-3"
                role="button"
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedId(isOpen ? null : cluster.cluster_id)}
              >
                {/* Expand icon */}
                <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>

                {/* Cluster title */}
                <div className="flex-grow-1">
                  <strong>{cluster.label ?? `Serial Group ${cluster.cluster_id}`}</strong>
                  <span className="text-muted ms-2 small">
                    {totalCases} case{totalCases !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Stats */}
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="small text-muted">
                    <i className="bi bi-link-45deg me-1"></i>
                    Avg sim: <strong>{cluster.mean_intra_similarity?.toFixed(3) ?? '—'}</strong>
                  </span>
                  <span className="small text-muted">
                    Min sim: <strong>{cluster.min_intra_similarity?.toFixed(3) ?? '—'}</strong>
                  </span>
                  <ReviewStatusBadge status={status} />
                </div>
              </div>

              {/* ── Expanded body ─────────────────────────────────────────── */}
              {isOpen && (
                <div className="card-body">
                  <p className="text-muted small mb-3">
                    <i className="bi bi-info-circle me-1"></i>
                    Select the cases you want to confirm as linked. Uncheck any that appear
                    to be false positives. Then click <strong>Confirm Selected</strong>.
                  </p>

                  {/* Select all / none shortcuts */}
                  <div className="d-flex gap-2 mb-3">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSelectedCases(prev => ({
                        ...prev,
                        [cluster.cluster_id]: new Set(cluster.case_numbers)
                      }))}
                    >
                      Select All
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSelectedCases(prev => ({
                        ...prev,
                        [cluster.cluster_id]: new Set()
                      }))}
                    >
                      Clear All
                    </button>
                    <span className="text-muted small align-self-center ms-2">
                      {selCount} of {totalCases} selected
                    </span>
                  </div>

                  {/* Case checkboxes */}
                  <div className="row g-2 mb-4">
                    {(cluster.case_numbers ?? []).map(cn => (
                      <div key={cn} className="col-md-4">
                        <div
                          className={`border rounded p-2 d-flex align-items-center gap-2 ${
                            selected.has(cn)
                              ? 'border-primary bg-primary bg-opacity-5'
                              : 'border-secondary'
                          }`}
                          role="button"
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleCase(cluster.cluster_id, cn)}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input mt-0 flex-shrink-0"
                            checked={selected.has(cn)}
                            onChange={() => toggleCase(cluster.cluster_id, cn)}
                            onClick={e => e.stopPropagation()}
                          />
                          <span className="font-monospace small">{cn}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-success"
                      onClick={() => handleConfirm(cluster)}
                      disabled={isSaving || selCount === 0}
                    >
                      {isSaving ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                      ) : (
                        <><i className="bi bi-check-circle me-2"></i>Confirm Selected ({selCount})</>
                      )}
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDeny(cluster.cluster_id)}
                      disabled={isSaving}
                    >
                      <i className="bi bi-x-circle me-2"></i>Deny — Not Linked
                    </button>
                  </div>

                  {/* Already reviewed notice */}
                  {status && (
                    <div className="alert alert-light mt-3 py-2 small">
                      <i className="bi bi-check2 me-1"></i>
                      This cluster has been reviewed (<strong>{status}</strong>).
                      You can revise your decision by clicking above again.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}

export default SerialGroupReview;
