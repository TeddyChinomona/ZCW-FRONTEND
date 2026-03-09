/**
 * src/components/main/home_components/CSVUpload.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Bulk data upload page for ZRP admins (fulfils requirement ADM-03).
 *
 * Features
 * ────────
 *  • Drag-and-drop zone OR click-to-browse file picker (CSV only)
 *  • Pre-flight column validation against the required schema before upload
 *  • Upload progress bar driven by Axios onUploadProgress callback
 *  • Results summary panel: created / skipped / per-row error table
 *  • Upload history log stored in component state (current session only)
 *  • Matches the Bootstrap 5 + Bootstrap Icons style used across the dashboard
 *
 * Integration checklist
 * ─────────────────────
 *  1. Add `uploadCSV` to src/services/crimeService.js  (see crimeService_addition.js)
 *  2. Add "Data Upload" to the SideBar menuItems array in SideBar.jsx
 *  3. Add  DataUpload: <CSVUpload />  to the components map in Container.jsx
 */

import { useState, useRef, useCallback } from 'react';
import { uploadCSV } from '../../../services/crimeService';

// ─── Expected CSV columns ─────────────────────────────────────────────────────
// These mirror the REQUIRED_COLUMNS set in the Django CSVUploadView.
// We validate them client-side before sending so the user gets instant feedback.
const REQUIRED_COLUMNS = [
  'case_number',
  'crime_type',
  'timestamp',
  'latitude',
  'longitude',
  'modus_operandi',
  'status',
];

// ─── Small helper: read the first line of a CSV File and return its headers ──
const parseCSVHeaders = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Only read the first 2 KB — enough to capture the header line
    const blob = file.slice(0, 2048);
    reader.onload = (e) => {
      const firstLine = e.target.result.split('\n')[0] ?? '';
      // Normalise: lowercase, trim whitespace around each column name
      const headers = firstLine.split(',').map((h) => h.trim().toLowerCase());
      resolve(headers);
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(blob);
  });

// ─── Status badge helper ──────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    idle:       { color: 'secondary', label: 'Idle' },
    validating: { color: 'info',      label: 'Validating…' },
    uploading:  { color: 'primary',   label: 'Uploading…' },
    success:    { color: 'success',   label: 'Complete' },
    error:      { color: 'danger',    label: 'Failed' },
  };
  const { color, label } = map[status] ?? map.idle;
  return <span className={`badge bg-${color}`}>{label}</span>;
};

// ─── Main component ───────────────────────────────────────────────────────────
function CSVUpload() {
  // ── File state ──────────────────────────────────────────────────────────────
  const [file, setFile]               = useState(null);       // selected File object
  const [dragOver, setDragOver]       = useState(false);      // drag-hover highlight

  // ── Upload lifecycle state ───────────────────────────────────────────────────
  const [uploadStatus, setUploadStatus] = useState('idle');   // idle | validating | uploading | success | error
  const [progress, setProgress]         = useState(0);        // 0–100
  const [result, setResult]             = useState(null);     // { created, skipped, errors }
  const [errorMsg, setErrorMsg]         = useState('');       // top-level error string

  // ── Upload history (session only) ────────────────────────────────────────────
  const [history, setHistory] = useState([]);

  // ── Hidden file input ref ────────────────────────────────────────────────────
  const fileInputRef = useRef(null);

  // ─── File selection handler (shared by drop + input change) ─────────────────
  const handleFileSelect = useCallback((selectedFile) => {
    // Guard: only accept CSV files
    if (!selectedFile || !selectedFile.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Only .csv files are accepted.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setErrorMsg('');
    setProgress(0);
    setUploadStatus('idle');
  }, []);

  // ─── Drag-and-drop handlers ──────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      handleFileSelect(dropped);
    },
    [handleFileSelect],
  );

  const handleDragOver = (e) => {
    e.preventDefault();   // required to allow drop
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  // ─── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;

    // ── Step 1: Client-side column validation ─────────────────────────────────
    setUploadStatus('validating');
    setErrorMsg('');
    try {
      const headers = await parseCSVHeaders(file);
      const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

      if (missing.length > 0) {
        // Abort early — show the user exactly which columns are missing
        setErrorMsg(`Missing required columns: ${missing.join(', ')}`);
        setUploadStatus('error');
        return;
      }
    } catch {
      setErrorMsg('Could not read the file. Please check it is a valid CSV.');
      setUploadStatus('error');
      return;
    }

    // ── Step 2: Send to the backend ───────────────────────────────────────────
    setUploadStatus('uploading');
    setProgress(0);

    try {
      // uploadCSV streams the file and calls setProgress as chunks are sent
      const data = await uploadCSV(file, setProgress);

      setResult(data);
      setUploadStatus('success');

      // Append to the session history log
      setHistory((prev) => [
        {
          id:       Date.now(),
          filename: file.name,
          size:     (file.size / 1024).toFixed(1) + ' KB',
          time:     new Date().toLocaleTimeString(),
          created:  data.created,
          skipped:  data.skipped,
          errors:   data.errors?.length ?? 0,
        },
        ...prev,
      ]);
    } catch (err) {
      // Axios wraps server-side error messages in err.response.data.detail
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        'Upload failed. Please try again.';
      setErrorMsg(msg);
      setUploadStatus('error');
    }
  };

  // ─── Reset everything back to initial state ──────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setErrorMsg('');
    setProgress(0);
    setUploadStatus('idle');
    // Reset the hidden file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="topbar container-fluid">
      <div className="container-fluid p-4">

        {/* ── Page header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold mb-0">
            <i className="bi bi-cloud-upload me-2 text-primary"></i>
            Bulk Data Upload
          </h4>
          <span className="text-muted small">Admin only · POST /api/zrp/data/upload-csv/</span>
        </div>

        <div className="row g-4">

          {/* ══ LEFT COLUMN: Upload panel ══════════════════════════════════════ */}
          <div className="col-lg-7">

            {/* ── Drag-and-drop / click zone ── */}
            <div
              className={`card shadow-sm mb-4 border-2 ${
                dragOver ? 'border-primary bg-primary bg-opacity-10' : 'border-dashed'
              }`}
              style={{
                border: '2px dashed #dee2e6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                // Highlight border colour on drag-over is handled by className above
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label="Drop CSV file here or click to browse"
            >
              <div className="card-body text-center py-5">
                <i
                  className={`bi bi-file-earmark-arrow-up display-3 ${
                    dragOver ? 'text-primary' : 'text-secondary'
                  }`}
                ></i>
                <p className="fw-semibold mt-3 mb-1">
                  {dragOver ? 'Drop to select' : 'Drag & drop your CSV here'}
                </p>
                <p className="text-muted small mb-3">or click to browse</p>
                <span className="badge bg-secondary">CSV files only</span>
              </div>
            </div>

            {/* Hidden file input — triggered by clicking the drop zone above */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="d-none"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {/* ── Selected file info card ── */}
            {file && (
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <i className="bi bi-file-earmark-spreadsheet fs-3 text-success"></i>
                      <div>
                        <p className="fw-semibold mb-0">{file.name}</p>
                        <small className="text-muted">
                          {(file.size / 1024).toFixed(1)} KB ·{' '}
                          {new Date(file.lastModified).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <StatusBadge status={uploadStatus} />
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={(e) => {
                          e.stopPropagation(); // don't re-open file picker
                          handleReset();
                        }}
                        title="Remove file"
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  </div>

                  {/* Upload progress bar — visible only while uploading */}
                  {uploadStatus === 'uploading' && (
                    <div className="mt-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Uploading…</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                          style={{ width: `${progress}%` }}
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>
                  )}

                  {/* Validating spinner */}
                  {uploadStatus === 'validating' && (
                    <div className="mt-3 d-flex align-items-center gap-2 text-info">
                      <span className="spinner-border spinner-border-sm"></span>
                      <small>Validating column schema…</small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Top-level error alert ── */}
            {errorMsg && (
              <div className="alert alert-danger alert-dismissible d-flex align-items-start gap-2 mb-4">
                <i className="bi bi-exclamation-octagon-fill mt-1"></i>
                <div className="flex-grow-1">
                  <strong>Upload failed</strong>
                  <p className="mb-0 small mt-1">{errorMsg}</p>
                </div>
                <button className="btn-close" onClick={() => setErrorMsg('')}></button>
              </div>
            )}

            {/* ── Action buttons ── */}
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary px-4"
                onClick={handleUpload}
                // Disable while a file is not selected or an upload is in progress
                disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'validating'}
              >
                {uploadStatus === 'uploading' || uploadStatus === 'validating' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    {uploadStatus === 'validating' ? 'Validating…' : 'Uploading…'}
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-upload me-2"></i>
                    Upload to Database
                  </>
                )}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleReset}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'validating'}
              >
                <i className="bi bi-arrow-counterclockwise me-2"></i>
                Reset
              </button>
            </div>
          </div>

          {/* ══ RIGHT COLUMN: Schema guide + results ══════════════════════════ */}
          <div className="col-lg-5">

            {/* ── Results summary (shown after successful upload) ── */}
            {result && uploadStatus === 'success' && (
              <div className="card shadow-sm mb-4 border-success">
                <div className="card-header bg-success text-white fw-semibold">
                  <i className="bi bi-check-circle me-2"></i>Upload Complete
                </div>
                <div className="card-body">

                  {/* KPI row */}
                  <div className="row g-3 mb-3 text-center">
                    <div className="col-4">
                      <div className="border rounded p-2">
                        <h4 className="text-success fw-bold mb-0">{result.created}</h4>
                        <small className="text-muted">Created</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-2">
                        <h4 className="text-warning fw-bold mb-0">{result.skipped}</h4>
                        <small className="text-muted">Skipped</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-2">
                        <h4 className="text-danger fw-bold mb-0">{result.errors?.length ?? 0}</h4>
                        <small className="text-muted">Errors</small>
                      </div>
                    </div>
                  </div>

                  {/* Per-row error table (only rendered if there are errors) */}
                  {result.errors?.length > 0 && (
                    <>
                      <hr />
                      <p className="fw-semibold small mb-2">
                        <i className="bi bi-exclamation-triangle text-warning me-1"></i>
                        Row-level errors
                      </p>
                      {/* Scrollable table capped at 200 px so it doesn't push the page */}
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <table className="table table-sm table-bordered mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>Row</th>
                              <th>Case #</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.errors.map((err, i) => (
                              <tr key={i}>
                                <td>{err.row}</td>
                                <td className="font-monospace small">{err.case_number || '—'}</td>
                                <td className="text-danger small">{err.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Required schema reference card ── */}
            <div className="card shadow-sm mb-4">
              <div className="card-header fw-semibold bg-white">
                <i className="bi bi-table me-2 text-primary"></i>Required CSV Schema
              </div>
              <div className="card-body p-0">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Column</th>
                      <th>Required</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {[
                      { col: 'case_number',    req: true,  ex: 'ZRP-2024-00123' },
                      { col: 'crime_type',     req: true,  ex: 'Theft' },
                      { col: 'timestamp',      req: true,  ex: '2024-03-15 14:32:00' },
                      { col: 'latitude',       req: true,  ex: '-17.8292' },
                      { col: 'longitude',      req: true,  ex: '31.0522' },
                      { col: 'modus_operandi', req: true,  ex: 'Smash and grab' },
                      { col: 'status',         req: true,  ex: 'reported' },
                      { col: 'area',           req: false, ex: 'Harare CBD' },
                      { col: 'time_of_day',    req: false, ex: 'morning' },
                      { col: 'is_weekend',     req: false, ex: '0 or 1' },
                    ].map(({ col, req, ex }) => (
                      <tr key={col}>
                        <td className="font-monospace">{col}</td>
                        <td>
                          {req ? (
                            <span className="badge bg-danger">required</span>
                          ) : (
                            <span className="badge bg-secondary">optional</span>
                          )}
                        </td>
                        <td className="text-muted">{ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Info callout ── */}
            <div className="alert alert-info d-flex gap-2 small">
              <i className="bi bi-info-circle-fill mt-1 flex-shrink-0"></i>
              <div>
                <strong>Duplicate handling:</strong> Rows with a{' '}
                <code>case_number</code> already in the database are
                skipped automatically. New <code>crime_type</code> values
                are created on-the-fly.
              </div>
            </div>
          </div>
        </div>

        {/* ══ Upload history (session) ════════════════════════════════════════ */}
        {history.length > 0 && (
          <div className="card shadow-sm mt-2">
            <div className="card-header fw-semibold bg-white d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-clock-history me-2 text-primary"></i>
                Session Upload History
              </span>
              {/* Clear history button */}
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setHistory([])}
              >
                <i className="bi bi-trash me-1"></i>Clear
              </button>
            </div>
            <div className="card-body p-0">
              <table className="table table-hover table-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th>File</th>
                    <th>Size</th>
                    <th>Time</th>
                    <th className="text-success">Created</th>
                    <th className="text-warning">Skipped</th>
                    <th className="text-danger">Errors</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="font-monospace">{h.filename}</td>
                      <td>{h.size}</td>
                      <td>{h.time}</td>
                      <td className="text-success fw-bold">{h.created}</td>
                      <td className="text-warning fw-bold">{h.skipped}</td>
                      <td className={h.errors > 0 ? 'text-danger fw-bold' : ''}>{h.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default CSVUpload;
