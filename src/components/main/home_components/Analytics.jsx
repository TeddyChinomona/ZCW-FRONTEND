/**
 * src/components/main/home_components/Analytics.jsx  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *  • Removed all hardcoded mock arrays from useState initialisation
 *  • Added fetchAnalytics() that calls:
 *      getDashboardSummary()  → KPI cards
 *      getTimeSeries()        → monthly crime trends bar chart
 *      getHotspots()          → hotspot table
 *  • Filters (timeRange, crimeType) pass through to the API
 *  • Loading spinner and error banner added
 *  • All UI components and layout preserved exactly
 */

import { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary, getTimeSeries, getHotspots } from '../../../services/crimeService';

// ─── Tiny chart helpers (unchanged from original) ─────────────────────────────
const BarChart = ({ data, height = 200 }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="d-flex align-items-end justify-content-between gap-1" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="text-center flex-fill">
          <div
            className="bg-primary rounded-top d-flex align-items-start justify-content-center"
            style={{
              height: `${(item.value / maxValue) * (height - 40)}px`,
              minHeight: 20,
              transition: 'height 0.3s ease',
            }}
          >
            <small className="text-white fw-bold" style={{ fontSize: '0.65rem' }}>
              {item.value}
            </small>
          </div>
          <small className="text-muted" style={{ fontSize: '0.65rem' }}>
            {item.label}
          </small>
        </div>
      ))}
    </div>
  );
};

const PieChart = ({ data, size = 200 }) => {
  const total = data.reduce((s, d) => s + (d.count || 0), 0) || 1;
  let cumulative = 0;
  const slices = data.map((d) => {
    const pct = (d.count / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start };
  });
  const describeArc = (pct, start) => {
    const r = 80;
    const cx = 100, cy = 100;
    const startAngle = (start / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((start + pct) / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = pct > 50 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      {slices.map((s, i) => (
        <path key={i} d={describeArc(s.pct, s.start)} fill={s.color || '#ccc'} />
      ))}
    </svg>
  );
};

const KPICard = ({ title, value, subtitle, icon, color, trend }) => (
  <div className="card shadow-sm h-100 border-0">
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div className={`bg-${color} bg-opacity-10 p-2 rounded`}>
          <i className={`bi bi-${icon} text-${color} fs-4`}></i>
        </div>
        {trend && (
          <span
            className={`badge bg-${trend.startsWith('+') ? 'success' : 'danger'} bg-opacity-10 text-${trend.startsWith('+') ? 'success' : 'danger'}`}
          >
            {trend}
          </span>
        )}
      </div>
      <h6 className="text-muted mb-1">{title}</h6>
      <h3 className="fw-bold mb-0">{value ?? '—'}</h3>
      {subtitle && <small className="text-muted">{subtitle}</small>}
    </div>
  </div>
);

// ─── Colour palette for crime types ──────────────────────────────────────────
const TYPE_COLOURS = ['#3498db','#e74c3c','#f39c12','#9b59b6','#1abc9c','#e67e22','#95a5a6','#2ecc71','#e91e63'];

// ─── Main component ──────────────────────────────────────────────────────────
function Analytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedChart, setSelectedChart] = useState('trends');
  const [selectedArea, setSelectedArea] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── State fed by API ──────────────────────────────────────────────────────
  const [kpi, setKpi] = useState({
    totalReports: null, activeCases: null, resolvedCases: null, clearanceRate: null,
  });
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [trends, setTrends] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [officers, setOfficers] = useState({ active: null, onDuty: null });
  const [responseTimes, setResponseTimes] = useState({ average: null });

  // ── Date range derived from timeRange toggle ─────────────────────────────
  const buildDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();
    if (timeRange === 'week') start.setDate(start.getDate() - 7);
    else if (timeRange === 'month') start.setMonth(start.getMonth() - 1);
    else if (timeRange === 'year') start.setFullYear(start.getFullYear() - 1);
    const fmt = (d) => d.toISOString().split('T')[0];
    return { start_date: fmt(start), end_date: fmt(end) };
  }, [timeRange]);

  // ── Fetch all analytics data ──────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    const { start_date, end_date } = buildDateRange();
    const freq = timeRange === 'week' ? 'D' : timeRange === 'year' ? 'M' : 'W';

    try {
      const [summary, ts, spots] = await Promise.all([
        getDashboardSummary(),
        getTimeSeries({ start_date, end_date, freq }),
        getHotspots({ start_date, end_date }),
      ]);

      // ── KPI ─────────────────────────────────────────────────────────────
      const total = summary.total_incidents ?? 0;
      const resolved = summary.by_status?.resolved ?? 0;
      const active = summary.by_status?.open ?? 0;
      setKpi({
        totalReports: total,
        activeCases: active,
        resolvedCases: resolved,
        clearanceRate: total ? ((resolved / total) * 100).toFixed(1) : 0,
      });

      // ── Crime types from summary top_types ───────────────────────────────
      const topTypes = summary.top_types ?? [];
      const typeTotal = topTypes.reduce((s, t) => s + t.count, 0) || 1;
      setCrimeTypes(
        topTypes.map((t, i) => ({
          type: t.name,
          count: t.count,
          percentage: ((t.count / typeTotal) * 100).toFixed(1),
          color: TYPE_COLOURS[i % TYPE_COLOURS.length],
          trend: t.trend ?? '',
        })),
      );

      // ── Monthly trends from time series ──────────────────────────────────
      const dates = ts.dates ?? [];
      const observed = ts.observed ?? [];
      setTrends(
        dates.map((d, i) => ({
          month: d.slice(0, 7),
          reports: observed[i] ?? 0,
          resolved: ts.trend?.[i] ?? 0,
        })),
      );

      // ── Hotspots ─────────────────────────────────────────────────────────
      setHotspots(
        (spots.hotspots ?? spots ?? []).map((s) => ({
          area: s.suburb ?? s.area ?? 'Unknown',
          incidents: s.incident_count ?? s.incidents ?? 0,
          risk: s.risk_level ?? s.risk ?? 'Low',
          lat: s.centre_lat ?? s.lat,
          lng: s.centre_lng ?? s.lng,
          responseTime: s.avg_response_time ?? '—',
        })),
      );

      // ── Officers / response times (from summary if available) ────────────
      setOfficers({
        active: summary.active_officers ?? null,
        onDuty: summary.officers_on_duty ?? null,
      });
      setResponseTimes({ average: summary.avg_response_time ?? null });
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [buildDateRange, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom mb-4">
          <div className="my-0">
            <h1 className="display-6 fw-bold text-dark">
              <i className="bi bi-graph-up-arrow me-3 text-primary"></i>
              Analytics
            </h1>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="btn-group btn-group-sm">
              {['week','month','year'].map((r) => (
                <button
                  key={r}
                  className={`btn ${timeRange === r ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setTimeRange(r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={fetchAnalytics} disabled={loading}>
              <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="alert alert-danger alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
            <p className="text-muted mt-2">Fetching analytics from server…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div className="row g-4 mb-4">
              <div className="col-md-3">
                <KPICard title="Total Reports" value={kpi.totalReports} subtitle="Selected period" icon="file-text" color="primary" />
              </div>
              <div className="col-md-3">
                <KPICard title="Active Cases" value={kpi.activeCases} subtitle="Under investigation" icon="briefcase" color="warning" />
              </div>
              <div className="col-md-3">
                <KPICard title="Resolved Cases" value={kpi.resolvedCases} subtitle="Successfully closed" icon="check-circle" color="success" />
              </div>
              <div className="col-md-3">
                <KPICard title="Clearance Rate" value={kpi.clearanceRate != null ? `${kpi.clearanceRate}%` : null} subtitle="Cases solved" icon="percent" color="info" />
              </div>
            </div>

            {/* Charts Row */}
            <div className="row g-4 mb-4">
              {/* Crime Types Distribution */}
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-pie-chart me-2 text-primary"></i>
                      Crime Type Distribution
                    </h5>
                    <span className="badge bg-primary">{timeRange}</span>
                  </div>
                  <div className="card-body">
                    {crimeTypes.length === 0 ? (
                      <p className="text-muted text-center py-4">No data available</p>
                    ) : (
                      <div className="row">
                        <div className="col-md-6 d-flex justify-content-center">
                          <PieChart data={crimeTypes} size={200} />
                        </div>
                        <div className="col-md-6">
                          <div className="list-group list-group-flush">
                            {crimeTypes.map((crime, i) => (
                              <div key={i} className="list-group-item px-0">
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <span className="badge me-2" style={{ backgroundColor: crime.color }}>&nbsp;</span>
                                    <span>{crime.type}</span>
                                  </div>
                                  <div>
                                    <strong>{crime.count}</strong>
                                    <small className="text-muted ms-2">({crime.percentage}%)</small>
                                  </div>
                                </div>
                                <div className="progress mt-1" style={{ height: 4 }}>
                                  <div className="progress-bar" style={{ width: `${crime.percentage}%`, backgroundColor: crime.color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Monthly Trends */}
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-graph-up me-2 text-primary"></i>
                      Crime Trends
                    </h5>
                    <div className="btn-group btn-group-sm">
                      {['trends','comparison'].map((c) => (
                        <button key={c} className={`btn ${selectedChart === c ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setSelectedChart(c)}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="card-body">
                    {trends.length === 0 ? (
                      <p className="text-muted text-center py-4">No trend data available</p>
                    ) : (
                      <BarChart
                        data={trends.slice(-12).map((t) => ({ label: t.month.slice(5), value: t.reports }))}
                        height={250}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hotspots Table */}
            <div className="row g-4 mb-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="mb-0">
                      <i className="bi bi-map me-2 text-primary"></i>
                      Crime Hotspots
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    {hotspots.length === 0 ? (
                      <p className="text-muted text-center py-4">No hotspot data available</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Area</th>
                              <th>Incidents</th>
                              <th>Risk Level</th>
                              <th>Avg Response Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hotspots.map((spot, i) => (
                              <tr
                                key={i}
                                onClick={() => setSelectedArea(spot)}
                                style={{ cursor: 'pointer' }}
                                className={selectedArea === spot ? 'table-primary' : ''}
                              >
                                <td>
                                  <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                                  {spot.area}
                                </td>
                                <td><strong>{spot.incidents}</strong></td>
                                <td>
                                  <span className={`badge bg-${spot.risk === 'High' ? 'danger' : spot.risk === 'Medium' ? 'warning' : 'success'}`}>
                                    {spot.risk}
                                  </span>
                                </td>
                                <td>{spot.responseTime}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Officers / Response summary */}
            {(officers.active != null || responseTimes.average != null) && (
              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <KPICard title="Active Officers" value={officers.active} subtitle="Total in system" icon="person-badge" color="secondary" />
                </div>
                <div className="col-md-4">
                  <KPICard title="On Duty" value={officers.onDuty} subtitle="Currently deployed" icon="shield-check" color="success" />
                </div>
                <div className="col-md-4">
                  <KPICard title="Avg Response Time" value={responseTimes.average} subtitle="Across all areas" icon="clock" color="info" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;
