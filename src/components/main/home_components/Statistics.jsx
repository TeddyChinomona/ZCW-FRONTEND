/**
 * src/components/main/home_components/Statistics.jsx  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *  • Removed all hardcoded crimeStatistics mock object
 *  • Fetches from:
 *      getDashboardSummary()  → top-level stats and crime category table
 *      getTimeSeries()        → daily / weekly / monthly trend views
 *      getCrimeTypes()        → category list with incident_count
 *  • Loading, error, and empty states added
 *  • All UI components (StatCard, ProgressBar, table, trend views) preserved
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDashboardSummary, getTimeSeries, getCrimeTypes } from '../../../services/crimeService';

// ─── Sub-components (unchanged from original) ─────────────────────────────────

const StatCard = ({ title, value, change, icon, color, subtitle }) => (
  <div className="card shadow-sm h-100 border-0">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div className={`bg-${color} bg-opacity-10 p-2 rounded`}>
          <i className={`bi bi-${icon} text-${color} fs-4`}></i>
        </div>
        {change !== undefined && change !== null && (
          <span className={`badge bg-${change >= 0 ? 'success' : 'danger'} bg-opacity-10 text-${change >= 0 ? 'success' : 'danger'}`}>
            <i className={`bi bi-arrow-${change >= 0 ? 'up' : 'down'} me-1`}></i>
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <h6 className="text-muted mb-1">{title}</h6>
      <h3 className="fw-bold mb-0">{value ?? '—'}</h3>
      {subtitle && <small className="text-muted">{subtitle}</small>}
    </div>
  </div>
);

const ProgressBar = ({ value, max, label, color = 'primary' }) => (
  <div className="mb-2">
    <div className="d-flex justify-content-between small mb-1">
      <span>{label}</span>
      <span className="fw-bold">{value}</span>
    </div>
    <div className="progress" style={{ height: 6 }}>
      <div className={`progress-bar bg-${color}`} style={{ width: `${max ? (value / max) * 100 : value}%` }} />
    </div>
  </div>
);

const RISK_COLOUR = { High: 'danger', Medium: 'warning', Low: 'success' };

// ─── Main component ───────────────────────────────────────────────────────────

function Statistics() {
  const [viewMode, setViewMode] = useState('overview');
  const [selectedCrimeType, setSelectedCrimeType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'incidents', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── API-driven state ──────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [crimeCategories, setCrimeCategories] = useState([]);
  const [timeAnalysis, setTimeAnalysis] = useState({ daily: [], weekly: [], monthly: [] });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, types, tsDaily, tsMonthly] = await Promise.all([
        getDashboardSummary(),
        getCrimeTypes(),
        getTimeSeries({ freq: 'D' }),
        getTimeSeries({ freq: 'M' }),
      ]);

      setSummary(sum);

      // Crime categories from crime-types endpoint
      const totalIncidents = types.reduce((s, t) => s + (t.incident_count ?? 0), 0) || 1;
      setCrimeCategories(
        types.map((t) => ({
          category: t.name,
          incidents: t.incident_count ?? 0,
          percentage: ((( t.incident_count ?? 0) / totalIncidents) * 100).toFixed(1),
          change: null, // not available from this endpoint
          risk: t.incident_count > 100 ? 'High' : t.incident_count > 40 ? 'Medium' : 'Low',
        })),
      );

      // Time analysis: build day-of-week aggregation from daily series
      const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const dayBuckets = Array(7).fill(0);
      (tsDaily.dates ?? []).forEach((d, i) => {
        const dow = new Date(d).getDay();
        dayBuckets[dow] += tsDaily.observed?.[i] ?? 0;
      });
      const maxDay = Math.max(...dayBuckets, 1);
      const daily = DOW.map((day, i) => ({
        day,
        count: dayBuckets[i],
        percentage: ((dayBuckets[i] / maxDay) * 100).toFixed(0),
      }));

      // Monthly series → monthly
      const monthly = (tsMonthly.dates ?? []).slice(-12).map((d, i) => ({
        month: d.slice(0, 7),
        count: tsMonthly.observed?.[i] ?? 0,
        percentage: null,
      }));

      setTimeAnalysis({ daily, weekly: [], monthly });
    } catch (err) {
      console.error('Statistics fetch error:', err);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Sorting ───────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    const data = [...crimeCategories];
    data.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [crimeCategories, sortConfig]);

  const filteredData = useMemo(() => {
    if (selectedCrimeType === 'all') return sortedData;
    return sortedData.filter((c) => c.category.toLowerCase().includes(selectedCrimeType.toLowerCase()));
  }, [sortedData, selectedCrimeType]);

  const totalIncidents = summary?.total_incidents ?? 0;
  const byStatus = summary?.by_status ?? {};

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom mb-4">
          <div>
            <h1 className="display-6 fw-bold text-dark">
              <i className="bi bi-bar-chart-steps me-3 text-primary"></i>
              Crime Statistics
            </h1>
          </div>
          <div className="d-flex gap-2">
            <div className="btn-group btn-group-sm">
              {['overview','trends'].map((m) => (
                <button key={m} className={`btn ${viewMode === m ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchStats} disabled={loading}>
              <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''}`}></i>
            </button>
          </div>
        </header>

        {error && (
          <div className="alert alert-danger alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2">Loading statistics…</p>
          </div>
        )}

        {!loading && viewMode === 'overview' && (
          <>
            {/* Top-level KPI cards */}
            <div className="row g-4 mb-4">
              <div className="col-md-3">
                <StatCard title="Total Incidents" value={totalIncidents} icon="file-earmark-text" color="primary" subtitle="All time" />
              </div>
              <div className="col-md-3">
                <StatCard title="Open Cases" value={byStatus.open ?? '—'} icon="folder2-open" color="warning" subtitle="Under investigation" />
              </div>
              <div className="col-md-3">
                <StatCard title="Resolved" value={byStatus.resolved ?? '—'} icon="check2-circle" color="success" subtitle="Cases closed" />
              </div>
              <div className="col-md-3">
                <StatCard
                  title="Clearance Rate"
                  value={totalIncidents ? `${(((byStatus.resolved ?? 0) / totalIncidents) * 100).toFixed(1)}%` : '—'}
                  icon="percent"
                  color="info"
                  subtitle="Resolved / total"
                />
              </div>
            </div>

            {/* Crime category filter */}
            <div className="mb-3 d-flex gap-2 flex-wrap">
              <button className={`btn btn-sm ${selectedCrimeType === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSelectedCrimeType('all')}>
                All Types
              </button>
              {crimeCategories.map((c, i) => (
                <button key={i} className={`btn btn-sm ${selectedCrimeType === c.category ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setSelectedCrimeType(c.category)}>
                  {c.category}
                </button>
              ))}
            </div>

            {/* Crime category table */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h5 className="mb-0"><i className="bi bi-table me-2 text-primary"></i>Crime Categories</h5>
              </div>
              <div className="card-body p-0">
                {filteredData.length === 0 ? (
                  <p className="text-muted text-center py-4">No data available</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          {['category','incidents','percentage','risk'].map((k) => (
                            <th key={k} style={{ cursor: 'pointer' }} onClick={() => handleSort(k)}>
                              {k.charAt(0).toUpperCase() + k.slice(1)}
                              {sortConfig.key === k && (
                                <i className={`bi bi-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ms-1`}></i>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.category}</td>
                            <td><strong>{row.incidents}</strong></td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="progress flex-grow-1" style={{ height: 6 }}>
                                  <div className="progress-bar bg-primary" style={{ width: `${row.percentage}%` }} />
                                </div>
                                <small>{row.percentage}%</small>
                              </div>
                            </td>
                            <td>
                              <span className={`badge bg-${RISK_COLOUR[row.risk] ?? 'secondary'}`}>{row.risk}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!loading && viewMode === 'trends' && (
          <div className="row g-4 mb-4">
            {/* Daily trends */}
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0"><i className="bi bi-calendar-week me-2 text-primary"></i>Daily Trends (day of week)</h5>
                </div>
                <div className="card-body">
                  {timeAnalysis.daily.length === 0 ? (
                    <p className="text-muted text-center py-3">No data</p>
                  ) : (
                    timeAnalysis.daily.map((day, i) => (
                      <ProgressBar key={i} label={day.day} value={day.count} max={Math.max(...timeAnalysis.daily.map(d => d.count), 1)} color="info" />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Monthly trends */}
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0"><i className="bi bi-calendar-month me-2 text-primary"></i>Monthly Trend (last 12 months)</h5>
                </div>
                <div className="card-body">
                  {timeAnalysis.monthly.length === 0 ? (
                    <p className="text-muted text-center py-3">No data</p>
                  ) : (
                    timeAnalysis.monthly.map((m, i) => (
                      <ProgressBar key={i} label={m.month} value={m.count} max={Math.max(...timeAnalysis.monthly.map(x => x.count), 1)} color="primary" />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Statistics;
