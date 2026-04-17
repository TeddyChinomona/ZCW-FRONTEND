/**
 * src/components/main/home_components/CaseManagement.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Case Management — view all incidents, update status, and assign an
 * investigating officer AFTER a case has been reported.
 *
 * This solves the workflow gap where:
 *  1. An officer files an RRB form → case is created with status "reported"
 *  2. A supervisor reviews the queue and assigns it to an investigating officer
 *  3. The assigned officer updates the status as the investigation progresses
 *
 * API calls:
 *  GET  /api/zrp/incidents/       → list all incidents (with filters)
 *  PUT  /api/zrp/incidents/:id/   → update status and/or description_narrative
 *                                   (investigating officer stored in description_narrative
 *                                    as it maps to the complainant block from RRB)
 *  GET  /api/zrp/users/           → list ZRP users to populate officer dropdown
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncidents, updateIncident } from '../../../services/crimeService';
import api from '../../../services/api';

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'reported',           label: 'Reported',           color: 'secondary' },
  { value: 'under_investigation',label: 'Under Investigation', color: 'warning'   },
  { value: 'closed',             label: 'Closed',             color: 'success'   },
  { value: 'unsolved',           label: 'Unsolved',           color: 'danger'    },
];

const statusBadge = (status) => {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return opt
    ? <span className={`badge bg-${opt.color} ${opt.color === 'warning' ? 'text-dark' : ''}`}>{opt.label}</span>
    : <span className="badge bg-secondary">{status}</span>;
};

// ─── Inline edit modal ────────────────────────────────────────────────────────
const EditModal = ({ incident, officers, onSave, onClose }) => {
  const [form, setForm] = useState({
    status:     incident.status ?? 'reported',
    officer:    '',         // free text or username from dropdown
    notes:      '',         // appended to description_narrative
    weapon_used:   incident.weapon_used   ?? '',
    num_suspects:  incident.num_suspects  ?? 0,
    serial_group_label: incident.serial_group_label ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build the update payload
      const payload = {
        status: form.status,
        weapon_used:        form.weapon_used,
        num_suspects:       Number(form.num_suspects) || 0,
        serial_group_label: form.serial_group_label,
      };

      // Append officer assignment and update notes to the existing narrative
      if (form.officer || form.notes) {
        const existing = incident.description_narrative ?? '';
        const additions = [];
        if (form.officer) additions.push(`Investigating Officer Assigned: ${form.officer}`);
        if (form.notes)   additions.push(`Update Note: ${form.notes}`);
        payload.description_narrative = [existing, ...additions]
          .filter(Boolean)
          .join('\n\n---\n');
      }

      await onSave(incident.id, payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    /* Semi-transparent modal backdrop */
    <div
      className="modal show d-block"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-dark text-white">
            <h5 className="modal-title">
              <i className="bi bi-pencil-square me-2"></i>
              Update Case — {incident.case_number}
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Read-only case summary */}
            <div className="bg-light rounded p-3 mb-3">
              <div className="row g-2 small">
                <div className="col-md-4">
                  <span className="text-muted">Crime Type: </span>
                  <strong>{incident.crime_type_name ?? '—'}</strong>
                </div>
                <div className="col-md-4">
                  <span className="text-muted">Suburb: </span>
                  <strong>{incident.suburb ?? '—'}</strong>
                </div>
                <div className="col-md-4">
                  <span className="text-muted">Date: </span>
                  <strong>{incident.timestamp ? new Date(incident.timestamp).toLocaleDateString() : '—'}</strong>
                </div>
                <div className="col-md-4">
                  <span className="text-muted">Current Status: </span>
                  {statusBadge(incident.status)}
                </div>
                <div className="col-md-8">
                  <span className="text-muted">Current Officer: </span>
                  <strong>
                    {/* Extract investigating officer from existing narrative if present */}
                    {incident.description_narrative?.includes('Investigating Officer Assigned:')
                      ? incident.description_narrative
                          .split('\n')
                          .find(l => l.includes('Investigating Officer Assigned:'))
                          ?.replace('Investigating Officer Assigned:', '')
                          .trim()
                      : 'Not assigned'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="row g-3">
              {/* ── Status change ──────────────────────────────────────────── */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Update Status <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* ── Investigating officer ──────────────────────────────────── */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Assign / Reassign Investigating Officer
                </label>
                {officers.length > 0 ? (
                  /* If we have a user list from /api/zrp/users/, show a dropdown */
                  <select
                    className="form-select"
                    value={form.officer}
                    onChange={e => setForm(f => ({ ...f, officer: e.target.value }))}
                  >
                    <option value="">— Keep current officer —</option>
                    {officers.map(u => (
                      <option key={u.id} value={`${u.fullname ?? u.username} [${u.zrp_badge_number}]`}>
                        {u.fullname ?? u.username} — {u.zrp_badge_number}
                      </option>
                    ))}
                  </select>
                ) : (
                  /* Fallback to free-text input if user list unavailable */
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Officer name & badge number"
                    value={form.officer}
                    onChange={e => setForm(f => ({ ...f, officer: e.target.value }))}
                  />
                )}
              </div>

              {/* ── Weapon used ───────────────────────────────────────────── */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Weapon Used</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Knife, Firearm, Unknown"
                  value={form.weapon_used}
                  onChange={e => setForm(f => ({ ...f, weapon_used: e.target.value }))}
                />
              </div>

              {/* ── Num suspects ──────────────────────────────────────────── */}
              <div className="col-md-3">
                <label className="form-label fw-semibold">Num Suspects</label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={form.num_suspects}
                  onChange={e => setForm(f => ({ ...f, num_suspects: e.target.value }))}
                />
              </div>

              {/* ── Serial group label ─────────────────────────────────────── */}
              <div className="col-md-3">
                <label className="form-label fw-semibold">Serial Group Label</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mbare Burglar 2025"
                  value={form.serial_group_label}
                  onChange={e => setForm(f => ({ ...f, serial_group_label: e.target.value }))}
                />
              </div>

              {/* ── Update notes ──────────────────────────────────────────── */}
              <div className="col-12">
                <label className="form-label fw-semibold">Update Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Add investigation progress notes (appended to case record)…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
                <small className="text-muted">These notes will be appended to the existing case narrative.</small>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
              ) : (
                <><i className="bi bi-save me-2"></i>Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
function CaseManagement() {
  const [incidents, setIncidents]   = useState([]);
  const [officers,  setOfficers]    = useState([]);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState('');
  const [editTarget, setEditTarget] = useState(null);  // incident being edited
  const [toast,      setToast]      = useState({ msg: '', type: '' });

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [page, setPage]         = useState(1);
  const PAGE_SIZE               = 15;

  // ── Fetch incidents and officers in parallel ──────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const [incRes, usersRes] = await Promise.allSettled([
        getIncidents(params),
        api.get('/zrp/users/'),
      ]);

      if (incRes.status === 'fulfilled') {
        const data = incRes.value;
        setIncidents(Array.isArray(data) ? data : data?.results ?? []);
      } else {
        throw incRes.reason;
      }

      if (usersRes.status === 'fulfilled') {
        setOfficers(Array.isArray(usersRes.value.data)
          ? usersRes.value.data
          : usersRes.value.data?.results ?? []);
      }
      // Officers failing (403 for non-admin) is non-fatal — falls back to free text
    } catch (err) {
      setError(err.response?.data?.detail ?? err.message ?? 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchData(); setPage(1); }, [fetchData]);

  // ── Handle save ───────────────────────────────────────────────────────────────
  const handleSave = async (id, payload) => {
    try {
      const updated = await updateIncident(id, payload);
      // Update the incident in the local list so the table reflects the change
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
      setToast({ msg: `Case ${updated.case_number} updated successfully.`, type: 'success' });
    } catch (err) {
      setToast({ msg: err.response?.data?.detail ?? 'Update failed.', type: 'danger' });
    }
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  // ── Client-side search filter ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!filterSearch.trim()) return incidents;
    const q = filterSearch.toLowerCase();
    return incidents.filter(i =>
      i.case_number?.toLowerCase().includes(q) ||
      (i.crime_type_name ?? '').toLowerCase().includes(q) ||
      (i.suburb ?? '').toLowerCase().includes(q)
    );
  }, [incidents, filterSearch]);

  // ── Paginate ───────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">

        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom mb-4">
          <div>
            <h1 className="display-6 fw-bold text-dark">
              <i className="bi bi-folder2-open me-3 text-primary"></i>
              Case Management
            </h1>
          </div>
          <button className="btn btn-outline-primary btn-sm" onClick={fetchData} disabled={loading}>
            <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
            Refresh
          </button>
        </header>

        {/* Toast */}
        {toast.msg && (
          <div className={`alert alert-${toast.type} alert-dismissible mb-3`}>
            {toast.msg}
            <button className="btn-close" onClick={() => setToast({ msg: '', type: '' })}></button>
          </div>
        )}

        {/* Filters */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control"
                placeholder="Search case number, type, suburb…"
                value={filterSearch}
                onChange={e => { setFilterSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <div className="badge bg-primary px-3 py-2 fs-6">
              {filtered.length} case{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          </div>
        )}

        {/* Table */}
        <div className="card shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="text-muted mt-2">Loading cases…</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted text-center py-5">No cases found</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Case #</th>
                      <th>Crime Type</th>
                      <th>Suburb</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Investigating Officer</th>
                      <th>Serial Group</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(inc => {
                      // Extract officer from narrative if present
                      const officerLine = inc.description_narrative
                        ?.split('\n')
                        .find(l => l.includes('Investigating Officer Assigned:'));
                      const officerName = officerLine
                        ? officerLine.replace('Investigating Officer Assigned:', '').trim()
                        : inc.description_narrative?.includes('Investigating Officer:')
                          ? inc.description_narrative
                              .split('\n')
                              .find(l => l.includes('Investigating Officer:'))
                              ?.replace('Investigating Officer:', '').split('|')[0].trim()
                          : null;

                      return (
                        <tr key={inc.id}>
                          <td className="font-monospace small fw-semibold text-primary">
                            {inc.case_number}
                          </td>
                          <td>{inc.crime_type_name ?? '—'}</td>
                          <td>{inc.suburb ?? '—'}</td>
                          <td className="small text-muted">
                            {inc.timestamp ? new Date(inc.timestamp).toLocaleDateString() : '—'}
                          </td>
                          <td>{statusBadge(inc.status)}</td>
                          <td className="small">
                            {officerName
                              ? <span className="text-success"><i className="bi bi-person-check me-1"></i>{officerName}</span>
                              : <span className="text-muted fst-italic">Not assigned</span>}
                          </td>
                          <td className="small">
                            {inc.serial_group_label
                              ? <span className="badge bg-info text-dark">{inc.serial_group_label}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setEditTarget(inc)}
                              title="Update case"
                            >
                              <i className="bi bi-pencil me-1"></i>Update
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </small>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <i className="bi bi-chevron-left"></i>
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`btn ${p === page ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button className="btn btn-outline-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          incident={editTarget}
          officers={officers}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

export default CaseManagement;
