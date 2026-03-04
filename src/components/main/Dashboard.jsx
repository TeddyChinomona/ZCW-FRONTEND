/**
 * src/components/main/Dashboard.jsx  (final — fully wired)
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches:
 *   getDashboardSummary()  → KPI cards + chart seed data
 *   getIncidents()         → map pins + weekly trend chart
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
import { getDashboardSummary, getIncidents } from '../../services/crimeService';

Chart.register(
  CategoryScale, LinearScale,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  PieController, ArcElement, DoughnutController,
  Title, Tooltip, Legend,
);

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

function Dashboard() {
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const lineChartInstance = useRef(null);
  const barChartInstance = useRef(null);
  const pieChartInstance = useRef(null);
  const doughnutChartInstance = useRef(null);
  const mapInstance = useRef(null);
  const mapContainerRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildCharts = useCallback((sum, incidents) => {
    [lineChartInstance, barChartInstance, pieChartInstance, doughnutChartInstance].forEach((r) => {
      if (r.current) { r.current.destroy(); r.current = null; }
    });

    // Weekly trend
    const dayCounts = Array(7).fill(0);
    const dayLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    incidents.forEach((inc) => {
      if (!inc.timestamp) return;
      const daysAgo = Math.floor((Date.now() - new Date(inc.timestamp)) / 86400000);
      if (daysAgo >= 0 && daysAgo < 7) dayCounts[6 - daysAgo]++;
    });
    if (lineChartRef.current) {
      lineChartInstance.current = new Chart(lineChartRef.current, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [{ label: 'Incidents', data: dayCounts, borderColor: '#0d6efd', backgroundColor: 'rgba(13,110,253,0.1)', tension: 0.3, fill: true }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }

    // Bar: top types
    const topTypes = sum?.top_types ?? [];
    if (barChartRef.current && topTypes.length) {
      barChartInstance.current = new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: topTypes.map((t) => t.name),
          datasets: [{ label: 'Incidents', data: topTypes.map((t) => t.count), backgroundColor: '#0d6efd' }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
    }

    // Pie: by status
    const byStatus = sum?.by_status ?? {};
    const statusLabels = Object.keys(byStatus);
    const statusData = Object.values(byStatus);
    if (pieChartRef.current && statusLabels.length) {
      pieChartInstance.current = new Chart(pieChartRef.current, {
        type: 'pie',
        data: { labels: statusLabels, datasets: [{ data: statusData, backgroundColor: ['#ffc107','#198754','#6c757d','#dc3545'] }] },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }

    // Doughnut: 7-day vs prior
    if (doughnutChartRef.current) {
      const l7 = sum?.last_7_days ?? 0;
      const l30 = sum?.last_30_days ?? 0;
      doughnutChartInstance.current = new Chart(doughnutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Last 7 days', 'Prior 23 days'],
          datasets: [{ data: [l7, Math.max(0, l30 - l7)], backgroundColor: ['#0d6efd', '#e9ecef'] }],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sum, incidents] = await Promise.all([
        getDashboardSummary(),
        getIncidents({ status: 'open' }),
      ]);
      setSummary(sum);

      const incList = Array.isArray(incidents) ? incidents : incidents.results ?? [];

      // Add pins to map
      if (mapInstance.current) {
        incList.forEach((inc) => {
          if (inc.latitude && inc.longitude) {
            L.circleMarker([inc.latitude, inc.longitude], { radius: 6, color: '#e74c3c', fillColor: '#e74c3c', fillOpacity: 0.7 })
              .bindPopup(`<strong>#${inc.id}</strong><br/>${inc.crime_type?.name ?? 'Unknown'}<br/>${inc.suburb ?? ''}`)
              .addTo(mapInstance.current);
          }
        });
      }

      buildCharts(sum, incList);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [buildCharts]);

  // Init map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapContainerRef.current).setView([-17.8292, 31.0522], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    }
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  // Fetch after map init
  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Cleanup charts
  useEffect(() => () => {
    [lineChartInstance, barChartInstance, pieChartInstance, doughnutChartInstance].forEach((r) => {
      if (r.current) { r.current.destroy(); r.current = null; }
    });
  }, []);

  const byStatus = summary?.by_status ?? {};

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold mb-0">
            <i className="bi bi-speedometer2 me-2 text-primary"></i>Dashboard
          </h4>
          <button className="btn btn-sm btn-outline-primary" onClick={fetchData} disabled={loading}>
            <i className={`bi bi-arrow-repeat${loading ? ' spin' : ''} me-1`}></i>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="alert alert-warning alert-dismissible mb-4">
            <i className="bi bi-exclamation-triangle me-2"></i>{error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* KPI row */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <KPICard title="Total Incidents" value={summary?.total_incidents} icon="file-earmark-text" color="primary" subtitle="All time" />
          </div>
          <div className="col-6 col-md-3">
            <KPICard title="Last 7 Days" value={summary?.last_7_days} icon="calendar-week" color="warning" subtitle="New incidents" />
          </div>
          <div className="col-6 col-md-3">
            <KPICard title="Open Cases" value={byStatus.open} icon="folder2-open" color="danger" subtitle="Unresolved" />
          </div>
          <div className="col-6 col-md-3">
            <KPICard title="Resolved" value={byStatus.resolved} icon="check-circle" color="success" subtitle="Closed" />
          </div>
        </div>

        {/* Map */}
        <div className="card mb-4 shadow-sm">
          <div className="card-header fw-semibold bg-white">
            <i className="bi bi-map me-2 text-primary"></i>Live Crime Map — Harare
          </div>
          <div ref={mapContainerRef} style={{ height: 400, width: '100%' }} />
        </div>

        {/* Charts */}
        <div className="row g-4">
          {[
            { ref: lineChartRef, title: 'Weekly Trend' },
            { ref: barChartRef,  title: 'Incidents by Type' },
            { ref: pieChartRef,  title: 'Status Breakdown' },
            { ref: doughnutChartRef, title: 'Recent Activity' },
          ].map(({ ref, title }) => (
            <div className="col-md-6" key={title}>
              <div className="card shadow-sm">
                <div className="card-header bg-white fw-semibold">{title}</div>
                <div className="card-body" style={{ height: 220 }}>
                  <canvas ref={ref} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
