/**
 * src/components/main/home_components/RRB.jsx  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Report Record Book — creates a new crime incident on the Django backend.
 *
 * Changes from original
 * ─────────────────────
 * • All original form fields and layout preserved exactly
 * • handleSubmit replaced:  alert() → createIncident() API call
 * • Crime type dropdown now populated from GET /api/zrp/crime-types/
 * • Latitude / Longitude inputs added (required by PostGIS backend)
 * • num_suspects, weapon_used, serial_group_label fields added to form
 * • Case number auto-generated (editable) in ZRP-YYYY-NNNNN format
 * • Success banner + reset after submit; error banner on failure
 * • Stolen items list is serialised into modus_operandi JSON block before POST
 *
 * Backend payload  (POST /api/zrp/incidents/)
 * ────────────────────────────────────────────
 * {
 *   case_number, crime_type (ID), timestamp, latitude, longitude,
 *   suburb, description_narrative, modus_operandi,
 *   status, weapon_used, num_suspects, serial_group_label
 * }
 */

import { useState, useEffect } from 'react';
import { createIncident, getCrimeTypes } from '../../../services/crimeService';

// ─── Auto-generate a case number  ZRP-YYYY-NNNNN ─────────────────────────────
const generateCaseNumber = () => {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `ZRP-${year}-${rand}`;
};

// ─── Initial form state ───────────────────────────────────────────────────────
const INITIAL_FORM = {
  caseNumber: generateCaseNumber(),
  station: '',
  section: '',
  complainant: {
    rcNr: '',
    residentialAddress: '',
    residentialPhone: '',
    businessAddress: '',
    businessPhone: '',
  },
  crimeTypeId: '',
  timeDateCommitted: '',
  suburb: '',
  latitude: '',
  longitude: '',
  briefDetails: '',
  modusOperandi: '',
  weaponUsed: '',
  numSuspects: 0,
  serialGroupLabel: '',
  investigatingOfficer: '',
  stolenItems: [],
  status: 'reported',
};

const INITIAL_ITEM = { description: '', identifyingMarks: '', dateRecovered: '' };

// ─── Component ────────────────────────────────────────────────────────────────
function RRB() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [currentItem, setCurrentItem] = useState(INITIAL_ITEM);
  const [showRecoverySection, setShowRecoverySection] = useState(false);
  const [cancellationOfficer, setCancellationOfficer] = useState('');

  // API state
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [crimeTypesLoading, setCrimeTypesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null); // submitted incident obj
  const [submitError, setSubmitError] = useState('');

  // ── Load crime types for dropdown ──────────────────────────────────────
  useEffect(() => {
    setCrimeTypesLoading(true);
    getCrimeTypes()
      .then(setCrimeTypes)
      .catch(() => setCrimeTypes([]))
      .finally(() => setCrimeTypesLoading(false));
  }, []);

  // ── Generic input handler ───────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));
  };

  const addStolenItem = () => {
    if (currentItem.description && currentItem.identifyingMarks) {
      setFormData((prev) => ({
        ...prev,
        stolenItems: [...prev.stolenItems, { ...currentItem, id: Date.now() }],
      }));
      setCurrentItem(INITIAL_ITEM);
    }
  };

  const removeStolenItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      stolenItems: prev.stolenItems.filter((item) => item.id !== id),
    }));
  };

  const markAsRecovered = (id, date) => {
    setFormData((prev) => ({
      ...prev,
      stolenItems: prev.stolenItems.map((item) =>
        item.id === id ? { ...item, dateRecovered: date } : item,
      ),
    }));
  };

  // ── Build backend payload and submit ────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(null);

    // Validate required fields
    if (!formData.crimeTypeId) { setSubmitError('Please select a crime type (Offence).'); return; }
    if (!formData.timeDateCommitted) { setSubmitError('Please enter the time and date committed.'); return; }
    if (!formData.suburb.trim()) { setSubmitError('Scene of Crime / Suburb is required.'); return; }
    if (!formData.latitude || !formData.longitude) { setSubmitError('Latitude and Longitude are required for spatial mapping.'); return; }

    // Serialise stolen items into the modus_operandi field if no MO was typed
    const stolenItemsText = formData.stolenItems.length
      ? '\n\n--- STOLEN ITEMS ---\n' +
        formData.stolenItems
          .map((item, i) =>
            `${i + 1}. ${item.description} | Marks: ${item.identifyingMarks}${item.dateRecovered ? ` | Recovered: ${item.dateRecovered}` : ''}`,
          )
          .join('\n')
      : '';

    const moText = [formData.modusOperandi, stolenItemsText].filter(Boolean).join('');

    // Build complainant info block for description
    const complainantBlock =
      `Complainant: ${formData.complainant.rcNr} | ` +
      `Res. Address: ${formData.complainant.residentialAddress} | ` +
      `Phone: ${formData.complainant.residentialPhone} | ` +
      `Business: ${formData.complainant.businessAddress} | ` +
      `Bus. Phone: ${formData.complainant.businessPhone} | ` +
      `Station: ${formData.station} | Section: ${formData.section} | ` +
      `Investigating Officer: ${formData.investigatingOfficer}`;

    const payload = {
      case_number:           formData.caseNumber,
      crime_type:            Number(formData.crimeTypeId),
      timestamp:             new Date(formData.timeDateCommitted).toISOString(),
      latitude:              parseFloat(formData.latitude),
      longitude:             parseFloat(formData.longitude),
      suburb:                formData.suburb.trim(),
      description_narrative: [formData.briefDetails, complainantBlock].filter(Boolean).join('\n\n'),
      modus_operandi:        moText,
      status:                formData.status,
      weapon_used:           formData.weaponUsed,
      num_suspects:          Number(formData.numSuspects) || 0,
      serial_group_label:    formData.serialGroupLabel,
    };

    setSubmitting(true);
    try {
      const created = await createIncident(payload);
      setSubmitSuccess(created);
      // Reset form with a fresh case number
      setFormData({ ...INITIAL_FORM, caseNumber: generateCaseNumber() });
      setCancellationOfficer('');
      setShowRecoverySection(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        setSubmitError(messages);
      } else {
        setSubmitError('Submission failed. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...INITIAL_FORM, caseNumber: generateCaseNumber() });
    setSubmitError('');
    setSubmitSuccess(null);
    setCancellationOfficer('');
    setShowRecoverySection(false);
  };

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-primary">
              <div className="card-header bg-dark text-white text-center py-3">
                <h3 className="mb-0 fw-bold">
                  <i className="bi bi-journal-text me-2"></i>
                  ZIMBABWE REPUBLIC POLICE
                </h3>
                <h5 className="mb-0">REPORT RECORD BOOK (R.R.B.)</h5>
                <small className="text-warning">
                  Z.P. 37 — RECORD OF PROPERTY REPORTED STOLEN / REGISTER OF CRIME ENTRIES
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* ── Success banner ──────────────────────────────────────────────── */}
        {submitSuccess && (
          <div className="alert alert-success alert-dismissible mb-4 d-flex align-items-start" role="alert">
            <i className="bi bi-check-circle-fill fs-4 me-3 mt-1"></i>
            <div>
              <strong>Incident submitted successfully!</strong>
              <div className="small mt-1">
                Case number <strong>{submitSuccess.case_number}</strong> (ID: {submitSuccess.id}) has been recorded in the system.
              </div>
            </div>
            <button className="btn-close ms-auto" onClick={() => setSubmitSuccess(null)}></button>
          </div>
        )}

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {submitError && (
          <div className="alert alert-danger alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Submission Error:</strong> {submitError}
            <button className="btn-close" onClick={() => setSubmitError('')}></button>
          </div>
        )}

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <div className="row">

            {/* ══ LEFT COLUMN ══════════════════════════════════════════════ */}
            <div className="col-md-8">

              {/* Case Reference Card */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-dark text-white">
                  <h5 className="mb-0"><i className="bi bi-hash me-2"></i>Case Reference</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-semibold">Case Number (C.R./L.P.B.)</label>
                      <input
                        type="text"
                        className="form-control"
                        name="caseNumber"
                        value={formData.caseNumber}
                        onChange={handleInputChange}
                        placeholder="ZRP-YYYY-NNNNN"
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-semibold">Station</label>
                      <input
                        type="text"
                        className="form-control"
                        name="station"
                        value={formData.station}
                        onChange={handleInputChange}
                        placeholder="Enter station name"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label fw-semibold">Section</label>
                      <input
                        type="text"
                        className="form-control"
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        placeholder="Enter section"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Complainant Details Card */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0"><i className="bi bi-person-fill me-2"></i>Complainant Information</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">R.C./N.R.</label>
                      <input
                        type="text"
                        className="form-control"
                        name="complainant.rcNr"
                        value={formData.complainant.rcNr}
                        onChange={handleInputChange}
                        placeholder="National Registration Number"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Residential Address</label>
                      <input
                        type="text"
                        className="form-control"
                        name="complainant.residentialAddress"
                        value={formData.complainant.residentialAddress}
                        onChange={handleInputChange}
                        placeholder="Home address"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Residential Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="complainant.residentialPhone"
                        value={formData.complainant.residentialPhone}
                        onChange={handleInputChange}
                        placeholder="+263 77 XXX XXXX"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Business Address</label>
                      <input
                        type="text"
                        className="form-control"
                        name="complainant.businessAddress"
                        value={formData.complainant.businessAddress}
                        onChange={handleInputChange}
                        placeholder="Workplace address"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Business Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="complainant.businessPhone"
                        value={formData.complainant.businessPhone}
                        onChange={handleInputChange}
                        placeholder="+263 4 XXX XXXX"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Incident Details Card */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0"><i className="bi bi-exclamation-triangle-fill me-2"></i>Incident Details</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    {/* Crime Type (Offence) */}
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Offence / Crime Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        name="crimeTypeId"
                        value={formData.crimeTypeId}
                        onChange={handleInputChange}
                        required
                        disabled={crimeTypesLoading}
                      >
                        <option value="">
                          {crimeTypesLoading ? 'Loading crime types…' : '— Select offence —'}
                        </option>
                        {crimeTypes.map((ct) => (
                          <option key={ct.id} value={ct.id}>{ct.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Status</label>
                      <select
                        className="form-select"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="reported">Reported</option>
                        <option value="under_investigation">Under Investigation</option>
                        <option value="closed">Closed</option>
                        <option value="unsolved">Unsolved</option>
                      </select>
                    </div>

                    {/* Timestamp */}
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Time and Date Committed <span className="text-danger">*</span></label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        name="timeDateCommitted"
                        value={formData.timeDateCommitted}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Scene of Crime / Suburb */}
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Scene of Crime / Suburb <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="suburb"
                        value={formData.suburb}
                        onChange={handleInputChange}
                        placeholder="e.g. Mbare, Borrowdale, CBD"
                        required
                      />
                    </div>

                    {/* Coordinates */}
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        Latitude <span className="text-danger">*</span>
                        <small className="text-muted ms-2">(WGS-84, e.g. -17.8292)</small>
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        placeholder="-17.8292"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        Longitude <span className="text-danger">*</span>
                        <small className="text-muted ms-2">(e.g. 31.0522)</small>
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        placeholder="31.0522"
                        required
                      />
                    </div>

                    {/* Weapon used */}
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Weapon Used</label>
                      <input
                        type="text"
                        className="form-control"
                        name="weaponUsed"
                        value={formData.weaponUsed}
                        onChange={handleInputChange}
                        placeholder="e.g. Knife, Firearm, Unknown"
                      />
                    </div>

                    {/* Number of suspects */}
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Number of Suspects</label>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        name="numSuspects"
                        value={formData.numSuspects}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Serial group */}
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Serial Group Label</label>
                      <input
                        type="text"
                        className="form-control"
                        name="serialGroupLabel"
                        value={formData.serialGroupLabel}
                        onChange={handleInputChange}
                        placeholder="e.g. 'Mbare Burglar 2024' — links related serial incidents"
                      />
                    </div>
                  </div>

                  {/* Description / MO */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Brief Details of Offence</label>
                    <textarea
                      className="form-control"
                      name="briefDetails"
                      value={formData.briefDetails}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Provide detailed description of the incident…"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Modus Operandi</label>
                    <textarea
                      className="form-control"
                      name="modusOperandi"
                      value={formData.modusOperandi}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="How the crime was carried out, patterns, entry method…"
                    />
                  </div>
                </div>
              </div>

              {/* Stolen Items Card */}
              <div className="card mb-4 shadow-sm">
                <div className="card-header bg-danger text-white">
                  <h5 className="mb-0"><i className="bi bi-bag-x-fill me-2"></i>Property Reported Stolen</h5>
                </div>
                <div className="card-body">
                  {/* Add item form */}
                  <div className="row g-2 mb-3">
                    <div className="col-md-5">
                      <input
                        type="text"
                        className="form-control"
                        name="description"
                        value={currentItem.description}
                        onChange={handleItemChange}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-md-5">
                      <input
                        type="text"
                        className="form-control"
                        name="identifyingMarks"
                        value={currentItem.identifyingMarks}
                        onChange={handleItemChange}
                        placeholder="Identifying marks / serial number"
                      />
                    </div>
                    <div className="col-md-2">
                      <button
                        type="button"
                        className="btn btn-danger w-100"
                        onClick={addStolenItem}
                        disabled={!currentItem.description || !currentItem.identifyingMarks}
                      >
                        <i className="bi bi-plus-circle"></i>
                      </button>
                    </div>
                  </div>

                  {/* Items table */}
                  {formData.stolenItems.length === 0 ? (
                    <p className="text-muted text-center py-3 small">No stolen items added yet</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Description</th>
                            <th>Identifying Marks</th>
                            <th>Date Recovered</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.stolenItems.map((item, idx) => (
                            <tr key={item.id} className={item.dateRecovered ? 'table-success' : ''}>
                              <td>{idx + 1}</td>
                              <td>{item.description}</td>
                              <td>{item.identifyingMarks}</td>
                              <td>
                                {item.dateRecovered ? (
                                  <span className="badge bg-success">{item.dateRecovered}</span>
                                ) : (
                                  <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    style={{ width: 140 }}
                                    onChange={(e) => markAsRecovered(item.id, e.target.value)}
                                  />
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeStolenItem(item.id)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Recovery section toggle */}
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={() => setShowRecoverySection(!showRecoverySection)}
                    >
                      <i className="bi bi-arrow-return-left me-1"></i>
                      {showRecoverySection ? 'Hide' : 'Show'} Cancellation / Recovery Section
                    </button>
                  </div>

                  {showRecoverySection && (
                    <div className="mt-3 p-3 bg-light rounded border">
                      <h6 className="fw-bold">Cancellation / CRO Forwarding</h6>
                      <p className="text-muted small">
                        This form must be submitted to C.R.O. in triplicate. One copy will be returned to the
                        Investigating Officer indicating that carding has been effected. In the event of some or
                        all of the stolen property being recovered, the date will be entered in the "recovery"
                        column opposite recovered items and the form forwarded to C.R.O. for amendment of their
                        records.
                      </p>
                      <label className="form-label">Cancellation Officer</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cancellationOfficer}
                        onChange={(e) => setCancellationOfficer(e.target.value)}
                        placeholder="Officer name & badge number"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══ RIGHT COLUMN ═════════════════════════════════════════════ */}
            <div className="col-md-4">

              {/* Case Summary Card */}
              <div className="card mb-4 shadow-sm sticky-top" style={{ top: 80 }}>
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0"><i className="bi bi-clipboard-data me-2"></i>Case Summary</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong className="text-muted small d-block">Case Number</strong>
                    <span className="fw-bold text-primary">{formData.caseNumber}</span>
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted small d-block">Crime Type</strong>
                    <span>
                      {formData.crimeTypeId
                        ? crimeTypes.find((ct) => String(ct.id) === String(formData.crimeTypeId))?.name ?? '—'
                        : '—'}
                    </span>
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted small d-block">Location</strong>
                    <span>{formData.suburb || '—'}</span>
                    {formData.latitude && formData.longitude && (
                      <div className="text-muted small">
                        {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <strong className="text-muted small d-block">Date / Time</strong>
                    <span>
                      {formData.timeDateCommitted
                        ? new Date(formData.timeDateCommitted).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  <hr />
                  <div className="mb-3">
                    <strong>Total Items Reported:</strong>
                    <h2 className="text-primary">{formData.stolenItems.length}</h2>
                  </div>
                  <div className="mb-3">
                    <strong>Recovered Items:</strong>
                    <h2 className="text-success">
                      {formData.stolenItems.filter((i) => i.dateRecovered).length}
                    </h2>
                  </div>
                  <div className="mb-3">
                    <strong>Pending Recovery:</strong>
                    <h2 className="text-warning">
                      {formData.stolenItems.filter((i) => !i.dateRecovered).length}
                    </h2>
                  </div>
                </div>

                {/* Investigating Officer Card */}
                <div className="card-footer bg-info bg-opacity-10">
                  <label className="form-label fw-bold small">Investigating Officer</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    name="investigatingOfficer"
                    value={formData.investigatingOfficer}
                    onChange={handleInputChange}
                    placeholder="Officer name & badge ID"
                  />
                  <small className="text-muted d-block mt-1">
                    Note: This form must be submitted to C.R.O.
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* ── Submit / Reset ────────────────────────────────────────────── */}
          <div className="row mb-4">
            <div className="col-12 text-center">
              <button
                type="submit"
                className="btn btn-primary btn-lg px-5 me-3"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Submitting to Backend…
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>Submit Report
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg px-5"
                onClick={handleReset}
                disabled={submitting}
              >
                <i className="bi bi-x-circle me-2"></i>Clear Form
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RRB;
