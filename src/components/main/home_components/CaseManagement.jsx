/**
 * src/components/main/home_components/CaseManagement.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Case Management — view all incidents, update status, assign an investigating
 * officer, and now edit ALL incident fields including forensics and stolen items.
 *
 * API calls:
 *  GET  /api/zrp/incidents/       → list all incidents (with filters)
 *  PUT  /api/zrp/incidents/:id/   → update any incident field
 *  GET  /api/zrp/users/           → list ZRP users to populate officer dropdown
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getIncidents, updateIncident } from '../../../services/crimeService';
import api from '../../../services/api';

// ─── Status options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'reported',            label: 'Reported',            color: 'secondary' },
  { value: 'under_investigation', label: 'Under Investigation', color: 'warning'   },
  { value: 'closed',              label: 'Closed',              color: 'success'   },
  { value: 'unsolved',            label: 'Unsolved',            color: 'danger'    },
];

// Helper: renders a coloured status badge
const statusBadge = (status) => {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return opt
    ? <span className={`badge bg-${opt.color} ${opt.color === 'warning' ? 'text-dark' : ''}`}>{opt.label}</span>
    : <span className="badge bg-secondary">{status}</span>;
};

// ─── A single stolen-item row inside the edit modal ───────────────────────────
const StolenItemRow = ({ item, index, onChange, onRemove, onRecover }) => (
  <tr className={item.dateRecovered ? 'table-success' : ''}>
    <td>
      <input
        type="text"
        className="form-control form-control-sm"
        value={item.description}
        onChange={e => onChange(index, 'description', e.target.value)}
        placeholder="Property description"
      />
    </td>
    <td>
      <input
        type="text"
        className="form-control form-control-sm"
        value={item.identifyingMarks}
        onChange={e => onChange(index, 'identifyingMarks', e.target.value)}
        placeholder="Serial no / marks"
      />
    </td>
    <td>
      {/* Show recovery date if set, otherwise show a date-picker */}
      {item.dateRecovered
        ? <span className="badge bg-success">{item.dateRecovered}</span>
        : (
          <input
            type="date"
            className="form-control form-control-sm"
            onChange={e => onRecover(index, e.target.value)}
          />
        )
      }
    </td>
    <td className="text-center">
      <button
        type="button"
        className="btn btn-sm text-danger"
        onClick={() => onRemove(index)}
        title="Remove item"
      >
        <i className="bi bi-trash"></i>
      </button>
    </td>
  </tr>
);

// ─── Full Edit Modal ──────────────────────────────────────────────────────────
// Renders ALL editable incident fields so analysts can update a case completely.
const EditModal = ({ incident, officers, onSave, onClose }) => {

  // Initialise form state from the existing incident record
  const [form, setForm] = useState({
    // Core fields
    status:             incident.status             ?? 'reported',
    weapon_used:        incident.weapon_used        ?? '',
    num_suspects:       incident.num_suspects       ?? 0,
    serial_group_label: incident.serial_group_label ?? '',

    // Forensics & findings (stored in description_narrative as structured blocks)
    valueStolen:        '',
    valueRecovered:     '',
    exhibitsHeld:       'NO',
    fingerprintsFound:  'NEG',
    cidReference:       '',
    resultsFindings:    '',
    briefDetails:       '',
    modusOperandi:      incident.modus_operandi     ?? '',

    // Officer assignment (free text or dropdown value)
    officer: '',
    updateNotes: '',
  });

  // Stolen items list — parsed from the existing modus_operandi narrative if present
  const [stolenItems, setStolenItems]   = useState([]);
  const [newItem, setNewItem]           = useState({ description: '', identifyingMarks: '' });
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState('status'); // 'status' | 'forensics' | 'property'

  // ── Parse existing narrative blocks when the modal opens ─────────────────
  // The RRB form serialises fields into structured text blocks separated by
  // "---" dividers. We reverse-engineer them here to pre-fill the edit form.
  useEffect(() => {
    const narrative = incident.description_narrative ?? '';

    // Extract value stolen
    const stolenMatch = narrative.match(/Value Stolen:\s*([^\|]+)/);
    if (stolenMatch) setForm(f => ({ ...f, valueStolen: stolenMatch[1].trim() }));

    // Extract value recovered
    const recoveredMatch = narrative.match(/Value Recovered:\s*([^\n]+)/);
    if (recoveredMatch) setForm(f => ({ ...f, valueRecovered: recoveredMatch[1].trim() }));

    // Extract exhibits held status
    const exhibitsMatch = narrative.match(/Exhibits Held:\s*(\w+)/);
    if (exhibitsMatch) setForm(f => ({ ...f, exhibitsHeld: exhibitsMatch[1].trim() }));

    // Extract fingerprints result
    const fpMatch = narrative.match(/Fingerprints:\s*(\w+)/);
    if (fpMatch) setForm(f => ({ ...f, fingerprintsFound: fpMatch[1].trim() }));

    // Extract CID reference number
    const cidMatch = narrative.match(/CID Ref:\s*([^\)]+)\)/);
    if (cidMatch) setForm(f => ({ ...f, cidReference: cidMatch[1].trim() }));

    // Extract results/findings
    const resultsMatch = narrative.match(/Results:\s*([^\n]+)/);
    if (resultsMatch) setForm(f => ({ ...f, resultsFindings: resultsMatch[1].trim() }));

    // Parse Form 169 stolen items from modus_operandi block
    const mo = incident.modus_operandi ?? '';
    const form169Start = mo.indexOf('--- STOLEN ITEMS (FORM 169) ---');
    if (form169Start !== -1) {
      const itemsText = mo.slice(form169Start + 31).trim();
      const parsedItems = itemsText.split('\n')
        .filter(line => /^\d+\./.test(line))
        .map(line => {
          // Each line looks like: "1. Description | Marks: XYZ | Recovered: 2025-01-01"
          const descMatch  = line.match(/^\d+\.\s*([^|]+)/);
          const marksMatch = line.match(/Marks:\s*([^|]+)/);
          const recMatch   = line.match(/Recovered:\s*([^\s]+)/);
          return {
            description:      descMatch  ? descMatch[1].trim()  : '',
            identifyingMarks: marksMatch ? marksMatch[1].trim() : '',
            dateRecovered:    recMatch   ? recMatch[1].trim()   : '',
          };
        });
      setStolenItems(parsedItems);
    }
  }, [incident]);

  // ── Generic field setter ──────────────────────────────────────────────────
  const set = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Stolen item list management ───────────────────────────────────────────
  const handleItemChange = (index, field, value) => {
    setStolenItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleAddItem = () => {
    if (newItem.description.trim()) {
      setStolenItems(prev => [...prev, { ...newItem, dateRecovered: '' }]);
      setNewItem({ description: '', identifyingMarks: '' });
    }
  };

  const handleRemoveItem = (index) => {
    setStolenItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRecoverItem = (index, date) => {
    setStolenItems(prev => prev.map((item, i) =>
      i === index ? { ...item, dateRecovered: date } : item
    ));
  };

  // ── Build payload and save ────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // Re-serialise the Form 169 stolen items into the modus operandi text block
      const stolenItemsText = stolenItems.length
        ? '\n--- STOLEN ITEMS (FORM 169) ---\n' +
          stolenItems.map((item, i) =>
            `${i + 1}. ${item.description} | Marks: ${item.identifyingMarks}` +
            (item.dateRecovered ? ` | Recovered: ${item.dateRecovered}` : '')
          ).join('\n')
        : '';

      // Combine M.O. text with stolen items
      const combinedMO = [form.modusOperandi, stolenItemsText]
        .filter(Boolean).join('\n');

      // Re-build the forensics block inside the narrative
      const forensicsBlock =
        `--- FORENSICS & FINDINGS ---\n` +
        `Value Stolen: ${form.valueStolen} | Value Recovered: ${form.valueRecovered}\n` +
        `Exhibits Held: ${form.exhibitsHeld} | Fingerprints: ${form.fingerprintsFound} ` +
        `(CID Ref: ${form.cidReference})\n` +
        `Results: ${form.resultsFindings}`;

      // Preserve existing narrative sections and append the updated forensics block
      let existingNarrative = incident.description_narrative ?? '';

      // Strip the old forensics block so it is not duplicated
      const forensicsIdx = existingNarrative.indexOf('--- FORENSICS & FINDINGS ---');
      if (forensicsIdx !== -1) {
        existingNarrative = existingNarrative.slice(0, forensicsIdx).trimEnd();
      }

      // Append officer assignment and update notes if provided
      const additions = [];
      if (form.officer)      additions.push(`Investigating Officer Assigned: ${form.officer}`);
      if (form.updateNotes)  additions.push(`Update Note: ${form.updateNotes}`);
      if (form.briefDetails) additions.push(`Brief Details Update: ${form.briefDetails}`);

      const updatedNarrative = [
        existingNarrative,
        forensicsBlock,
        ...additions,
      ].filter(Boolean).join('\n\n---\n');

      // Assemble the final API payload with all updated fields
      const payload = {
        status:             form.status,
        weapon_used:        form.weapon_used,
        num_suspects:       Number(form.num_suspects) || 0,
        serial_group_label: form.serial_group_label,
        modus_operandi:     combinedMO,
        description_narrative: updatedNarrative,
      };

      await onSave(incident.id, payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // ── Tab button helper ─────────────────────────────────────────────────────
  const Tab = ({ id, label, icon }) => (
    <button
      type="button"
      className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-outline-secondary'}`}
      onClick={() => setActiveTab(id)}
    >
      <i className={`bi bi-${icon} me-1`}></i>{label}
    </button>
  );

  return (
    // Modal backdrop — clicking outside closes the modal
    <div
      className="modal show d-block"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">

          {/* ── Modal header ─────────────────────────────────────────────── */}
          <div className="modal-header bg-dark text-white">
            <div>
              <h5 className="modal-title mb-0">
                <i className="bi bi-pencil-square me-2"></i>
                Update Case — {incident.case_number}
              </h5>
              <small className="text-white-50">
                {incident.crime_type_name ?? '—'} &nbsp;|&nbsp;
                {incident.suburb ?? '—'} &nbsp;|&nbsp;
                {incident.timestamp ? new Date(incident.timestamp).toLocaleDateString() : '—'}
              </small>
            </div>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* ── Read-only summary strip ───────────────────────────────────── */}
          <div className="bg-light px-4 py-2 border-bottom d-flex gap-4 flex-wrap small">
            <div><span className="text-muted">Current Status: </span>{statusBadge(incident.status)}</div>
            <div><span className="text-muted">Weapon: </span><strong>{incident.weapon_used || 'Not recorded'}</strong></div>
            <div><span className="text-muted">Suspects: </span><strong>{incident.num_suspects ?? 0}</strong></div>
            <div><span className="text-muted">Serial Group: </span><strong>{incident.serial_group_label || 'None'}</strong></div>
          </div>

          {/* ── Tab navigation ────────────────────────────────────────────── */}
          <div className="px-4 pt-3 pb-0 d-flex gap-2">
            <Tab id="status"    label="Status & Assignment" icon="clipboard-check" />
            <Tab id="forensics" label="Details & Forensics" icon="search"          />
            <Tab id="property"  label="Stolen Property"     icon="bag-x"           />
          </div>

          {/* ── Modal body ───────────────────────────────────────────────── */}
          <div className="modal-body px-4">

            {/* ======================================================
                TAB 1 — Status & Assignment
            ====================================================== */}
            {activeTab === 'status' && (
              <div className="row g-3">

                {/* Status selector */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Update Status <span className="text-danger">*</span>
                  </label>
                  <select className="form-select" value={form.status} onChange={set('status')}>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Weapon used */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Weapon Used</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Knife, Firearm, Unknown"
                    value={form.weapon_used}
                    onChange={set('weapon_used')}
                  />
                </div>

                {/* Number of suspects */}
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Number of Suspects</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.num_suspects}
                    onChange={set('num_suspects')}
                  />
                </div>

                {/* Serial group label */}
                <div className="col-md-8">
                  <label className="form-label fw-semibold">Serial Group Label</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Mbare Burglar 2025"
                    value={form.serial_group_label}
                    onChange={set('serial_group_label')}
                  />
                  <small className="text-muted">
                    Used to link cases to a serial offender group for ML training.
                  </small>
                </div>

                {/* Investigating officer assignment */}
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    Assign / Reassign Investigating Officer
                  </label>
                  {officers.length > 0 ? (
                    // If we have the user list, show a dropdown
                    <select className="form-select" value={form.officer} onChange={set('officer')}>
                      <option value="">— Keep current officer —</option>
                      {officers.map(u => (
                        <option
                          key={u.id}
                          value={`${u.fullname ?? u.username} [${u.zrp_badge_number}]`}
                        >
                          {u.fullname ?? u.username} — {u.zrp_badge_number} ({u.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    // Fallback to free-text when user list is unavailable (e.g. non-admin)
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Officer name & badge number"
                      value={form.officer}
                      onChange={set('officer')}
                    />
                  )}
                </div>

                {/* Free-text update notes */}
                <div className="col-12">
                  <label className="form-label fw-semibold">Update / Progress Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Add investigation progress notes (appended to case record)…"
                    value={form.updateNotes}
                    onChange={set('updateNotes')}
                  />
                  <small className="text-muted">
                    These notes will be appended to the existing case narrative.
                  </small>
                </div>
              </div>
            )}

            {/* ======================================================
                TAB 2 — Details & Forensics
                Mirrors the "Details, Forensics & Findings" section
                from the RRB form (Form 66).
            ====================================================== */}
            {activeTab === 'forensics' && (
              <div className="row g-3">

                {/* Brief details of the offence */}
                <div className="col-12">
                  <label className="form-label fw-semibold">Brief Details of Offence</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Describe what happened…"
                    value={form.briefDetails}
                    onChange={set('briefDetails')}
                  />
                </div>

                {/* Modus operandi */}
                <div className="col-12">
                  <label className="form-label fw-semibold">Modus Operandi</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="How was the crime committed? Method used?"
                    value={form.modusOperandi}
                    onChange={set('modusOperandi')}
                  />
                </div>

                {/* Value stolen and value recovered side by side */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Value Stolen ($)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 500"
                    value={form.valueStolen}
                    onChange={set('valueStolen')}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Value Recovered ($)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 200"
                    value={form.valueRecovered}
                    onChange={set('valueRecovered')}
                  />
                </div>

                {/* Exhibits held toggle */}
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Exhibits Held?</label>
                  <select
                    className="form-select"
                    value={form.exhibitsHeld}
                    onChange={set('exhibitsHeld')}
                  >
                    <option value="NO">NO</option>
                    <option value="YES">YES</option>
                  </select>
                </div>

                {/* Fingerprints result */}
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Fingerprints at Scene?</label>
                  <select
                    className="form-select"
                    value={form.fingerprintsFound}
                    onChange={set('fingerprintsFound')}
                  >
                    <option value="NEG">NEG</option>
                    <option value="POS">POS</option>
                  </select>
                </div>

                {/* CID reference number */}
                <div className="col-md-4">
                  <label className="form-label fw-semibold">C.I.D. Reference</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="CID case ref"
                    value={form.cidReference}
                    onChange={set('cidReference')}
                  />
                </div>

                {/* Results and findings — sent to the CCB */}
                <div className="col-12">
                  <label className="form-label fw-semibold text-success">
                    Results / Findings (To C.C.B.)
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Court outcome, arrest made, case referred…"
                    value={form.resultsFindings}
                    onChange={set('resultsFindings')}
                  />
                </div>

                {/* Informational callout */}
                <div className="col-12">
                  <div className="alert alert-info py-2 small">
                    <i className="bi bi-info-circle me-1"></i>
                    Forensics data is serialised into the case narrative using the Form 66
                    block format and is preserved between edits.
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================
                TAB 3 — Stolen Property (Form 169)
                Allows adding, editing, and marking items as recovered.
            ====================================================== */}
            {activeTab === 'property' && (
              <div>
                <p className="text-muted small mb-3">
                  <i className="bi bi-info-circle me-1"></i>
                  Add or update stolen / lost property items (Form 169). Mark items
                  as recovered by setting a recovery date.
                </p>

                {/* ── Add new item row ─────────────────────────────────── */}
                <div className="row g-2 mb-3">
                  <div className="col-md-5">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Description of stolen / lost property"
                      value={newItem.description}
                      onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-5">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Identifying marks, serial numbers…"
                      value={newItem.identifyingMarks}
                      onChange={e => setNewItem(n => ({ ...n, identifyingMarks: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-2">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm w-100"
                      onClick={handleAddItem}
                      disabled={!newItem.description.trim()}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Add
                    </button>
                  </div>
                </div>

                {/* ── Items table ──────────────────────────────────────── */}
                {stolenItems.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-bag-x fs-3 d-block mb-2"></i>
                    No stolen items recorded. Add items above.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle">
                      <thead className="table-dark text-center">
                        <tr>
                          <th style={{ width: '35%' }}>Description</th>
                          <th style={{ width: '30%' }}>Identifying Marks / Serial</th>
                          <th style={{ width: '25%' }}>Date of Recovery</th>
                          <th style={{ width: '10%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {stolenItems.map((item, i) => (
                          <StolenItemRow
                            key={i}
                            item={item}
                            index={i}
                            onChange={handleItemChange}
                            onRemove={handleRemoveItem}
                            onRecover={handleRecoverItem}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recovery summary */}
                {stolenItems.length > 0 && (
                  <div className="d-flex gap-4 mt-2 small text-muted">
                    <span>
                      <i className="bi bi-bag-x me-1 text-danger"></i>
                      Total items: <strong>{stolenItems.length}</strong>
                    </span>
                    <span>
                      <i className="bi bi-bag-check me-1 text-success"></i>
                      Recovered: <strong>{stolenItems.filter(i => i.dateRecovered).length}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Modal footer ─────────────────────────────────────────────── */}
          <div className="modal-footer">
            <small className="text-muted me-auto">
              <i className="bi bi-shield-lock me-1"></i>
              All changes are saved to the database immediately.
            </small>
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                : <><i className="bi bi-save me-2"></i>Save All Changes</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main CaseManagement component ───────────────────────────────────────────
function CaseManagement() {
  const [incidents,   setIncidents]   = useState([]);
  const [officers,    setOfficers]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [editTarget,  setEditTarget]  = useState(null); // incident currently being edited
  const [toast,       setToast]       = useState({ msg: '', type: '' });

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // ── Fetch incidents and officers in parallel ──────────────────────────────
  // Promise.allSettled is used so a failed /users/ call (403 for non-admins)
  // does not prevent incidents from loading.
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
        setOfficers(
          Array.isArray(usersRes.value.data)
            ? usersRes.value.data
            : usersRes.value.data?.results ?? []
        );
      }
      // Non-fatal: officer list simply stays empty → edit modal uses free text
    } catch (err) {
      setError(err.response?.data?.detail ?? err.message ?? 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchData(); setPage(1); }, [fetchData]);

  // ── Handle save from the edit modal ──────────────────────────────────────
  const handleSave = async (id, payload) => {
    try {
      const updated = await updateIncident(id, payload);
      // Update the single changed incident in local state to avoid a full reload
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));
      setToast({ msg: `Case ${updated.case_number} updated successfully.`, type: 'success' });
    } catch (err) {
      setToast({ msg: err.response?.data?.detail ?? 'Update failed.', type: 'danger' });
    }
    // Auto-dismiss toast after 4 seconds
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  // ── Client-side search (case number, type, suburb) ─────────────────────
  const filtered = useMemo(() => {
    if (!filterSearch.trim()) return incidents;
    const q = filterSearch.toLowerCase();
    return incidents.filter(i =>
      i.case_number?.toLowerCase().includes(q) ||
      (i.crime_type_name ?? '').toLowerCase().includes(q) ||
      (i.suburb ?? '').toLowerCase().includes(q)
    );
  }, [incidents, filterSearch]);

  // ── Pagination derived values ─────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Extract investigating officer name from the narrative block ──────────
  const extractOfficer = (narrative) => {
    const line = narrative?.split('\n')
      .find(l => l.includes('Investigating Officer Assigned:'));
    return line
      ? line.replace('Investigating Officer Assigned:', '').trim()
      : null;
  };

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom mb-4">
          <h1 className="display-6 fw-bold text-dark">
            <i className="bi bi-folder2-open me-3 text-primary"></i>
            Case Management
          </h1>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={fetchData}
            disabled={loading}
          >
            <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
            Refresh
          </button>
        </header>

        {/* ── Toast alert ──────────────────────────────────────────────── */}
        {toast.msg && (
          <div className={`alert alert-${toast.type} alert-dismissible mb-3`}>
            {toast.msg}
            <button className="btn-close" onClick={() => setToast({ msg: '', type: '' })}></button>
          </div>
        )}

        {/* ── Filter controls ──────────────────────────────────────────── */}
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
          <div className="col-md-2 d-flex align-items-center">
            <span className="badge bg-primary px-3 py-2 fs-6">
              {filtered.length} case{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error && (
          <div className="alert alert-danger mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          </div>
        )}

        {/* ── Main table ───────────────────────────────────────────────── */}
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
                      <th>Suspects</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(inc => {
                      const officerName = extractOfficer(inc.description_narrative);
                      return (
                        <tr key={inc.id}>
                          <td className="font-monospace small fw-semibold text-primary">
                            {inc.case_number}
                          </td>
                          <td>{inc.crime_type_name ?? '—'}</td>
                          <td>{inc.suburb ?? '—'}</td>
                          <td className="small text-muted">
                            {inc.timestamp
                              ? new Date(inc.timestamp).toLocaleDateString()
                              : '—'}
                          </td>
                          <td>{statusBadge(inc.status)}</td>
                          <td className="small">
                            {officerName
                              ? <span className="text-success">
                                  <i className="bi bi-person-check me-1"></i>{officerName}
                                </span>
                              : <span className="text-muted fst-italic">Not assigned</span>
                            }
                          </td>
                          <td className="small">
                            {inc.serial_group_label
                              ? <span className="badge bg-info text-dark">{inc.serial_group_label}</span>
                              : <span className="text-muted">—</span>
                            }
                          </td>
                          <td className="text-center small">{inc.num_suspects ?? 0}</td>
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

          {/* ── Pagination footer ─────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </small>
              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
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
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit modal rendered outside the table ─────────────────────────── */}
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