/**
 * src/components/main/Dashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main ZRP Operations Dashboard.
 *
 * Visual changes from previous version:
 *  • Replaced ad-hoc page heading with <PageTopBar> for uniform sticky header
 *  • All card-header elements now use the neutral .card-header-accent-* pattern
 *    (no more mixed bg-white / bg-primary / bg-dark across different cards)
 *  • KPI cards use the new .kpi-card CSS class with a top-stripe indicator
 *  • Card body padding is consistent (handled by index.css .card-body)
 *
 * Data logic is unchanged — still fetches:
 *   getDashboardSummary()  → KPI cards + incidents-by-type bar chart
 *   getTimeSeries()        → weekly trend line chart
 *   getHeatmapData()       → KDE density heatmap on Leaflet map
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
      {/* Icon badge */}
      <div
        className="kpi-icon bg-primary bg-opacity-10"
        style={{ background: 'rgba(21,101,192,0.08)' }}
      >
        <i className={`bi bi-${icon} text-primary`}></i>
      </div>
    </div>
    <div className="kpi-value">{value ?? '—'}</div>
    <div className="kpi-label">{title}</div>
    {subtitle && <div className="text-muted mt-1" style={{ fontSize: '0.72rem' }}>{subtitle}</div>}
  </div>
);

/* ── Chart colour palette (consistent across bar / pie / line charts) ───── */
const CHART_COLOURS = ['#1565C0','#c0392b','#f0b429','#1e8449','#7b2d8b','#d35400','#2e86c1','#717d7e'];

/* ── Main component ─────────────────────────────────────────────────────── */
function Dashboard() {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  /* Chart canvas refs */
  const barChartRef      = useRef(null);
  const pieChartRef      = useRef(null);
  const doughnutChartRef = useRef(null);
  const lineChartRef     = useRef(null);
  const mapRef           = useRef(null);

  /* Chart & map instance refs (for cleanup on re-render) */
  const barChartInstance      = useRef(null);
  const pieChartInstance      = useRef(null);
  const doughnutChartInstance = useRef(null);
  const lineChartInstance     = useRef(null);
  const mapInstance           = useRef(null);
  const heatLayer             = useRef(null);

  /* Derived status counts */
  const byStatus = {
    open:        summary?.by_status?.open         ?? summary?.by_status?.reported ?? 0,
    investigating: summary?.by_status?.investigating ?? 0,
    resolved:    summary?.by_status?.resolved     ?? summary?.by_status?.closed   ?? 0,
  };

  /* ── Destroy a Chart.js instance safely ─────────────────────────────── */
  const destroyChart = (ref) => {
    if (ref.current) { ref.current.destroy(); ref.current = null; }
  };

  /* ── Build / rebuild all charts from fresh data ─────────────────────── */
  const buildCharts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, ts, heatData, types] = await Promise.all([
        getDashboardSummary(),
        getTimeSeries({ freq: 'W' }),
        getHeatmapData(),
        getCrimeTypes(),
      ]);
      setSummary(sum);

      /* ── Bar chart: incidents by crime type ─────────────────────────── */
      destroyChart(barChartInstance);
      if (barChartRef.current) {
        const topTypes = sum?.top_types ?? types.map(t => ({ name: t.name, count: t.incident_count ?? 0 }));
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

      /* ── Pie chart: status breakdown ─────────────────────────────────── */
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
              borderColor: ['#1565C0','#f0b429','#1e8449','#c0392b'],
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10, boxWidth: 10 } } },
          },
        });
      }

      /* ── Doughnut chart: last 7 vs last 30 days ──────────────────────── */
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
              borderColor: ['#1565C0','#f0b429','#dee2e6'],
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8, boxWidth: 10 } } },
          },
        });
      }

      /* ── Line chart: weekly trend ────────────────────────────────────── */
      destroyChart(lineChartInstance);
      if (lineChartRef.current && ts?.dates?.length) {
        lineChartInstance.current = new Chart(lineChartRef.current, {
          type: 'line',
          data: {
            labels: ts.dates.map(d => d.slice(5)),  /* show MM-DD only      */
            datasets: [{
              label: 'Incidents',
              data: ts.observed,
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
      }

      /* ── Leaflet heatmap ─────────────────────────────────────────────── */
      if (!mapInstance.current && mapRef.current) {
        /* Harare coordinates */
        mapInstance.current = L.map(mapRef.current).setView([-17.8292, 31.0522], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance.current);
      }
      if (mapInstance.current && heatData?.points?.length) {
        /* Remove previous heat layer before adding a new one */
        if (heatLayer.current) mapInstance.current.removeLayer(heatLayer.current);
        /* leaflet.heat must be loaded globally */
        if (window.L?.heatLayer) {
          heatLayer.current = window.L.heatLayer(
            heatData.points.map(p => [p.lat, p.lng, p.weight ?? 1]),
            { radius: 20, blur: 15, maxZoom: 17 },
          ).addTo(mapInstance.current);
        }
      }

    } catch (err) {
      setError('Could not load dashboard data. Please check the API connection.');
      console.error('[Dashboard]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Build charts on first mount; clean up on unmount */
  useEffect(() => {
    buildCharts();
    return () => {
      destroyChart(barChartInstance);
      destroyChart(pieChartInstance);
      destroyChart(doughnutChartInstance);
      destroyChart(lineChartInstance);
    };
  }, [buildCharts]);

  /* ── Render ─────────────────────────────────────────────────────────── */
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

        {/* Error banner */}
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
          </div>
          <div className="card-body p-0">
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