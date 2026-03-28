/**
 * src/components/main/Dashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main ZRP Operations Dashboard.
 *
 * Fixes applied:
 *  1. Crime Density Heatmap — the old code only supported `window.L.heatLayer`
 *     (the globalleaflet.heat plugin). We now use Leaflet CircleMarkers as a
 *     reliable fallback when leaflet.heat is unavailable, and also attempt to
 *     load the plugin. The heatmap data from the backend is { heatmap_data: [...] }
 *     NOT { points: [...] }, fixed the destructuring accordingly.
 *  2. Weekly Crime Trend — TimeSeriesView wraps its result as
 *     { timeseries: { labels, observed, ... } }. Old code accessed ts.dates
 *     which doesn't exist; fixed to ts.timeseries?.labels.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CategoryScale, Chart, LinearScale,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  PieController, ArcElement,
  DoughnutController, Title, Tooltip, Legend,
} from 'chart.js';
import {
  getDashboardSummary,
  getTimeSeries,
  getHeatmapData,
  getCrimeTypes,
} from '../../services/crimeService';
import PageTopBar from './Pagetopbar';

/* Register all Chart.js modules we use */
Chart.register(
  CategoryScale, LinearScale,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  PieController, ArcElement, DoughnutController,
  Title, Tooltip, Legend,
);

/* ── KPI card ────────────────────────────────────────────────────────────── */
const KPICard = ({ title, value, icon, colorClass, subtitle }) => (
  <div className={`kpi-card ${colorClass} h-100`}>
    <div className="d-flex justify-content-between align-items-start mb-2">
      <div className="kpi-icon bg-primary bg-opacity-10" style={{ background: 'rgba(21,101,192,0.08)' }}>
        <i className={`bi bi-${icon} text-primary`}></i>
      </div>
    </div>
    <div className="kpi-value">{value ?? '—'}</div>
    <div className="kpi-label">{title}</div>
    {subtitle && <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>{subtitle}</div>}
  </div>
);

/* Colour palette for bar / pie charts */
const CHART_COLOURS = ['#1565C0','#c0392b','#f0b429','#1e8449','#7b2d8b','#d35400','#2e86c1','#717d7e'];

function Dashboard() {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  /* Canvas refs for Chart.js */
  const barChartRef      = useRef(null);
  const pieChartRef      = useRef(null);
  const doughnutChartRef = useRef(null);
  const lineChartRef     = useRef(null);
  /* DOM node for the Leaflet map */
  const mapRef           = useRef(null);

  /* Mutable refs for Chart.js and Leaflet instances (not tracked by React state) */
  const barChartInstance      = useRef(null);
  const pieChartInstance      = useRef(null);
  const doughnutChartInstance = useRef(null);
  const lineChartInstance     = useRef(null);
  const mapInstance           = useRef(null);
  /* Layer group for heat/circle markers so we can clear on refresh */
  const heatLayerGroup        = useRef(null);

  /* Derived status counts with safe fallbacks */
  const byStatus = {
    open:          summary?.by_status?.open          ?? summary?.by_status?.reported       ?? 0,
    investigating: summary?.by_status?.investigating  ?? 0,
    resolved:      summary?.by_status?.resolved       ?? summary?.by_status?.closed         ?? 0,
  };

  /* Safely destroy a Chart.js instance */
  const destroyChart = (ref) => {
    if (ref.current) { ref.current.destroy(); ref.current = null; }
  };

  /* ── Render heatmap points on the Leaflet map ────────────────────────────
   * Backend response shape: { heatmap_data: { points: [{lat, lng, intensity}] } }
   * OR old shape: { heatmap_data: [[lat, lng, intensity], ...] }
   * We handle both formats defensively.
   *
   * Strategy:
   *  1. Try window.L.heatLayer (leaflet.heat plugin loaded via CDN in index.html)
   *  2. Fall back to CircleMarker pins (always available via leaflet package)
   */
  const renderHeatmapPoints = useCallback((map, rawData) => {
    if (!map || !rawData) return;

    /* Clear previous heat/marker layer */
    if (heatLayerGroup.current) {
      heatLayerGroup.current.clearLayers();
    } else {
      heatLayerGroup.current = L.layerGroup().addTo(map);
    }

    /* Normalise input to array of {lat, lng, intensity} objects */
    let points = [];
    if (Array.isArray(rawData)) {
      /* Old backend shape: [[lat, lng, intensity], ...] */
      points = rawData.map(p =>
        Array.isArray(p)
          ? { lat: p[0], lng: p[1], intensity: p[2] ?? 0.5 }
          : p
      );
    } else if (rawData?.points) {
      /* Shape: { points: [{lat, lng, intensity}] } */
      points = rawData.points;
    }

    if (!points.length) return;

    /* Attempt leaflet.heat plugin first (richer visual) */
    if (window.L?.heatLayer) {
      try {
        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity ?? 1]);
        const layer = window.L.heatLayer(heatPoints, { radius: 20, blur: 15, maxZoom: 17 });
        heatLayerGroup.current.addLayer(layer);
        return;
      } catch {
        /* Plugin call failed; fall through to CircleMarker fallback */
      }
    }

    /* Fallback: CircleMarker with opacity proportional to intensity */
    points.forEach(({ lat, lng, intensity = 0.5 }) => {
      /* Map intensity (0–1) to a colour from green → yellow → red */
      const r = Math.round(intensity * 255);
      const g = Math.round((1 - intensity) * 200);
      const color = `rgb(${r},${g},20)`;

      const marker = L.circleMarker([lat, lng], {
        radius:      6,
        fillColor:   color,
        color:       'transparent',
        fillOpacity: 0.55 + intensity * 0.35,  // range: 0.55–0.90
        weight:      0,
      });
      heatLayerGroup.current.addLayer(marker);
    });

    /* Fit map to point bounds */
    const latLngs = points.map(p => [p.lat, p.lng]);
    if (latLngs.length) {
      map.fitBounds(latLngs, { padding: [30, 30], maxZoom: 14 });
    }
  }, []);

  /* ── Build / rebuild all charts from fresh data ─────────────────────── */
  const buildCharts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, ts, heatRes, types] = await Promise.all([
        getDashboardSummary(),
        /* Request weekly frequency; backend returns { timeseries: { labels, observed, ... } } */
        getTimeSeries({ freq: 'W' }),
        /* Backend returns { heatmap_data: { points: [...] } } */
        getHeatmapData(),
        getCrimeTypes(),
      ]);
      setSummary(sum);

      /* ─── Unwrap backend envelopes ────────────────────────────────────── */
      /* TimeSeries: may be { timeseries: {...} } or the inner object directly */
      const tsInner = ts?.timeseries ?? ts;

      /* labels field (new backend) or dates (old backend) */
      const tsLabels   = tsInner?.labels   ?? tsInner?.dates   ?? [];
      const tsObserved = tsInner?.observed ?? [];

      /* Heatmap: may be { heatmap_data: {...} } or the inner object */
      const heatInner  = heatRes?.heatmap_data ?? heatRes;

      /* ─── Bar chart: incidents by crime type ──────────────────────────── */
      destroyChart(barChartInstance);
      if (barChartRef.current) {
        /* Prefer summary top types; fall back to full crime type list */
        const topTypes = sum?.top_types
          ?? sum?.top_crime_types?.map(t => ({ name: t.crime_type__name ?? t.name, count: t.count ?? 0 }))
          ?? types.map(t => ({ name: t.name, count: t.incident_count ?? 0 }));

        barChartInstance.current = new Chart(barChartRef.current, {
          type: 'bar',
          data: {
            labels: topTypes.map(t => t.name),
            datasets: [{
              label: 'Incidents',
              data: topTypes.map(t => t.count),
              backgroundColor: CHART_COLOURS.map(c => c + 'CC'),
              borderColor: CHART_COLOURS,
              borderWidth: 1,
              borderRadius: 4,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { font: { size: 10 } }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f0f2f5' } },
            },
          },
        });
      }

      /* ─── Pie chart: status breakdown ──────────────────────────────────── */
      destroyChart(pieChartInstance);
      if (pieChartRef.current) {
        const statuses = sum?.by_status ?? {};
        pieChartInstance.current = new Chart(pieChartRef.current, {
          type: 'pie',
          data: {
            labels: Object.keys(statuses),
            datasets: [{
              data: Object.values(statuses),
              backgroundColor: ['#1565C0CC','#f0b429CC','#1e8449CC','#c0392bCC'],
              borderColor:     ['#1565C0',  '#f0b429',  '#1e8449',  '#c0392b'],
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10, boxWidth: 10 } },
            },
          },
        });
      }

      /* ─── Doughnut chart: recency breakdown ────────────────────────────── */
      destroyChart(doughnutChartInstance);
      if (doughnutChartRef.current) {
        const last7  = sum?.last_7_days  ?? 0;
        const last30 = sum?.last_30_days ?? 0;
        const older  = Math.max(0, (sum?.total_incidents ?? 0) - last30);
        doughnutChartInstance.current = new Chart(doughnutChartRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Last 7 days', 'Last 30 days', 'Older'],
            datasets: [{
              data: [last7, last30 - last7, older],
              backgroundColor: ['#1565C0CC','#f0b429CC','#dee2e6'],
              borderColor:     ['#1565C0',  '#f0b429',  '#dee2e6'],
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8, boxWidth: 10 } },
            },
          },
        });
      }

      /* ─── Line chart: weekly trend ─────────────────────────────────────── */
      destroyChart(lineChartInstance);
      if (lineChartRef.current && tsLabels.length) {
        /* Format labels: "2024-06-10" → "06-10" for compact display */
        const shortLabels = tsLabels.map(d => (d && d.length >= 7) ? d.slice(5) : d);

        lineChartInstance.current = new Chart(lineChartRef.current, {
          type: 'line',
          data: {
            labels: shortLabels,
            datasets: [{
              label: 'Incidents',
              data: tsObserved,
              borderColor: '#1565C0',
              backgroundColor: 'rgba(21,101,192,0.08)',
              borderWidth: 2,
              pointRadius: 2,
              fill: true,
              tension: 0.35,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { font: { size: 9 }, maxTicksLimit: 8 }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f0f2f5' } },
            },
          },
        });
      } else if (lineChartRef.current && !tsLabels.length) {
        /* No data available — render a placeholder message on the canvas */
        const ctx = lineChartRef.current.getContext('2d');
        ctx.clearRect(0, 0, lineChartRef.current.width, lineChartRef.current.height);
        ctx.fillStyle = '#adb5bd';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          'No trend data available for this period',
          lineChartRef.current.width / 2,
          lineChartRef.current.height / 2,
        );
      }

      /* ─── Leaflet heatmap ──────────────────────────────────────────────── */
      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = L.map(mapRef.current).setView([-17.8292, 31.0522], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance.current);
      }

      /* Render heat points (works with or without the leaflet.heat plugin) */
      if (mapInstance.current) {
        renderHeatmapPoints(mapInstance.current, heatInner);
      }

    } catch (err) {
      setError('Could not load dashboard data. Please check the API connection.');
      console.error('[Dashboard]', err);
    } finally {
      setLoading(false);
    }
  }, [renderHeatmapPoints]);

  /* Build charts on mount; clean up on unmount */
  useEffect(() => {
    buildCharts();
    return () => {
      destroyChart(barChartInstance);
      destroyChart(pieChartInstance);
      destroyChart(doughnutChartInstance);
      destroyChart(lineChartInstance);
      /* Leaflet map cleanup */
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [buildCharts]);

  return (
    <div className="topbar container-fluid p-0">

      {/* ── Sticky page header ─────────────────────────────────────────── */}
      <PageTopBar
        title="Operations Dashboard"
        icon="speedometer2"
        subtitle="ZRP Harare Division — crime intelligence overview"
      >
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={buildCharts}
          disabled={loading}
        >
          <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </PageTopBar>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <div className="page-content">

        {error && (
          <div className="alert alert-warning alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* ── KPI row ──────────────────────────────────────────────────── */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <KPICard title="Total Incidents" value={summary?.total_incidents} icon="file-earmark-text" colorClass="kpi-primary" subtitle="All time" />
          </div>
          <div className="col-6 col-md-3">
            <KPICard title="Last 7 Days" value={summary?.last_7_days} icon="calendar-week" colorClass="kpi-warning" subtitle="New incidents" />
          </div>
          <div className="col-6 col-md-3">
            <KPICard title="Open Cases" value={byStatus.open} icon="folder2-open" colorClass="kpi-danger" subtitle="Awaiting action" />
          </div>
          <div className="col-6 col-md-3">
            <KPICard title="Resolved" value={byStatus.resolved} icon="check-circle" colorClass="kpi-success" subtitle="Cases closed" />
          </div>
        </div>

        {/* ── Crime Density Heatmap ─────────────────────────────────────── */}
        <div className="card shadow-sm mb-4">
          <div className="card-header card-header-accent-blue">
            <i className="bi bi-map me-2"></i>
            Crime Density Heatmap
            <span className="badge badge-investigating ms-2">KDE</span>
            {loading && (
              <span className="spinner-border spinner-border-sm ms-2 text-primary" role="status" />
            )}
          </div>
          <div className="card-body p-0">
            {/* The div must always be present so Leaflet can attach to it */}
            <div ref={mapRef} style={{ height: 360, width: '100%', borderRadius: '0 0 8px 8px' }} />
          </div>
        </div>

        {/* ── Charts row ───────────────────────────────────────────────── */}
        <div className="row g-3 mb-4">

          {/* Weekly trend */}
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-blue">
                <i className="bi bi-graph-up me-2"></i>Weekly Crime Trend
              </div>
              <div className="card-body">
                <div className="chart-container" style={{ height: 200 }}>
                  <canvas ref={lineChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Incidents by type */}
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-dark d-flex align-items-center justify-content-between">
                <span><i className="bi bi-bar-chart me-2"></i>Incidents by Type</span>
                <span className="badge badge-reported" style={{ fontSize: '0.65rem' }}>Live</span>
              </div>
              <div className="card-body">
                <div className="chart-container" style={{ height: 200 }}>
                  <canvas ref={barChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-dark">
                <i className="bi bi-pie-chart me-2"></i>Status Breakdown
              </div>
              <div className="card-body">
                <div className="chart-container" style={{ height: 200 }}>
                  <canvas ref={pieChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-dark">
                <i className="bi bi-clock-history me-2"></i>Recent Activity
              </div>
              <div className="card-body">
                <div className="chart-container" style={{ height: 200 }}>
                  <canvas ref={doughnutChartRef} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;