/**
 * src/components/main/home_components/Reports.jsx  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *  • "Generate Report" now fetches filtered incidents from the backend
 *    using getIncidents({ start_date, end_date, crime_type_id?, suburb? })
 *    and renders a live summary table instead of simulating a delay
 *  • Saved reports list remains local (no report-storage endpoint on backend yet)
 *  • All UI tabs, templates, and layout preserved
 */

import { useState, useMemo, useCallback } from 'react';
import Logo from '/logo.jpg';
import { getIncidents, getCrimeTypes } from '../../../services/crimeService';

function Reports() {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedReportType, setSelectedReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null); // { incidents, crimeTypes, generatedAt }
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [savedReports] = useState([
    { id: 1, name: 'Daily Crime Summary', type: 'daily', date: '2026-03-20', format: 'PDF', size: '1.2 MB', pages: 5, region: 'Harare Central' },
    { id: 2, name: 'Monthly Statistical Report', type: 'monthly', date: '2026-03-01', format: 'PDF', size: '3.5 MB', pages: 15, region: 'All Regions' },
    { id: 3, name: 'Crime Analysis Q1 2026', type: 'quarterly', date: '2026-01-15', format: 'Excel', size: '2.1 MB', pages: 25, region: 'National' },
  ]);

  const reportTypes = [
    { value: 'daily',     label: 'Daily Crime Summary',      icon: 'calendar-day' },
    { value: 'weekly',    label: 'Weekly Statistical Report', icon: 'calendar-week' },
    { value: 'monthly',   label: 'Monthly Analysis Report',  icon: 'calendar-month' },
    { value: 'quarterly', label: 'Quarterly Review',         icon: 'calendar3' },
    { value: 'custom',    label: 'Custom Date Range',        icon: 'calendar-range' },
  ];

  const filteredSaved = useMemo(
    () => savedReports.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [savedReports, searchTerm],
  );

  // ── Generate: pull real incidents from backend ────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError('');
    setReportData(null);

    const params = {};
    if (dateRange.startDate) params.start_date = dateRange.startDate;
    if (dateRange.endDate) params.end_date = dateRange.endDate;
    if (selectedRegion !== 'all') params.suburb = selectedRegion;

    // Derive date range from report type if not set manually
    if (!params.start_date) {
      const end = new Date();
      const start = new Date();
      if (selectedReportType === 'daily')     start.setDate(start.getDate() - 1);
      else if (selectedReportType === 'weekly')  start.setDate(start.getDate() - 7);
      else if (selectedReportType === 'monthly') start.setMonth(start.getMonth() - 1);
      else if (selectedReportType === 'quarterly') start.setMonth(start.getMonth() - 3);
      params.start_date = start.toISOString().split('T')[0];
      params.end_date   = end.toISOString().split('T')[0];
    }

    try {
      const [incidents, crimeTypes] = await Promise.all([
        getIncidents(params),
        getCrimeTypes(),
      ]);
      const incList = Array.isArray(incidents) ? incidents : incidents.results ?? [];
      setReportData({ incidents: incList, crimeTypes, params, generatedAt: new Date() });
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Failed to generate report. Please check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  }, [dateRange, selectedRegion, selectedReportType]);

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
          <img src={Logo} alt="ZCW" height={36} />
        </header>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          {[['generate','Generate Report','file-earmark-plus'],['saved','Saved Reports','folder'],['templates','Templates','layout-text-window']].map(([id, label, icon]) => (
            <li key={id} className="nav-item">
              <button className={`nav-link ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
                <i className={`bi bi-${icon} me-2`}></i>{label}
              </button>
            </li>
          ))}
        </ul>

        {error && (
          <div className="alert alert-danger alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* ── Generate tab ── */}
        {activeTab === 'generate' && (
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-header bg-white fw-semibold">Report Options</div>
                <div className="card-body">
                  <label className="form-label fw-semibold">Report Type</label>
                  <div className="list-group mb-3">
                    {reportTypes.map((rt) => (
                      <button
                        key={rt.value}
                        className={`list-group-item list-group-item-action ${selectedReportType === rt.value ? 'active' : ''}`}
                        onClick={() => setSelectedReportType(rt.value)}
                      >
                        <i className={`bi bi-${rt.icon} me-2`}></i>{rt.label}
                      </button>
                    ))}
                  </div>

                  <label className="form-label fw-semibold">Date Range</label>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <input type="date" className="form-control form-control-sm" value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <input type="date" className="form-control form-control-sm" value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
                    </div>
                  </div>

                  <label className="form-label fw-semibold">Region / Suburb</label>
                  <input type="text" className="form-control form-control-sm mb-3" placeholder="All regions"
                    value={selectedRegion === 'all' ? '' : selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value || 'all')} />

                  <label className="form-label fw-semibold">Format</label>
                  <select className="form-select form-select-sm mb-4" value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>

                  <button className="btn btn-primary w-100" onClick={handleGenerate} disabled={generating}>
                    {generating ? (
                      <><span className="spinner-border spinner-border-sm me-2" role="status" />Generating…</>
                    ) : (
                      <><i className="bi bi-play-circle me-2"></i>Generate Report</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Report preview */}
            <div className="col-md-8">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold"><i className="bi bi-eye me-2 text-primary"></i>Report Preview</span>
                  {reportData && (
                    <small className="text-muted">Generated {reportData.generatedAt.toLocaleTimeString()}</small>
                  )}
                </div>
                <div className="card-body">
                  {!reportData && !generating && (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-file-earmark-text fs-1 d-block mb-3"></i>
                      Configure options and click <strong>Generate Report</strong>
                    </div>
                  )}
                  {generating && (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                      <p className="text-muted mt-2">Fetching data from backend…</p>
                    </div>
                  )}
                  {reportData && (
                    <>
                      {/* Summary cards */}
                      <div className="row g-3 mb-4">
                        <div className="col-4">
                          <div className="card bg-primary bg-opacity-10 border-0 text-center p-2">
                            <h4 className="fw-bold text-primary">{reportData.incidents.length}</h4>
                            <small>Total Incidents</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="card bg-success bg-opacity-10 border-0 text-center p-2">
                            <h4 className="fw-bold text-success">
                              {reportData.incidents.filter((i) => i.status === 'resolved').length}
                            </h4>
                            <small>Resolved</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="card bg-warning bg-opacity-10 border-0 text-center p-2">
                            <h4 className="fw-bold text-warning">
                              {reportData.incidents.filter((i) => i.status === 'open').length}
                            </h4>
                            <small>Open</small>
                          </div>
                        </div>
                      </div>

                      {/* Incidents table */}
                      <div className="table-responsive" style={{ maxHeight: 380 }}>
                        <table className="table table-sm table-hover">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>#</th><th>Type</th><th>Suburb</th><th>Date</th><th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.incidents.length === 0 ? (
                              <tr><td colSpan={5} className="text-center text-muted py-3">No incidents in this period</td></tr>
                            ) : (
                              reportData.incidents.map((inc) => (
                                <tr key={inc.id}>
                                  <td>{inc.id}</td>
                                  <td>{inc.crime_type?.name ?? '—'}</td>
                                  <td>{inc.suburb ?? '—'}</td>
                                  <td>{inc.timestamp ? new Date(inc.timestamp).toLocaleDateString() : '—'}</td>
                                  <td>
                                    <span className={`badge bg-${inc.status === 'resolved' ? 'success' : 'warning'}`}>
                                      {inc.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Saved reports tab ── */}
        {activeTab === 'saved' && (
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Saved Reports</span>
              <input type="text" className="form-control form-control-sm w-auto" placeholder="Search…"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr><th>Name</th><th>Type</th><th>Date</th><th>Format</th><th>Region</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredSaved.map((r) => (
                      <tr key={r.id}>
                        <td><i className="bi bi-file-earmark-pdf text-danger me-2"></i>{r.name}</td>
                        <td><span className="badge bg-secondary">{r.type}</span></td>
                        <td>{r.date}</td>
                        <td>{r.format}</td>
                        <td>{r.region}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-1">
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

        {/* ── Templates tab ── */}
        {activeTab === 'templates' && (
          <div className="row g-3">
            {['Standard Crime Report','Detailed Investigation Report','Monthly Crime Statistics','Property Recovery Summary','Officer Activity Log'].map((name, i) => (
              <div key={i} className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <i className="bi bi-layout-text-window fs-3 text-primary mb-2 d-block"></i>
                    <h6 className="fw-bold">{name}</h6>
                    <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => { setActiveTab('generate'); }}>
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
