/**
 * src/components/main/home_components/MLTraining.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only panel for manually re-training the ML models via
 * POST /api/zrp/ml/train/
 *
 * The backend auto-selects the training mode:
 *
 *   SUPERVISED   — ProfileMatcher (RandomForest)
 *                  Used when incidents have a serial_group_label set.
 *                  Returns: mode, n_samples, n_classes, cv_accuracy_mean, cv_accuracy_std
 *
 *   UNSUPERVISED — SerialCrimeLinkageModel (DBSCAN)
 *                  Fallback when no labels exist.
 *                  Returns: mode, n_cases, n_serial_clusters, n_unlinked_cases,
 *                           silhouette_score, clusters[]
 *
 * The frontend renders the correct results card depending on the `mode`
 * field in the API response.
 */

import { useState, useEffect } from 'react';
import { triggerMLTraining } from '../../../services/crimeService';

// ─── Read the logged-in user's role from localStorage ────────────────────────
const getCurrentUserRole = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw).role : null;
  } catch {
    return null;
  }
};

// ─── Training lifecycle states ────────────────────────────────────────────────
const STATUS = {
  IDLE:       'idle',
  CONFIRMING: 'confirming',
  TRAINING:   'training',
  SUCCESS:    'success',
  ERROR:      'error',
};

// ─── Animated step labels shown while the server trains ──────────────────────
const TRAINING_STEPS = [
  'Checking for labelled incidents…',
  'Selecting training mode…',
  'Extracting features from incidents…',
  'Fitting model on training data…',
  'Evaluating model performance…',
  'Persisting trained model to disk…',
];

// ─── Reusable metric tile ─────────────────────────────────────────────────────
const MetricTile = ({ label, value, color = 'primary', icon }) => (
  <div className="col-6 col-md-3">
    <div className="card border-0 shadow-sm text-center py-3">
      {icon && <i className={`bi bi-${icon} fs-3 text-${color} mb-1 d-block`}></i>}
      <p className={`fw-bold fs-5 mb-0 text-${color}`}>{value ?? '—'}</p>
      <small className="text-muted">{label}</small>
    </div>
  </div>
);

// ─── Supervised results card ──────────────────────────────────────────────────
// Shown when the backend used ProfileMatcher (RandomForest).
const SupervisedResults = ({ result }) => (
  <div className="card shadow-sm mb-4 border-success">
    <div className="card-header bg-success text-white fw-semibold d-flex align-items-center gap-2">
      <i className="bi bi-check-circle-fill"></i>
      Supervised Training Complete — ProfileMatcher (RandomForest)
    </div>
    <div className="card-body">
      <div className="d-flex align-items-center gap-2 mb-3">
        <span className="badge bg-success px-3 py-2">
          <i className="bi bi-tag-fill me-1"></i>Supervised Mode
        </span>
        <small className="text-muted">
          Incidents with <code>serial_group_label</code> were used.
        </small>
      </div>
      <div className="row g-3 mb-3">
        <MetricTile label="Training Samples" value={result.n_samples}  color="primary" icon="database"  />
        <MetricTile label="Crime Groups"     value={result.n_classes}  color="info"    icon="diagram-3" />
        <MetricTile
          label="CV Accuracy"
          value={result.cv_accuracy_mean != null ? `${(result.cv_accuracy_mean * 100).toFixed(1)}%` : '—'}
          color="success" icon="bullseye"
        />
        <MetricTile
          label="Std Dev"
          value={result.cv_accuracy_std != null ? `±${(result.cv_accuracy_std * 100).toFixed(1)}%` : '—'}
          color="warning" icon="bar-chart"
        />
      </div>
      <div className="alert alert-success mb-0 small">
        <i className="bi bi-info-circle me-1"></i>
        The Profile Matcher will use this updated model immediately for similarity lookups.
      </div>
    </div>
  </div>
);

// ─── Unsupervised results card ────────────────────────────────────────────────
// Shown when the backend fell back to SerialCrimeLinkageModel (DBSCAN).
const UnsupervisedResults = ({ result }) => {
  const topClusters = (result.clusters ?? []).slice(0, 5);
  return (
    <div className="card shadow-sm mb-4 border-info">
      <div className="card-header bg-info text-white fw-semibold d-flex align-items-center gap-2">
        <i className="bi bi-check-circle-fill"></i>
        Unsupervised Training Complete — Serial Crime Linkage (DBSCAN)
      </div>
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <span className="badge bg-info px-3 py-2">
            <i className="bi bi-diagram-2-fill me-1"></i>Unsupervised Mode
          </span>
          <small className="text-muted">
            No labelled incidents found — DBSCAN clustering was used instead.
          </small>
        </div>
        <div className="row g-3 mb-3">
          <MetricTile label="Cases Analysed"  value={result.n_cases}           color="primary"   icon="database"    />
          <MetricTile label="Serial Clusters" value={result.n_serial_clusters} color="info"      icon="diagram-3"   />
          <MetricTile label="Unlinked Cases"  value={result.n_unlinked_cases}  color="secondary" icon="dash-circle" />
          <MetricTile
            label="Silhouette Score"
            value={result.silhouette_score != null ? result.silhouette_score.toFixed(3) : 'N/A'}
            color="warning" icon="stars"
          />
        </div>

        {/* Cluster table */}
        {topClusters.length > 0 ? (
          <>
            <p className="fw-semibold small mb-2">
              <i className="bi bi-list-ul me-1 text-info"></i>
              Top Serial Clusters Detected
              {result.clusters.length > 5 && (
                <span className="text-muted fw-normal ms-2">(showing 5 of {result.clusters.length})</span>
              )}
            </p>
            <div className="table-responsive" style={{ maxHeight: 220, overflowY: 'auto' }}>
              <table className="table table-sm table-hover table-bordered mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Group</th><th>Cases</th><th>Avg Sim</th><th>Min Sim</th><th>Case Numbers</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {topClusters.map((c) => (
                    <tr key={c.cluster_id}>
                      <td><span className="badge bg-info">{c.label}</span></td>
                      <td className="fw-bold">{c.n_cases}</td>
                      <td>{c.mean_intra_similarity}</td>
                      <td>{c.min_intra_similarity}</td>
                      <td className="font-monospace text-muted" style={{ fontSize: '0.75rem' }}>
                        {c.case_numbers.slice(0, 3).join(', ')}
                        {c.case_numbers.length > 3 && ` +${c.case_numbers.length - 3} more`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="alert alert-secondary small mb-0">
            <i className="bi bi-info-circle me-1"></i>
            No serial clusters found — all cases appear unlinked at current similarity thresholds.
          </div>
        )}

        {/* Advice to label and re-train */}
        <div className="alert alert-warning small mt-3 mb-0 d-flex gap-2">
          <i className="bi bi-lightbulb-fill mt-1 flex-shrink-0 text-warning"></i>
          <div>
            <strong>Improve accuracy:</strong> Review the clusters above, assign{' '}
            <code>serial_group_label</code> values to confirmed linked incidents,
            then re-train to switch to the more accurate <strong>supervised</strong> RandomForest model.
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
function MLTraining() {
  const userRole = getCurrentUserRole();
  const isAdmin  = userRole === 'admin' || 'officer';

  const [status,    setStatus]    = useState(STATUS.IDLE);
  const [result,    setResult]    = useState(null);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [history,   setHistory]   = useState([]);

  // Cycle animated step label while training
  useEffect(() => {
    if (status !== STATUS.TRAINING) return;
    const interval = setInterval(
      () => setStepIndex((prev) => (prev + 1) % TRAINING_STEPS.length),
      1800,
    );
    return () => clearInterval(interval);
  }, [status]);

  const handleRequestTrain  = () => { setStatus(STATUS.CONFIRMING); setErrorMsg(''); };
  const handleCancel        = () => setStatus(STATUS.IDLE);

  const handleConfirmTrain = async () => {
    setStatus(STATUS.TRAINING);
    setStepIndex(0);
    setResult(null);
    const startTime = Date.now();

    try {
      // POST /api/zrp/ml/train/ — response always has { mode: "supervised"|"unsupervised", ...metrics }
      const data = await triggerMLTraining();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      setResult(data);
      setStatus(STATUS.SUCCESS);

      // Build a short human-readable summary for the history table
      const summary = data.mode === 'supervised'
        ? `${data.n_samples} samples, ${data.n_classes} groups, CV acc ${((data.cv_accuracy_mean ?? 0) * 100).toFixed(1)}%`
        : `${data.n_cases} cases, ${data.n_serial_clusters} clusters`;

      setHistory((prev) => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(),
          mode: data.mode ?? 'unknown', outcome: 'success', elapsed: `${elapsed}s`, summary },
        ...prev,
      ]);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Training failed.';
      setErrorMsg(msg);
      setStatus(STATUS.ERROR);
      setHistory((prev) => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(),
          mode: '—', outcome: 'error', elapsed: '—', summary: msg },
        ...prev,
      ]);
    }
  };

  // Non-admin guard
  if (!isAdmin) {
    return (
      <div className="topbar container-fluid">
        <div className="container-fluid p-4">
          <div className="alert alert-danger d-flex align-items-center gap-3 mt-4">
            <i className="bi bi-shield-lock-fill fs-3"></i>
            <div>
              <strong>Access Denied</strong>
              <p className="mb-0 small">
                Model training is restricted to admin accounts. Your current role
                is <code>{userRole ?? 'unknown'}</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid p-4">

        {/* Page header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold mb-0">
            <i className="bi bi-cpu me-2 text-primary"></i>ML Model Training
          </h4>
          <span className="badge bg-danger">
            <i className="bi bi-shield-lock me-1"></i>Admin Only
          </span>
        </div>

        <div className="row g-4">

          {/* ══ LEFT: Training panel ══ */}
          <div className="col-lg-7">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-diagram-3 me-2 text-primary"></i>Dual-Mode Training Engine
              </div>
              <div className="card-body">
                <p className="text-muted small mb-4">
                  The system automatically selects the best training strategy:
                  <strong> supervised</strong> (RandomForest) when labelled incidents exist,
                  or <strong> unsupervised</strong> (DBSCAN serial clustering) as a fallback.
                </p>

                {/* Mode tiles */}
                <div className="row g-2 mb-4">
                  <div className="col-md-6">
                    <div className="border rounded p-3 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge bg-success">Supervised</span>
                        <small className="text-muted">if labels exist</small>
                      </div>
                      <p className="small mb-0 text-muted">
                        <strong>ProfileMatcher</strong> — RandomForest trained on incidents
                        with <code>serial_group_label</code> set. Returns CV accuracy metrics.
                      </p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="border rounded p-3 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge bg-info">Unsupervised</span>
                        <small className="text-muted">fallback</small>
                      </div>
                      <p className="small mb-0 text-muted">
                        <strong>SerialCrimeLinkage</strong> — DBSCAN clusters incidents by
                        temporal, spatial, and M.O. similarity. No labels required.
                      </p>
                    </div>
                  </div>
                </div>

                {/* IDLE */}
                {status === STATUS.IDLE && (
                  <button className="btn btn-primary btn-lg w-100 py-3" onClick={handleRequestTrain}>
                    <i className="bi bi-play-circle-fill me-2 fs-5"></i>Train Model Now
                  </button>
                )}

                {/* CONFIRMING */}
                {status === STATUS.CONFIRMING && (
                  <div className="alert alert-warning mb-0">
                    <div className="d-flex align-items-start gap-3">
                      <i className="bi bi-exclamation-triangle-fill fs-4 mt-1 text-warning flex-shrink-0"></i>
                      <div className="flex-grow-1">
                        <p className="fw-semibold mb-1">Confirm model re-training</p>
                        <p className="small text-muted mb-3">
                          The system will check for labelled incidents and auto-select the
                          training mode. The existing model will be replaced and cannot be restored.
                        </p>
                        <div className="d-flex gap-2">
                          <button className="btn btn-warning fw-semibold" onClick={handleConfirmTrain}>
                            <i className="bi bi-check-lg me-2"></i>Yes, train now
                          </button>
                          <button className="btn btn-outline-secondary" onClick={handleCancel}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRAINING */}
                {status === STATUS.TRAINING && (
                  <div className="text-center py-3">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 mb-3"
                      style={{ width: 80, height: 80 }}
                    >
                      <i className="bi bi-cpu-fill text-primary"
                         style={{ fontSize: '2.2rem', animation: 'pulse 1.2s infinite' }}></i>
                    </div>
                    <p className="fw-semibold mb-1">Training in progress…</p>
                    <p className="text-muted small mb-3" style={{ minHeight: '1.5em' }}>
                      {TRAINING_STEPS[stepIndex]}
                    </p>
                    <div className="progress mx-auto" style={{ height: 8, maxWidth: 400 }}>
                      <div className="progress-bar progress-bar-striped progress-bar-animated bg-primary w-100" />
                    </div>
                    <small className="text-muted d-block mt-2">Do not close this page until training completes.</small>
                  </div>
                )}

                {/* ERROR */}
                {status === STATUS.ERROR && (
                  <div className="alert alert-danger d-flex align-items-start gap-3 mb-0">
                    <i className="bi bi-x-octagon-fill fs-4 text-danger mt-1 flex-shrink-0"></i>
                    <div className="flex-grow-1">
                      <p className="fw-semibold mb-1">Training failed</p>
                      <p className="small text-muted mb-3">{errorMsg}</p>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => setStatus(STATUS.IDLE)}>
                        <i className="bi bi-arrow-counterclockwise me-1"></i>Try again
                      </button>
                    </div>
                  </div>
                )}

                {/* Train again after success */}
                {status === STATUS.SUCCESS && (
                  <div className="mt-3 text-end">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => setStatus(STATUS.IDLE)}>
                      <i className="bi bi-arrow-counterclockwise me-1"></i>Train again
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Render the right results card based on mode returned by API */}
            {status === STATUS.SUCCESS && result && (
              result.mode === 'supervised'
                ? <SupervisedResults  result={result} />
                : <UnsupervisedResults result={result} />
            )}

            {/* Session history */}
            {history.length > 0 && (
              <div className="card shadow-sm">
                <div className="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-clock-history me-2 text-primary"></i>Session History</span>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setHistory([])}>
                    <i className="bi bi-trash me-1"></i>Clear
                  </button>
                </div>
                <div className="card-body p-0">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr><th>Date</th><th>Time</th><th>Mode</th><th>Duration</th><th>Outcome</th><th>Summary</th></tr>
                    </thead>
                    <tbody className="small">
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td>{h.date}</td>
                          <td>{h.time}</td>
                          <td>
                            {h.mode === 'supervised'
                              ? <span className="badge bg-success">Supervised</span>
                              : h.mode === 'unsupervised'
                                ? <span className="badge bg-info">Unsupervised</span>
                                : <span className="badge bg-secondary">{h.mode}</span>}
                          </td>
                          <td>{h.elapsed}</td>
                          <td>
                            {h.outcome === 'success'
                              ? <span className="badge bg-success">Success</span>
                              : <span className="badge bg-danger">Failed</span>}
                          </td>
                          <td className="text-muted"
                              style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={h.summary}>
                            {h.summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT: Info sidebar ══ */}
          <div className="col-lg-5">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-signpost-split me-2 text-primary"></i>Training Mode Selection
              </div>
              <div className="card-body">
                {[
                  { icon: 'search',           color: 'primary', text: 'Backend checks for incidents where serial_group_label is non-empty.' },
                  { icon: 'check2-circle',    color: 'success', text: 'Labels found → ProfileMatcher (RandomForest) is trained. Returns cross-validated accuracy.' },
                  { icon: 'arrow-return-right', color: 'info',  text: 'No labels → SerialCrimeLinkageModel (DBSCAN) clusters all incidents by composite similarity score.' },
                  { icon: 'tag',              color: 'warning', text: 'After reviewing DBSCAN clusters, set serial_group_label on confirmed cases and re-train for supervised mode.' },
                ].map(({ icon, color, text }, i) => (
                  <div key={i} className="d-flex gap-3 mb-3">
                    <div className={`d-flex align-items-center justify-content-center rounded-circle bg-${color} bg-opacity-10 flex-shrink-0`}
                         style={{ width: 36, height: 36 }}>
                      <i className={`bi bi-${icon} text-${color}`}></i>
                    </div>
                    <p className="mb-0 small text-muted">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="alert alert-info d-flex gap-2 small mb-4">
              <i className="bi bi-lightbulb-fill mt-1 flex-shrink-0"></i>
              <div>
                <strong>When to re-train</strong>
                <ul className="mb-0 mt-1 ps-3">
                  <li>After a bulk CSV upload</li>
                  <li>After labelling clusters from an unsupervised run</li>
                  <li>When Profile Matcher returns poor results</li>
                  <li>On a scheduled maintenance window</li>
                </ul>
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-hdd-stack me-2 text-primary"></i>Endpoint Reference
              </div>
              <div className="card-body">
                <table className="table table-sm mb-0 small">
                  <tbody>
                    <tr><td className="text-muted">Method</td><td><span className="badge bg-primary">POST</span></td></tr>
                    <tr><td className="text-muted">URL</td><td className="font-monospace">/api/zrp/ml/train/</td></tr>
                    <tr><td className="text-muted">Auth</td><td>JWT Bearer (admin)</td></tr>
                    <tr><td className="text-muted">Supervised 200</td><td><code>mode, n_samples, cv_accuracy_mean…</code></td></tr>
                    <tr><td className="text-muted">Unsupervised 200</td><td><code>mode, n_cases, n_serial_clusters…</code></td></tr>
                    <tr><td className="text-muted">400</td><td>No data / insufficient samples</td></tr>
                    <tr><td className="text-muted">403</td><td>Non-admin token</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1;   transform: scale(1);    }
            50%       { opacity: 0.6; transform: scale(1.15); }
          }
        `}</style>

      </div>
    </div>
  );
}

export default MLTraining;
