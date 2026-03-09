/**
 * src/components/main/Dashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches three backend endpoints in parallel:
 *   getDashboardSummary()  → KPI cards + incidents-by-type bar chart
 *   getTimeSeries()        → weekly trend line chart (freq: 'W')
 *   getHeatmapData()       → crime density heatmap layer on Leaflet map
 *
 * Map now renders a KDE density heatmap (leaflet.heat) instead of raw pins.
 * The Weekly Trend line chart is driven by the backend time-series decomposition.
 * Incidents by Type bar chart is driven by summary.top_types from the backend.
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

// Register all Chart.js modules we use
Chart.register(
  CategoryScale, LinearScale,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  PieController, ArcElement, DoughnutController,
  Title, Tooltip, Legend,
);

// ─── Small reusable KPI card ──────────────────────────────────────────────────
const KPICard = ({ title, value, icon, color, subtitle }) => (
  <div className="card shadow-sm border-0 h-100">
    <div className="card-body">
      <div className={`bg-${color} bg-opacity-10 p-2 rounded d-inline-block mb-2`}>
        <i className={`bi bi-${icon} text-${color} fs-4`}></i>
      </div>
      <h6 className="text-muted mb-1">{title}</h6>
      <h3 className="fw-bold mb-0">{value ?? '—'}</h3>
      {subtitle && <small className="text-muted">{subtitle}</small>}
    </div>
  </div>
);

// ─── Main Dashboard component ─────────────────────────────────────────────────
function Dashboard() {
  // Chart canvas refs — one per chart panel
  const lineChartRef      = useRef(null);
  const barChartRef       = useRef(null);
  const pieChartRef       = useRef(null);
  const doughnutChartRef  = useRef(null);

  // Chart.js instance refs — stored so we can destroy before re-creating
  const lineChartInstance     = useRef(null);
  const barChartInstance      = useRef(null);
  const pieChartInstance      = useRef(null);
  const doughnutChartInstance = useRef(null);

  // Leaflet map refs
  const mapInstance      = useRef(null);
  const mapContainerRef  = useRef(null);
  // We keep a ref to the heatmap layer so it can be removed before re-adding
  const heatLayerRef     = useRef(null);

  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');

  // ── Build / rebuild all four Chart.js charts ────────────────────────────────
  /**
   * @param {object}   sum        getDashboardSummary() response
   * @param {object}   tsWeekly   getTimeSeries({ freq:'W' }) response
   *                              Shape: { dates[], observed[], trend[] }
   * @param {Array}    crimeTypes getCrimeTypes() response array
   *                              Each element: { name, incident_count }
   */
  const buildCharts = useCallback((sum, tsWeekly, crimeTypes) => {
    // Destroy old chart instances to prevent canvas reuse errors
    [lineChartInstance, barChartInstance, pieChartInstance, doughnutChartInstance].forEach((r) => {
      if (r.current) { r.current.destroy(); r.current = null; }
    });

    // ── 1. LINE — Weekly Trend from backend time series ──────────────────────
    // The backend returns up to N weeks of data. We slice the last 12 weeks so
    // the chart is readable.  `observed` is the raw weekly count; `trend` is the
    // smoothed STL decomposition trend component (may be null for short series).
    if (lineChartRef.current) {
      const dates    = tsWeekly?.dates    ?? [];
      const observed = tsWeekly?.observed ?? [];
      const trend    = tsWeekly?.trend    ?? [];

      // Take at most the last 12 data points so the x-axis isn't overcrowded
      const sliceFrom = Math.max(0, dates.length - 12);
      const labels    = dates.slice(sliceFrom).map((d) => {
        // Format "2024-W03" or ISO date string into a readable label
        const dt = new Date(d);
        return isNaN(dt)
          ? d  // keep as-is if not a valid date (e.g., "2024-W03" format)
          : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const obsData   = observed.slice(sliceFrom);
      // Only add the trend line if the backend actually returned trend data
      const trendData = trend.length ? trend.slice(sliceFrom) : null;

      const datasets = [
        {
          label: 'Weekly Incidents',
          data: obsData,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13,110,253,0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
        },
      ];

      // Add optional smoothed trend overlay if backend returned it
      if (trendData) {
        datasets.push({
          label: 'Trend',
          data: trendData,
          borderColor: '#dc3545',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          tension: 0.4,
          fill: false,
          pointRadius: 0,
        });
      }

      lineChartInstance.current = new Chart(lineChartRef.current, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: !!trendData }, // only show legend when trend line present
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Incidents' },
            },
          },
        },
      });
    }

    // ── 2. BAR — Incidents by Crime Type from backend crime-types endpoint ────
    // We use getCrimeTypes() results which include incident_count per type.
    // Top 8 types are shown to keep the chart legible.
    if (barChartRef.current) {
      // Sort descending by count, cap at 8 entries
      const sorted = [...(crimeTypes ?? [])]
        .sort((a, b) => (b.incident_count ?? 0) - (a.incident_count ?? 0))
        .slice(0, 8);

      // Assign a different shade of blue for each bar for visual clarity
      const colours = [
        '#0d6efd','#1a7aff','#3385ff','#4d91ff','#669eff',
        '#80abff','#99b8ff','#b3c5ff',
      ];

      barChartInstance.current = new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: sorted.map((t) => t.name),
          datasets: [{
            label: 'Incidents',
            data: sorted.map((t) => t.incident_count ?? 0),
            backgroundColor: sorted.map((_, i) => colours[i % colours.length]),
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Count' } },
            x: { ticks: { maxRotation: 30, minRotation: 20 } },
          },
        },
      });
    }

    // ── 3. PIE — Incident status breakdown ────────────────────────────────────
    // Driven by summary.by_status: { open: N, resolved: N, ... }
    const byStatus    = sum?.by_status ?? {};
    const statusLabels = Object.keys(byStatus);
    const statusData   = Object.values(byStatus);
    if (pieChartRef.current && statusLabels.length) {
      pieChartInstance.current = new Chart(pieChartRef.current, {
        type: 'pie',
        data: {
          labels: statusLabels,
          datasets: [{
            data: statusData,
            backgroundColor: ['#ffc107','#198754','#6c757d','#dc3545'],
          }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }

    // ── 4. DOUGHNUT — Last 7 days vs prior 23 days activity ──────────────────
    if (doughnutChartRef.current) {
      const l7  = sum?.last_7_days  ?? 0;
      const l30 = sum?.last_30_days ?? 0;
      doughnutChartInstance.current = new Chart(doughnutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Last 7 days', 'Prior 23 days'],
          datasets: [{
            data: [l7, Math.max(0, l30 - l7)],
            backgroundColor: ['#0d6efd', '#e9ecef'],
          }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  }, []);

  // ── Render heatmap layer on the Leaflet map ──────────────────────────────────
  /**
   * Dynamically loads leaflet.heat (CDN) and renders the KDE heatmap layer.
   *
   * The backend returns an array of [lat, lng, intensity] triples from its
   * KDE computation.  leaflet.heat accepts exactly this format.
   *
   * @param {Array<[number, number, number]>} heatPoints  — from getHeatmapData()
   */
  const renderHeatmap = useCallback((heatPoints) => {
    if (!mapInstance.current || !heatPoints?.length) return;

    // Remove the previous heatmap layer before adding a fresh one
    if (heatLayerRef.current) {
      mapInstance.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // leaflet.heat is not on npm so we load it from CDN the first time.
    // We detect whether the plugin has already been loaded by checking
    // whether L.heatLayer exists on the Leaflet namespace.
    const applyLayer = () => {
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius:  25,   // influence radius of each point in pixels
        blur:    15,   // gaussian blur amount (higher = smoother)
        maxZoom: 17,   // zoom level at which each point reaches max intensity
        // Gradient: green → yellow → orange → red (low → high density)
        gradient: { 0.2: '#00c853', 0.5: '#ffd600', 0.75: '#ff6d00', 1.0: '#d50000' },
      }).addTo(mapInstance.current);
    };

    if (typeof L.heatLayer === 'function') {
      // Plugin already loaded from a previous render
      applyLayer();
    } else {
      // Dynamically inject the leaflet.heat script from cdnjs
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js';
      script.onload = applyLayer;
      document.head.appendChild(script);
    }
  }, []);

  // ── Fetch all dashboard data ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fire all four requests simultaneously for speed
      const [sum, tsWeekly, heatData, crimeTypes] = await Promise.all([
        getDashboardSummary(),                 // KPI + status breakdown
        getTimeSeries({ freq: 'W' }),          // Weekly time-series for line chart
        getHeatmapData({}),                    // KDE heatmap points for Leaflet
        getCrimeTypes(),                       // All crime types + incident counts
      ]);

      setSummary(sum);

      // heatData from backend: array of [lat, lng, intensity]
      const heatPoints = Array.isArray(heatData) ? heatData : heatData?.points ?? [];
      renderHeatmap(heatPoints);

      buildCharts(sum, tsWeekly, crimeTypes);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [buildCharts, renderHeatmap]);

  // ── Initialise Leaflet map once on mount ─────────────────────────────────────
  useEffect(() => {
    if (mapContainerRef.current && !mapInstance.current) {
      // Centre on Harare, Zimbabwe
      mapInstance.current = L.map(mapContainerRef.current).setView([-17.8292, 31.0522], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    }
    // Cleanup: remove the map instance when the component unmounts
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  // ── Trigger data fetch after map initialisation (300 ms safety delay) ────────
  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  // ── Destroy Chart.js instances on unmount to prevent memory leaks ─────────────
  useEffect(() => () => {
    [lineChartInstance, barChartInstance, pieChartInstance, doughnutChartInstance].forEach((r) => {
      if (r.current) { r.current.destroy(); r.current = null; }
    });
  }, []);

  const byStatus = summary?.by_status ?? {};

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid p-4">

        {/* ── Header row ─────────────────────────────────────────────────────── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold mb-0">
            <i className="bi bi-speedometer2 me-2 text-primary"></i>Dashboard
          </h4>
          <button className="btn btn-sm btn-outline-primary" onClick={fetchData} disabled={loading}>
            <i className={`bi bi-arrow-repeat${loading ? ' spin' : ''} me-1`}></i>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Error banner ───────────────────────────────────────────────────── */}
        {error && (
          <div className="alert alert-warning alert-dismissible mb-4">
            <i className="bi bi-exclamation-triangle me-2"></i>{error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* ── KPI row ────────────────────────────────────────────────────────── */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <KPICard
              title="Total Incidents" value={summary?.total_incidents}
              icon="file-earmark-text" color="primary" subtitle="All time"
            />
          </div>
          <div className="col-6 col-md-3">
            <KPICard
              title="Last 7 Days" value={summary?.last_7_days}
              icon="calendar-week" color="warning" subtitle="New incidents"
            />
          </div>
          <div className="col-6 col-md-3">
            <KPICard
              title="Open Cases" value={byStatus.open}
              icon="folder2-open" color="danger" subtitle="Unresolved"
            />
          </div>
          <div className="col-6 col-md-3">
            <KPICard
              title="Resolved" value={byStatus.resolved}
              icon="check-circle" color="success" subtitle="Closed"
            />
          </div>
        </div>

        {/* ── Crime Density Heatmap ──────────────────────────────────────────── */}
        <div className="card mb-4 shadow-sm">
          <div className="card-header fw-semibold bg-white d-flex align-items-center gap-2">
            <i className="bi bi-map text-primary"></i>
            Crime Density Map — Harare
            {/* Colour-scale legend strip */}
            <span className="ms-auto d-flex align-items-center gap-1 small text-muted">
              <span>Low</span>
              <span
                style={{
                  width: 120, height: 12, borderRadius: 4,
                  background: 'linear-gradient(to right, #00c853, #ffd600, #ff6d00, #d50000)',
                  display: 'inline-block',
                }}
              />
              <span>High</span>
            </span>
          </div>
          {/* Leaflet mounts into this div; height must be explicit */}
          <div ref={mapContainerRef} style={{ height: 420, width: '100%' }} />
        </div>

        {/* ── Charts row ─────────────────────────────────────────────────────── */}
        <div className="row g-4">

          {/* Weekly Trend — now driven by backend time-series */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white fw-semibold d-flex align-items-center gap-2">
                <i className="bi bi-graph-up text-primary"></i>
                Weekly Trend
                <span className="badge bg-primary bg-opacity-10 text-primary ms-auto small">
                  Time-Series Analysis
                </span>
              </div>
              <div className="card-body" style={{ height: 220 }}>
                <canvas ref={lineChartRef} />
              </div>
            </div>
          </div>

          {/* Incidents by Type — driven by backend crime-types endpoint */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white fw-semibold d-flex align-items-center gap-2">
                <i className="bi bi-bar-chart text-primary"></i>
                Incidents by Type
                <span className="badge bg-primary bg-opacity-10 text-primary ms-auto small">
                  Live Data
                </span>
              </div>
              <div className="card-body" style={{ height: 220 }}>
                <canvas ref={barChartRef} />
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-pie-chart me-2 text-primary"></i>Status Breakdown
              </div>
              <div className="card-body" style={{ height: 220 }}>
                <canvas ref={pieChartRef} />
              </div>
            </div>
          </div>

          {/* Recent Activity doughnut */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-clock-history me-2 text-primary"></i>Recent Activity
              </div>
              <div className="card-body" style={{ height: 220 }}>
                <canvas ref={doughnutChartRef} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;