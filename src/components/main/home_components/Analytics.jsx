/**
 * src/components/main/home_components/Analytics.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * All values are now derived from live backend data — no static/hardcoded
 * numbers anywhere in this file.
 *
 * API calls made:
 *   getDashboardSummary()   → KPI cards, top crime types for pie chart
 *   getCrimeTypes()         → full crime type list with incident_count
 *   getTimeSeries()         → crime trends bar chart
 *   getHotspots()           → hotspots table
 *   getIncidents()          → time_of_day & day_of_week breakdowns
 *                             (these fields exist on every incident record;
 *                              there is no dedicated aggregate endpoint so we
 *                              compute the distributions client-side from the
 *                              full incident list)
 *
 * Response shape notes (from project knowledge):
 *   DashboardSummaryView  → { total_incidents, last_7_days, last_30_days,
 *                             by_status, top_crime_types }
 *                           NOTE: field is "top_crime_types", not "top_types"
 *
 *   TimeSeriesView        → { timeseries: { labels, observed, trend, … } }
 *                           NOTE: wrapped in "timeseries" key; field is
 *                           "labels" not "dates"
 *
 *   CrimeIncident         → { time_of_day: "morning"|"afternoon"|"evening"|"night",
 *                             day_of_week: "monday"|…|"sunday" }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getDashboardSummary,
  getTimeSeries,
  getHotspots,
  getCrimeTypes,
  getIncidents,
} from '../../../services/crimeService';

// ─── Colour palette ───────────────────────────────────────────────────────────
const TYPE_COLOURS = [
  '#1565C0','#c0392b','#f0b429','#1e8449','#7b2d8b',
  '#d35400','#2e86c1','#717d7e','#16a085','#8e44ad',
];

// ─── Risk level config — covers all 4 values returned by compute_hotspot_summary
// risk_level: "Critical" | "High" | "Medium" | "Low"
const RISK_CONFIG = {
  Critical: { colour: '#7b2d8b', badge: 'bg-purple',  bar: '#7b2d8b', text: 'text-white', hex: '#7b2d8b' },
  High:     { colour: '#c0392b', badge: 'bg-danger',   bar: '#c0392b', text: 'text-white', hex: '#c0392b' },
  Medium:   { colour: '#f0b429', badge: 'bg-warning',  bar: '#f0b429', text: 'text-dark',  hex: '#f0b429' },
  Low:      { colour: '#1e8449', badge: 'bg-success',  bar: '#1e8449', text: 'text-white', hex: '#1e8449' },
};
const riskCfg = (level) => RISK_CONFIG[level] ?? RISK_CONFIG.Low;

// ─── KPI card ─────────────────────────────────────────────────────────────────
const KPICard = ({ title, value, subtitle, icon, colorClass }) => (
  <div className={`kpi-card ${colorClass} h-100`}>
    <div className="mb-2">
      <div className="kpi-icon" style={{ background: 'rgba(21,101,192,0.08)' }}>
        <i className={`bi bi-${icon} text-primary`}></i>
      </div>
    </div>
    <div className="kpi-value">{value ?? '—'}</div>
    <div className="kpi-label">{title}</div>
    {subtitle && <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>{subtitle}</div>}
  </div>
);

// ─── SVG pie chart ────────────────────────────────────────────────────────────
const PieChart = ({ data, size = 180 }) => {
  const total = data.reduce((s, d) => s + (d.count || 0), 0) || 1;
  let cumulative = 0;

  const describeArc = (pct, start) => {
    const r = 80, cx = 100, cy = 100;
    const startAngle = (start / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle   = ((start + pct) / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle),   y2 = cy + r * Math.sin(endAngle);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${x2} ${y2} Z`;
  };

  const slices = data.map(d => {
    const pct = (d.count / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      {slices.map((s, i) => (
        <path key={i} d={describeArc(s.pct, s.start)} fill={s.color || '#ccc'} />
      ))}
    </svg>
  );
};

// ─── Bar chart ────────────────────────────────────────────────────────────────
const BarChart = ({ data, height = 200, color = '#1565C0' }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="d-flex align-items-end justify-content-between gap-1" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = Math.max(((item.value / maxValue) * (height - 36)), 4);
        return (
          <div key={i} className="text-center d-flex flex-column align-items-center" style={{ flex: 1 }}>
            <span style={{
              fontSize: '0.6rem', color: '#1e2d3d', marginBottom: '2px',
              visibility: barHeight < 16 ? 'hidden' : 'visible', fontWeight: 600,
            }}>
              {item.value}
            </span>
            <div style={{
              height: `${barHeight}px`, width: '100%', backgroundColor: color,
              borderRadius: '3px 3px 0 0', opacity: 0.85, transition: 'height 0.4s ease',
            }} />
            <small className="text-muted d-block mt-1" style={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}>
              {item.label}
            </small>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
function Analytics() {
  const [timeRange, setTimeRange]         = useState('month');
  const [selectedChart, setSelectedChart] = useState('trends');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // KPI
  const [kpi, setKpi] = useState({
    totalIncidents: null, lastPeriod: null,
    investigating: null,  closed: null, clearanceRate: null,
  });

  // Chart / table data
  const [crimeTypes, setCrimeTypes]   = useState([]);
  const [trends, setTrends]           = useState([]);
  const [hotspots, setHotspots]       = useState([]);

  // Hotspot map refs — Leaflet instance + layer group for cluster markers
  const hotspotMapRef       = useRef(null);   // DOM node
  const hotspotMapInstance  = useRef(null);   // L.Map instance
  const hotspotLayerGroup   = useRef(null);   // L.LayerGroup for markers

  // Hotspot filter state
  const [hotspotRiskFilter, setHotspotRiskFilter] = useState('All');
  const [hotspotCrimeFilter, setHotspotCrimeFilter] = useState('All');

  // Derived from incidents list (time_of_day, day_of_week fields)
  const [timeOfDayData, setTimeOfDayData] = useState([]);
  const [dayOfWeekData, setDayOfWeekData] = useState([]);

  // Dataset summary row (bottom-right card)
  const [datasetStats, setDatasetStats] = useState({
    total: null, typeCount: null, hotspotCount: null,
    investigating: null, closed: null, clearanceRate: null,
  });

  // ── Build date range from toggle ───────────────────────────────────────────
  const buildDateRange = useCallback(() => {
    const end = new Date(), start = new Date();
    if (timeRange === 'week')  start.setDate(start.getDate() - 7);
    if (timeRange === 'month') start.setMonth(start.getMonth() - 1);
    if (timeRange === 'year')  start.setFullYear(start.getFullYear() - 1);
    const fmt = d => d.toISOString().split('T')[0];
    return { start_date: fmt(start), end_date: fmt(end) };
  }, [timeRange]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    const { start_date, end_date } = buildDateRange();
    // Serializer accepts "D" | "W" | "M" — the view maps these to long-form
    // before passing to compute_time_series() via FREQ_MAP in views.py
    const freq = timeRange === 'week' ? 'D' : timeRange === 'year' ? 'M' : 'W';

    try {
      // Run all calls in parallel for speed
      const [summary, types, ts, spots, incidents] = await Promise.all([
        getDashboardSummary(),
        getCrimeTypes(),
        getTimeSeries({ start_date, end_date, freq }),
        // Hotspots run over ALL incidents regardless of the time range toggle.
        // The DBSCAN clustering needs a large enough sample to form clusters —
        // filtering to 30 days often leaves too few points within 500 m of each
        // other, producing an empty result. The time filter stays on timeseries.
        getHotspots({}),
        // Fetch all incidents to compute time_of_day & day_of_week distributions.
        // These fields are stored on every CrimeIncident record but there is no
        // dedicated aggregate endpoint, so we aggregate client-side.
        getIncidents(),
      ]);

      // ── KPI ──────────────────────────────────────────────────────────────
      const total        = summary.total_incidents ?? 0;
      // by_status keys are the raw status strings stored in the DB
      const byStatus     = summary.by_status ?? {};
      const investigating = byStatus.investigating ?? 0;
      const closedCount  = byStatus.closed ?? byStatus.resolved ?? 0;
      const periodCount  = summary.last_30_days ?? summary.last_7_days ?? null;
      const clearance    = total > 0
        ? `${((closedCount / total) * 100).toFixed(1)}%`
        : '0.0%';

      setKpi({ totalIncidents: total, lastPeriod: periodCount, investigating, closed: closedCount, clearanceRate: clearance });

      // ── Crime type distribution ──────────────────────────────────────────
      // Use getCrimeTypes() for the full list with incident_count per type.
      // Note: DashboardSummaryView returns "top_crime_types" (not "top_types").
      const typeSource = types.length
        ? types
        : (summary.top_crime_types ?? []).map(t => ({ name: t.crime_type__name ?? t.name, incident_count: t.count }));

      const typeTotal = typeSource.reduce((s, t) => s + (t.incident_count ?? 0), 0) || 1;
      const builtTypes = typeSource
        .filter(t => (t.incident_count ?? 0) > 0)
        .sort((a, b) => (b.incident_count ?? 0) - (a.incident_count ?? 0))
        .map((t, i) => ({
          type:       t.name,
          count:      t.incident_count ?? 0,
          percentage: (((t.incident_count ?? 0) / typeTotal) * 100).toFixed(1),
          color:      TYPE_COLOURS[i % TYPE_COLOURS.length],
        }));
      setCrimeTypes(builtTypes);

      // ── Trends bar chart ──────────────────────────────────────────────────
      // TimeSeriesView wraps its result: { timeseries: { labels, observed, … } }
      // compute_time_series() uses "labels" not "dates"
      const tsData = ts.timeseries ?? ts;
      const formatLabel = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr.slice(5);
        if (freq === 'M') return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      };
      setTrends(
        (tsData.labels ?? []).map((d, i) => ({
          label: formatLabel(d),
          value: tsData.observed?.[i] ?? 0,
        })),
      );

      // ── Hotspots ──────────────────────────────────────────────────────────
      // compute_hotspot_summary() response shape:
      //   area           → dominant crime type name in the cluster (NOT a place name)
      //   suburb         → dominant suburb/location name in the cluster
      //   incident_count → number of incidents in the DBSCAN cluster
      //   risk_level     → "Critical" | "High" | "Medium" | "Low"
      //   centre_lat     → cluster centroid latitude
      //   centre_lng     → cluster centroid longitude
      const rawSpots = spots.hotspots ?? spots ?? [];
      const builtSpots = rawSpots
        .map(s => ({
          location:    s.suburb     || 'Unknown Area',   // the place name
          crimeType:   s.area       || 'Unknown',        // dominant crime type
          incidents:   s.incident_count ?? 0,
          risk:        s.risk_level ?? 'Low',
          lat:         s.centre_lat,
          lng:         s.centre_lng,
        }))
        .sort((a, b) => b.incidents - a.incidents);
      setHotspots(builtSpots);

      // ── Time of day breakdown — derived from incidents list ───────────────
      // CrimeIncident.time_of_day is one of: "morning", "afternoon", "evening", "night"
      // We count occurrences across all fetched incidents and convert to percentages.
      const incidentList = Array.isArray(incidents) ? incidents : (incidents.results ?? []);
      const incidentTotal = incidentList.length || 1;

      const TOD_ORDER   = ['morning', 'afternoon', 'evening', 'night'];
      const TOD_LABELS  = { morning: 'Morning (06:00–12:00)', afternoon: 'Afternoon (12:00–15:00)', evening: 'Evening (15:00–18:00)', night: 'Night (18:00–06:00)' };
      const TOD_COLOURS = { morning: '#f0b429', afternoon: '#1e8449', evening: '#1565C0', night: '#1e2d3d' };

      // Tally raw counts per period
      const todCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      incidentList.forEach(inc => {
        const tod = (inc.time_of_day ?? '').toLowerCase();
        if (tod in todCounts) todCounts[tod]++;
      });

      setTimeOfDayData(
        TOD_ORDER.map(key => ({
          label: TOD_LABELS[key],
          count: todCounts[key],
          pct:   ((todCounts[key] / incidentTotal) * 100).toFixed(1),
          color: TOD_COLOURS[key],
        }))
      );

      // ── Day of week breakdown — derived from incidents list ───────────────
      // CrimeIncident.day_of_week is stored as a lowercase string e.g. "monday"
      const DOW_ORDER  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const DOW_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

      const dowCounts = {};
      DOW_ORDER.forEach(d => { dowCounts[d] = 0; });
      incidentList.forEach(inc => {
        const dow = (inc.day_of_week ?? '').toLowerCase();
        if (dow in dowCounts) dowCounts[dow]++;
      });

      const dowMax = Math.max(...Object.values(dowCounts), 1);
      setDayOfWeekData(
        DOW_ORDER.map(key => ({
          label: DOW_LABELS[key],
          count: dowCounts[key],
          max:   dowMax,
        }))
      );

      // ── Dataset summary card ──────────────────────────────────────────────
      setDatasetStats({
        total:         total,
        typeCount:     builtTypes.length,
        hotspotCount:  builtSpots.length,
        investigating: investigating,
        closed:        closedCount,
        clearanceRate: clearance,
      });

    } catch (err) {
      console.error('[Analytics] fetch error:', err);
      setError('Failed to load analytics data. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  }, [buildDateRange, timeRange]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── Initialise the hotspot Leaflet map once the DOM node is available ──────
  // The map div is inside the !loading block, so we use a callback ref pattern:
  // the useEffect watches `loading` so it re-runs once loading finishes and the
  // div is actually in the DOM.
  useEffect(() => {
    if (loading) return;                       // wait until the div is rendered
    if (!hotspotMapRef.current) return;        // div not in DOM yet
    if (hotspotMapInstance.current) {
      // Map already exists — just invalidate size in case the container
      // was hidden and then revealed (avoids grey tiles)
      hotspotMapInstance.current.invalidateSize();
      return;
    }
    hotspotMapInstance.current = L.map(hotspotMapRef.current).setView([-17.8292, 31.0522], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(hotspotMapInstance.current);
    // Dedicated layer group so we can clear and re-add markers without
    // touching the base tile layer
    hotspotLayerGroup.current = L.layerGroup().addTo(hotspotMapInstance.current);
    return () => {
      if (hotspotMapInstance.current) {
        hotspotMapInstance.current.remove();
        hotspotMapInstance.current = null;
      }
    };
  }, [loading]);

  // ── Re-render hotspot markers whenever data or filters change ────────────
  useEffect(() => {
    if (!hotspotMapInstance.current || !hotspotLayerGroup.current) return;

    // Clear existing markers before re-drawing
    hotspotLayerGroup.current.clearLayers();

    const filtered = hotspots.filter(s => {
      if (hotspotRiskFilter  !== 'All' && s.risk      !== hotspotRiskFilter)  return false;
      if (hotspotCrimeFilter !== 'All' && s.crimeType !== hotspotCrimeFilter) return false;
      return true;
    });

    filtered.forEach(spot => {
      if (!spot.lat || !spot.lng) return;
      const cfg = riskCfg(spot.risk);

      // Use a coloured circle marker sized by incident count
      const radius = Math.min(8 + spot.incidents * 1.5, 28);
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius,
        fillColor:   cfg.hex,
        color:       '#fff',
        weight:      2,
        opacity:     1,
        fillOpacity: 0.82,
      });

      // Popup showing all cluster details
      marker.bindPopup(`
        <div style="min-width:160px;font-size:13px;">
          <strong style="font-size:14px;">${spot.location}</strong><br/>
          <span style="color:#6c757d;">Dominant type: </span>${spot.crimeType}<br/>
          <span style="color:#6c757d;">Incidents: </span><strong>${spot.incidents}</strong><br/>
          <span style="color:#6c757d;">Risk: </span>
          <span style="color:${cfg.hex};font-weight:600;">${spot.risk}</span>
        </div>
      `);

      hotspotLayerGroup.current.addLayer(marker);
    });

    // Fit map bounds to the visible markers if any exist
    if (filtered.length > 0) {
      const validPoints = filtered.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng]);
      if (validPoints.length > 0) {
        hotspotMapInstance.current.fitBounds(validPoints, { padding: [30, 30], maxZoom: 14 });
      }
    }
  }, [hotspots, hotspotRiskFilter, hotspotCrimeFilter]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="topbar container-fluid p-0">

      {/* ── Sticky page header ──────────────────────────────────────────── */}
      <div className="page-topbar">
        <div>
          <h1 className="page-title mb-0" style={{ fontSize: '1rem' }}>
            <i className="bi bi-graph-up-arrow"></i> Analytics
          </h1>
          <small className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '26px' }}>
            Crime intelligence overview — ZRP Harare Division
          </small>
        </div>
        <div className="topbar-actions">
          <div className="btn-group btn-group-sm">
            {['week','month','year'].map(r => (
              <button key={r}
                className={`btn ${timeRange === r ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTimeRange(r)}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchAnalytics} disabled={loading}>
            <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="page-content">

        {error && (
          <div className="alert alert-danger alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2 mb-0">Fetching analytics from server…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* ── KPI row ─────────────────────────────────────────────── */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <KPICard title="Total Incidents" value={kpi.totalIncidents} subtitle="All time" icon="file-earmark-text" colorClass="kpi-primary" />
              </div>
              <div className="col-6 col-md-3">
                <KPICard
                  title={timeRange === 'week' ? 'Last 7 Days' : timeRange === 'year' ? 'Last 365 Days' : 'Last 30 Days'}
                  value={kpi.lastPeriod} subtitle="New incidents"
                  icon="calendar-week" colorClass="kpi-warning"
                />
              </div>
              <div className="col-6 col-md-3">
                <KPICard title="Under Investigation" value={kpi.investigating} subtitle="Active cases" icon="search" colorClass="kpi-danger" />
              </div>
              <div className="col-6 col-md-3">
                <KPICard title="Clearance Rate" value={kpi.clearanceRate} subtitle={`${kpi.closed ?? '—'} cases closed`} icon="check-circle" colorClass="kpi-success" />
              </div>
            </div>

            {/* ── Charts row ──────────────────────────────────────────── */}
            <div className="row g-3 mb-4">

              {/* Crime Type Distribution */}
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header card-header-accent-blue d-flex align-items-center justify-content-between">
                    <span><i className="bi bi-pie-chart me-2"></i>Crime Type Distribution</span>
                    <span className="badge badge-reported" style={{ fontSize: '0.65rem' }}>{timeRange}</span>
                  </div>
                  <div className="card-body">
                    {crimeTypes.length === 0 ? (
                      <p className="text-muted text-center py-4 mb-0">
                        <i className="bi bi-bar-chart-line fs-3 d-block mb-2 text-muted"></i>
                        No crime type data available.
                      </p>
                    ) : (
                      <div className="row align-items-center">
                        <div className="col-5 d-flex justify-content-center">
                          <PieChart data={crimeTypes} size={160} />
                        </div>
                        <div className="col-7">
                          {crimeTypes.map((crime, i) => (
                            <div key={i} className="mb-2">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: crime.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {crime.type}
                                  </span>
                                </div>
                                <div className="text-end ms-1" style={{ flexShrink: 0 }}>
                                  <strong style={{ fontSize: '0.78rem' }}>{crime.count}</strong>
                                  <span className="text-muted ms-1" style={{ fontSize: '0.7rem' }}>({crime.percentage}%)</span>
                                </div>
                              </div>
                              <div className="progress" style={{ height: 4 }}>
                                <div className="progress-bar" style={{ width: `${crime.percentage}%`, backgroundColor: crime.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Crime Trends */}
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header card-header-accent-dark d-flex align-items-center justify-content-between">
                    <span><i className="bi bi-graph-up me-2"></i>Crime Trends</span>
                    <div className="btn-group btn-group-sm">
                      {['trends','comparison'].map(c => (
                        <button key={c}
                          className={`btn btn-sm ${selectedChart === c ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setSelectedChart(c)}
                          style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        >
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="card-body">
                    {trends.length === 0 ? (
                      <p className="text-muted text-center py-4 mb-0">
                        <i className="bi bi-graph-up fs-3 d-block mb-2 text-muted"></i>
                        No trend data returned for this period.
                      </p>
                    ) : selectedChart === 'trends' ? (
                      <BarChart data={trends} height={210} color="#1565C0" />
                    ) : (
                      // Comparison view — horizontal bars per crime type
                      <div>
                        {crimeTypes.slice(0, 6).map((ct, i) => (
                          <div key={i} className="mb-2">
                            <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.78rem' }}>
                              <span>{ct.type}</span>
                              <strong>{ct.count}</strong>
                            </div>
                            <div className="progress" style={{ height: 8 }}>
                              <div className="progress-bar" style={{ width: `${ct.percentage}%`, backgroundColor: ct.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* ── Hotspots — map + table ───────────────────────────── */}
            <div className="row g-3 mb-4">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header card-header-accent-red d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <span>
                      <i className="bi bi-geo-alt-fill me-2"></i>
                      Crime Hotspots
                      <span className="ms-2 text-muted" style={{ fontSize: '0.72rem', fontWeight: 400 }}>
                        DBSCAN spatial clustering
                      </span>
                    </span>

                    {/* Filter controls — right side of header */}
                    <div className="d-flex gap-2 flex-wrap align-items-center">
                      {/* Risk level filter */}
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto', fontSize: '0.78rem' }}
                        value={hotspotRiskFilter}
                        onChange={e => setHotspotRiskFilter(e.target.value)}
                      >
                        <option value="All">All risk levels</option>
                        {['Critical','High','Medium','Low'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>

                      {/* Crime type filter — populated from unique types in hotspot data */}
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto', fontSize: '0.78rem' }}
                        value={hotspotCrimeFilter}
                        onChange={e => setHotspotCrimeFilter(e.target.value)}
                      >
                        <option value="All">All crime types</option>
                        {[...new Set(hotspots.map(s => s.crimeType))].sort().map(ct => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>

                      {/* Badge showing filtered count */}
                      <span className="badge" style={{ background: 'rgba(192,57,43,0.12)', color: '#c0392b', border: '1px solid rgba(192,57,43,0.3)', fontSize: '0.65rem' }}>
                        {hotspots.filter(s =>
                          (hotspotRiskFilter  === 'All' || s.risk      === hotspotRiskFilter) &&
                          (hotspotCrimeFilter === 'All' || s.crimeType === hotspotCrimeFilter)
                        ).length} cluster{hotspots.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {hotspots.length === 0 ? (
                    <div className="card-body text-center py-4">
                      <i className="bi bi-geo-alt fs-3 d-block mb-2 text-muted"></i>
                      <p className="text-muted mb-0">No hotspot clusters found for this period.</p>
                      <small className="text-muted">DBSCAN requires at least 3 incidents within 500 m to form a cluster.</small>
                    </div>
                  ) : (
                    <>
                      {/* ── Hotspot summary KPIs ──────────────────────── */}
                      <div className="card-body border-bottom py-3">
                        <div className="row g-3 text-center">
                          {/* Total clusters */}
                          <div className="col-6 col-md-3">
                            <div className="fw-bold" style={{ fontSize: '1.4rem', color: '#1e2d3d' }}>{hotspots.length}</div>
                            <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Clusters</div>
                          </div>
                          {/* Total clustered incidents */}
                          <div className="col-6 col-md-3">
                            <div className="fw-bold" style={{ fontSize: '1.4rem', color: '#1e2d3d' }}>
                              {hotspots.reduce((s, h) => s + h.incidents, 0)}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clustered Incidents</div>
                          </div>
                          {/* Critical / High clusters */}
                          <div className="col-6 col-md-3">
                            <div className="fw-bold" style={{ fontSize: '1.4rem', color: '#c0392b' }}>
                              {hotspots.filter(h => h.risk === 'Critical' || h.risk === 'High').length}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical / High Risk</div>
                          </div>
                          {/* Largest cluster */}
                          <div className="col-6 col-md-3">
                            <div className="fw-bold" style={{ fontSize: '1.4rem', color: '#1565C0' }}>
                              {hotspots[0]?.incidents ?? 0}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Largest Cluster</div>
                          </div>
                        </div>
                      </div>

                      {/* ── Map + Table side by side ──────────────────── */}
                      <div className="row g-0">

                        {/* Leaflet map — cluster centroids as coloured circle markers */}
                        <div className="col-md-5 border-end">
                          <div
                            ref={hotspotMapRef}
                            style={{ height: 380, width: '100%' }}
                          />
                          {/* Map legend */}
                          <div className="px-3 py-2 border-top d-flex gap-3 flex-wrap" style={{ fontSize: '0.72rem', background: '#f8f9fa' }}>
                            {Object.entries(RISK_CONFIG).map(([level, cfg]) => (
                              <span key={level} className="d-flex align-items-center gap-1">
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.hex, display: 'inline-block', flexShrink: 0 }} />
                                {level}
                              </span>
                            ))}
                            <span className="text-muted ms-auto">Circle size = incident count</span>
                          </div>
                        </div>

                        {/* Hotspot table */}
                        <div className="col-md-7">
                          <div style={{ maxHeight: 416, overflowY: 'auto' }}>
                            <table className="table mb-0">
                              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                  <th>#</th>
                                  <th>Location</th>
                                  <th>Dominant Crime</th>
                                  <th className="text-end">Incidents</th>
                                  <th className="text-center">Risk</th>
                                  <th style={{ minWidth: 80 }}>Severity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {hotspots
                                  .filter(s =>
                                    (hotspotRiskFilter  === 'All' || s.risk      === hotspotRiskFilter) &&
                                    (hotspotCrimeFilter === 'All' || s.crimeType === hotspotCrimeFilter)
                                  )
                                  .map((spot, i) => {
                                    const cfg     = riskCfg(spot.risk);
                                    const maxInc  = hotspots[0]?.incidents || 1;
                                    const barPct  = ((spot.incidents / maxInc) * 100).toFixed(0);
                                    return (
                                      <tr key={i}>
                                        <td className="text-muted" style={{ fontSize: '0.75rem' }}>{i + 1}</td>
                                        <td>
                                          {/* Colour dot matching map marker */}
                                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.hex, display: 'inline-block', marginRight: 6, flexShrink: 0 }} />
                                          {spot.location}
                                        </td>
                                        <td className="text-muted" style={{ fontSize: '0.78rem' }}>{spot.crimeType}</td>
                                        <td className="text-end fw-semibold">{spot.incidents}</td>
                                        <td className="text-center">
                                          {/* bg-purple isn't a Bootstrap class — use inline style for Critical */}
                                          <span
                                            className={`badge ${spot.risk !== 'Critical' ? `bg-${cfg.badge.replace('bg-','')}` : ''} ${cfg.text}`}
                                            style={spot.risk === 'Critical' ? { background: cfg.hex } : {}}
                                          >
                                            {spot.risk}
                                          </span>
                                        </td>
                                        <td>
                                          <div className="progress" style={{ height: 6 }}>
                                            <div className="progress-bar" style={{ width: `${barPct}%`, backgroundColor: cfg.hex }} />
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>{/* end row map+table */}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom summary strip — all values from backend ───────── */}
            <div className="row g-3">

              {/* Time of Day Breakdown — aggregated from incidents.time_of_day */}
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-header card-header-accent-dark">
                    <i className="bi bi-clock-history me-2"></i>Time of Day Breakdown
                  </div>
                  <div className="card-body">
                    {timeOfDayData.length === 0 ? (
                      <p className="text-muted small mb-0 text-center py-2">Loading…</p>
                    ) : (
                      timeOfDayData.map(({ label, count, pct, color }) => (
                        <div key={label} className="mb-2">
                          <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.78rem' }}>
                            <span>{label}</span>
                            {/* Show both raw count and percentage */}
                            <span>
                              <strong>{count}</strong>
                              <span className="text-muted ms-1">({pct}%)</span>
                            </span>
                          </div>
                          <div className="progress" style={{ height: 6 }}>
                            <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Day of Week Pattern — aggregated from incidents.day_of_week */}
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-header card-header-accent-dark">
                    <i className="bi bi-calendar-week me-2"></i>Day of Week Pattern
                  </div>
                  <div className="card-body">
                    {dayOfWeekData.length === 0 ? (
                      <p className="text-muted small mb-0 text-center py-2">Loading…</p>
                    ) : (
                      dayOfWeekData.map(({ label, count, max }) => (
                        <div key={label} className="d-flex align-items-center gap-2 mb-1">
                          <span style={{ width: 28, fontSize: '0.75rem', color: '#6c757d', flexShrink: 0 }}>{label}</span>
                          <div className="progress flex-grow-1" style={{ height: 8 }}>
                            <div className="progress-bar bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span style={{ width: 28, fontSize: '0.75rem', textAlign: 'right', flexShrink: 0 }}>{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Dataset Summary — all values from API responses */}
              <div className="col-md-4">
                <div className="card shadow-sm">
                  <div className="card-header card-header-accent-dark">
                    <i className="bi bi-info-circle me-2"></i>Dataset Summary
                  </div>
                  <div className="card-body">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        {[
                          ['Total records',         datasetStats.total],
                          ['Crime types tracked',   datasetStats.typeCount],
                          ['Hotspot clusters',      datasetStats.hotspotCount],
                          ['Under investigation',   datasetStats.investigating],
                          ['Cases closed',          datasetStats.closed],
                          ['Clearance rate',        datasetStats.clearanceRate],
                        ].map(([label, val]) => (
                          <tr key={label}>
                            <td className="text-muted" style={{ fontSize: '0.78rem' }}>{label}</td>
                            <td
                              className={`fw-semibold text-end ${label === 'Clearance rate' ? 'text-success' : ''}`}
                              style={{ fontSize: '0.78rem' }}
                            >
                              {val ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;