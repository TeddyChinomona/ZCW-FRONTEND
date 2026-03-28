/**
 * src/components/main/home_components/Reports.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. "Generate Report" now fetches real data from backend and shows a live
 *     preview table instead of a fake loading delay.
 *  2. Added "Export PDF" — uses window.print() with a hidden print stylesheet
 *     so the preview table is exported as a PDF via the browser's print dialog.
 *  3. Added "Export CSV" — builds a CSV blob in-memory and triggers a download.
 *  4. Saved reports tab remains local for now (no storage endpoint needed).
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { getIncidents, getCrimeTypes, getDashboardSummary } from '../../../services/crimeService';

/* ─── Utility: build a date range string from the report type ─────────────── */
const buildDateRange = (type, customStart, customEnd) => {
  const end   = new Date();
  const start = new Date();
  switch (type) {
    case 'daily':     start.setDate(start.getDate() - 1);    break;
    case 'weekly':    start.setDate(start.getDate() - 7);    break;
    case 'monthly':   start.setMonth(start.getMonth() - 1);  break;
    case 'quarterly': start.setMonth(start.getMonth() - 3);  break;
    case 'custom':
      return {
        start_date: customStart || start.toISOString().split('T')[0],
        end_date:   customEnd   || end.toISOString().split('T')[0],
      };
    default: break;
  }
  return {
    start_date: start.toISOString().split('T')[0],
    end_date:   end.toISOString().split('T')[0],
  };
};

/* ─── Utility: convert incident list to CSV string ───────────────────────── */
const buildCSV = (incidents) => {
  const header = ['ID', 'Case Number', 'Crime Type', 'Suburb', 'Status', 'Date', 'Weapon Used', 'Num Suspects'];
  const rows = incidents.map(i => [
    i.id,
    i.case_number ?? '—',
    i.crime_type_name ?? i.crime_type?.name ?? '—',
    i.suburb ?? '—',
    i.status ?? '—',
    i.timestamp ? new Date(i.timestamp).toLocaleDateString() : '—',
    i.weapon_used ?? '—',
    i.num_suspects ?? 0,
  ]);
  return [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
};

/* ─── Utility: trigger a browser download of a text blob ─────────────────── */
const downloadBlob = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function Reports() {
  const [activeTab, setActiveTab] = useState('generate');

  /* ── Generator options ────────────────────────────────────────────────── */
  const [selectedReportType, setSelectedReportType] = useState('monthly');
  const [dateRange, setDateRange]  = useState({ startDate: '', endDate: '' });
  const [selectedRegion, setSelectedRegion] = useState('');

  /* ── Data fetch state ────────────────────────────────────────────────── */
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);   // { incidents, summary, generatedAt }
  const [error, setError]           = useState('');

  /* ── Saved reports (local session only) ──────────────────────────────── */
  const [savedReports] = useState([
    { id: 1, name: 'Daily Crime Summary', type: 'daily', date: '2026-03-20', format: 'PDF', size: '1.2 MB', region: 'Harare Central' },
    { id: 2, name: 'Monthly Statistical Report', type: 'monthly', date: '2026-03-01', format: 'PDF', size: '3.5 MB', region: 'All Regions' },
    { id: 3, name: 'Crime Analysis Q1 2026', type: 'quarterly', date: '2026-01-15', format: 'Excel', size: '2.1 MB', region: 'National' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  /* Ref to the report preview section — used for print/PDF export */
  const printRef = useRef(null);

  /* ── Report types ────────────────────────────────────────────────────── */
  const reportTypes = [
    { value: 'daily',     label: 'Daily Crime Summary',       icon: 'calendar-day' },
    { value: 'weekly',    label: 'Weekly Statistical Report',  icon: 'calendar-week' },
    { value: 'monthly',   label: 'Monthly Analysis Report',   icon: 'calendar-month' },
    { value: 'quarterly', label: 'Quarterly Review',          icon: 'calendar3' },
    { value: 'custom',    label: 'Custom Date Range',         icon: 'calendar-range' },
  ];

  /* Filtered saved reports */
  const filteredSaved = useMemo(
    () => savedReports.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [savedReports, searchTerm],
  );

  /* ── Generate handler — fetches real data from the backend ───────────── */
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError('');
    setReportData(null);

    /* Build date range from the selected report type or custom dates */
    const { start_date, end_date } = buildDateRange(
      selectedReportType,
      dateRange.startDate,
      dateRange.endDate,
    );

    /* Construct query params */
    const params = { start_date, end_date };
    if (selectedRegion.trim()) params.suburb = selectedRegion.trim();

    try {
      /* Fetch incidents and summary stats in parallel */
      const [incidentRes, summary] = await Promise.all([
        getIncidents(params),
        getDashboardSummary(),
      ]);

      /* The incidents endpoint may return an array or a paginated object */
      const incList = Array.isArray(incidentRes)
        ? incidentRes
        : incidentRes?.results ?? [];

      setReportData({
        incidents:   incList,
        summary,
        params:      { start_date, end_date, suburb: params.suburb },
        generatedAt: new Date(),
        reportType:  selectedReportType,
      });
    } catch (err) {
      console.error('[Reports] generate error:', err);
      setError(
        err.response?.data?.detail ??
        'Failed to generate report. Please check your connection and try again.',
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedReportType, dateRange, selectedRegion]);

  /* ── CSV export ──────────────────────────────────────────────────────── */
  const handleCSVExport = () => {
    if (!reportData?.incidents?.length) return;
    const csv      = buildCSV(reportData.incidents);
    const filename = `ZRP_Report_${reportData.params.start_date}_to_${reportData.params.end_date}.csv`;
    downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
  };

  /* ── PDF export via browser print dialog ─────────────────────────────── */
  const handlePDFExport = () => {
    if (!reportData) return;
    /* Build a minimal HTML document for printing */
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ZRP Crime Report</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
          h1 { font-size: 16px; text-align: center; color: #1e2d3d; margin-bottom: 4px; }
          p.subtitle { text-align: center; color: #666; margin-top: 0; font-size: 10px; }
          .kpi { display: flex; gap: 20px; margin-bottom: 16px; }
          .kpi-box { border: 1px solid #dee2e6; border-radius: 6px; padding: 10px 16px; flex: 1; text-align: center; }
          .kpi-box .val { font-size: 20px; font-weight: 700; color: #1565C0; }
          .kpi-box .lbl { font-size: 10px; color: #888; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #1e2d3d; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
          td { padding: 5px 8px; border-bottom: 1px solid #f0f2f5; font-size: 10px; }
          tr:nth-child(even) td { background: #f8f9fa; }
          @page { size: A4; margin: 15mm; }
        </style>
      </head>
      <body>
        <h1>Zimbabwe Republic Police — Crime Report</h1>
        <p class="subtitle">
          Period: ${reportData.params.start_date} to ${reportData.params.end_date}
          ${reportData.params.suburb ? ' | Area: ' + reportData.params.suburb : ''}
          | Generated: ${reportData.generatedAt.toLocaleString()}
        </p>
        <div class="kpi">
          <div class="kpi-box">
            <div class="val">${reportData.incidents.length}</div>
            <div class="lbl">Total Incidents</div>
          </div>
          <div class="kpi-box">
            <div class="val">${reportData.incidents.filter(i => i.status === 'closed' || i.status === 'resolved').length}</div>
            <div class="lbl">Resolved</div>
          </div>
          <div class="kpi-box">
            <div class="val">${reportData.incidents.filter(i => i.status === 'reported').length}</div>
            <div class="lbl">Reported</div>
          </div>
          <div class="kpi-box">
            <div class="val">${reportData.incidents.filter(i => i.status === 'under_investigation').length}</div>
            <div class="lbl">Investigating</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Case Number</th><th>Crime Type</th>
              <th>Suburb / Area</th><th>Date</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.incidents.map((inc, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${inc.case_number ?? '—'}</td>
                <td>${inc.crime_type_name ?? inc.crime_type?.name ?? '—'}</td>
                <td>${inc.suburb ?? '—'}</td>
                <td>${inc.timestamp ? new Date(inc.timestamp).toLocaleDateString() : '—'}</td>
                <td>${inc.status ?? '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    /* Open a hidden iframe, write the document, and trigger print */
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(printHTML);
    iframe.contentDocument.close();
    iframe.onload = () => {
      iframe.contentWindow.print();
      /* Remove iframe after a short delay to avoid Flash of blank content */
      setTimeout(() => document.body.removeChild(iframe), 1500);
    };
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">

        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom mb-4">
          <div>
            <h1 className="display-6 fw-bold text-dark">
              <i className="bi bi-file-earmark-bar-graph me-3 text-primary"></i>
              Reports
            </h1>
          </div>
          {/* Export buttons — only visible when a report has been generated */}
          {reportData && (
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-success"
                onClick={handleCSVExport}
                title="Download as CSV"
              >
                <i className="bi bi-file-earmark-spreadsheet me-1"></i>Export CSV
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={handlePDFExport}
                title="Print / Save as PDF"
              >
                <i className="bi bi-file-earmark-pdf me-1"></i>Export PDF
              </button>
            </div>
          )}
        </header>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          {[
            ['generate',  'Generate Report',  'file-earmark-plus'],
            ['saved',     'Saved Reports',    'folder'],
            ['templates', 'Templates',        'layout-text-window'],
          ].map(([id, label, icon]) => (
            <li key={id} className="nav-item">
              <button
                className={`nav-link ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <i className={`bi bi-${icon} me-2`}></i>{label}
              </button>
            </li>
          ))}
        </ul>

        {/* Error banner */}
        {error && (
          <div className="alert alert-danger alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            GENERATE TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'generate' && (
          <div className="row g-4">

            {/* ── Options panel ─────────────────────────────────────────── */}
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-header fw-semibold bg-white">Report Options</div>
                <div className="card-body">

                  {/* Report type selector */}
                  <label className="form-label fw-semibold">Report Type</label>
                  <div className="list-group mb-3">
                    {reportTypes.map(rt => (
                      <button
                        key={rt.value}
                        className={`list-group-item list-group-item-action ${
                          selectedReportType === rt.value ? 'active' : ''
                        }`}
                        onClick={() => setSelectedReportType(rt.value)}
                      >
                        <i className={`bi bi-${rt.icon} me-2`}></i>{rt.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom date range — only shown for 'custom' type */}
                  {selectedReportType === 'custom' && (
                    <>
                      <label className="form-label fw-semibold">Date Range</label>
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={dateRange.startDate}
                            onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                          />
                        </div>
                        <div className="col-6">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={dateRange.endDate}
                            onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Optional suburb / region filter */}
                  <label className="form-label fw-semibold">Region / Suburb</label>
                  <input
                    type="text"
                    className="form-control form-control-sm mb-4"
                    placeholder="Leave blank for all regions"
                    value={selectedRegion}
                    onChange={e => setSelectedRegion(e.target.value)}
                  />

                  {/* Generate button */}
                  <button
                    className="btn btn-primary w-100"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" />Generating…</>
                    ) : (
                      <><i className="bi bi-play-circle me-2"></i>Generate Report</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Preview panel ─────────────────────────────────────────── */}
            <div className="col-md-8">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">
                    <i className="bi bi-eye me-2 text-primary"></i>Report Preview
                  </span>
                  {reportData && (
                    <small className="text-muted">
                      Generated {reportData.generatedAt.toLocaleTimeString()}
                      &nbsp;·&nbsp;{reportData.incidents.length} incidents
                    </small>
                  )}
                </div>

                <div className="card-body" ref={printRef}>

                  {/* Empty state */}
                  {!reportData && !generating && (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-file-earmark-text fs-1 d-block mb-3"></i>
                      Configure options on the left and click
                      <strong> Generate Report</strong>
                    </div>
                  )}

                  {/* Loading state */}
                  {generating && (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                      <p className="text-muted mt-2">Fetching data from backend…</p>
                    </div>
                  )}

                  {/* Report data */}
                  {reportData && (
                    <>
                      {/* KPI summary row */}
                      <div className="row g-3 mb-4">
                        <div className="col-3">
                          <div className="card bg-primary bg-opacity-10 border-0 text-center p-2">
                            <h4 className="fw-bold text-primary">{reportData.incidents.length}</h4>
                            <small>Total Incidents</small>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="card bg-success bg-opacity-10 border-0 text-center p-2">
                            <h4 className="fw-bold text-success">
                              {reportData.incidents.filter(i =>
                                i.status === 'closed' || i.status === 'resolved'
                              ).length}
                            </h4>
                            <small>Resolved</small>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="card bg-warning bg-opacity-10 border-0 text-center p-2">
                            <h4 className="fw-bold text-warning">
                              {reportData.incidents.filter(i => i.status === 'reported').length}
                            </h4>
                            <small>Reported</small>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="card bg-info bg-opacity-10 border-0 text-center p-2">
                            <h4 className="fw-bold text-info">
                              {reportData.incidents.filter(i => i.status === 'under_investigation').length}
                            </h4>
                            <small>Investigating</small>
                          </div>
                        </div>
                      </div>

                      {/* Date range summary */}
                      <div className="alert alert-info py-2 mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
                        <i className="bi bi-calendar-range"></i>
                        Period: <strong>{reportData.params.start_date}</strong> to <strong>{reportData.params.end_date}</strong>
                        {reportData.params.suburb && (
                          <> &nbsp;| Area: <strong>{reportData.params.suburb}</strong></>
                        )}
                      </div>

                      {/* Incidents table */}
                      <div className="table-responsive" style={{ maxHeight: 380 }}>
                        <table className="table table-sm table-hover">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>#</th>
                              <th>Case No.</th>
                              <th>Crime Type</th>
                              <th>Suburb</th>
                              <th>Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.incidents.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center text-muted py-3">
                                  No incidents found for this period
                                </td>
                              </tr>
                            ) : (
                              reportData.incidents.map((inc, idx) => (
                                <tr key={inc.id}>
                                  <td className="text-muted">{idx + 1}</td>
                                  <td className="font-monospace" style={{ fontSize: '0.78rem' }}>
                                    {inc.case_number ?? '—'}
                                  </td>
                                  <td>{inc.crime_type_name ?? inc.crime_type?.name ?? '—'}</td>
                                  <td>{inc.suburb ?? '—'}</td>
                                  <td>
                                    {inc.timestamp
                                      ? new Date(inc.timestamp).toLocaleDateString()
                                      : '—'}
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      (inc.status === 'resolved' || inc.status === 'closed')
                                        ? 'badge-closed'
                                        : inc.status === 'under_investigation'
                                          ? 'badge-investigating'
                                          : 'badge-reported'
                                    }`}>
                                      {inc.status ?? '—'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Export actions row below the table */}
                      <div className="d-flex gap-2 mt-3">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={handleCSVExport}
                        >
                          <i className="bi bi-download me-1"></i>Download CSV
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={handlePDFExport}
                        >
                          <i className="bi bi-printer me-1"></i>Print / PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SAVED REPORTS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'saved' && (
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Saved Reports</span>
              <input
                type="text"
                className="form-control form-control-sm w-auto"
                placeholder="Search…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Name</th><th>Type</th><th>Date</th><th>Format</th><th>Region</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredSaved.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted py-3">No saved reports found</td></tr>
                    ) : filteredSaved.map(r => (
                      <tr key={r.id}>
                        <td><i className="bi bi-file-earmark-pdf text-danger me-2"></i>{r.name}</td>
                        <td><span className="badge bg-secondary">{r.type}</span></td>
                        <td>{r.date}</td>
                        <td>{r.format}</td>
                        <td>{r.region}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-1" title="Download">
                            <i className="bi bi-download"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TEMPLATES TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <div className="row g-3">
            {[
              'Standard Crime Report',
              'Detailed Investigation Report',
              'Monthly Crime Statistics',
              'Property Recovery Summary',
              'Officer Activity Log',
            ].map((name, i) => (
              <div key={i} className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <i className="bi bi-layout-text-window fs-3 text-primary mb-2 d-block"></i>
                    <h6 className="fw-bold">{name}</h6>
                    <button
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => {
                        /* Pre-select the closest report type and switch to generate tab */
                        if (name.toLowerCase().includes('daily'))     setSelectedReportType('daily');
                        else if (name.toLowerCase().includes('monthly')) setSelectedReportType('monthly');
                        else setSelectedReportType('monthly');
                        setActiveTab('generate');
                      }}
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default Reports;