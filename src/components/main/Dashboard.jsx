/**
 * src/components/main/Dashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ZRP Operations Dashboard — Enhanced Version.
 *
 * Enhancements over the previous version:
 *
 *  HEATMAP MODULE:
 *   • Crime-type filter dropdown — re-fetches KDE data for the selected type
 *   • Date-range filter (start/end date inputs) — passed to getHeatmapData()
 *   • Hotspot data table below the map: suburb, incident count, risk level,
 *     dominant crime type, bearing from CBD, and a descriptive "what this means"
 *     column so analysts understand the spatial pattern at a glance.
 *   • Summary bar at the top of the heatmap card showing total clusters,
 *     critical/high risk count, and the most affected area.
 *
 *  TIME SERIES MODULE:
 *   • Frequency toggle: Daily / Weekly / Monthly
 *   • Crime-type filter — re-fetches series for the selected type
 *   • Date-range filter (start/end date inputs)
 *   • Trend interpretation table below the chart: each period label, observed
 *     count, trend value, 4-week moving average, % change vs previous period,
 *     and a plain-English "Interpretation" column.
 *   • Statistical summary row: total, peak, average, and overall trend direction.
 *
 *  GENERAL:
 *   • KPI cards and other charts preserved from the original implementation.
 *   • Leaflet heatmap rendering preserved with dynamic zoom-based radius.
 *   • All fixes from the previous version (envelope unwrapping, role checks,
 *     coord access via location.y/location.x) remain in place.
 */

import CrimeDensityHeatmap from './component/CrimeDensityHeatmap';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import {
  CategoryScale, Chart, LinearScale,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  PieController, ArcElement,
  DoughnutController, Title, Tooltip, Legend, Filler
} from 'chart.js';
import {
  getDashboardSummary,
  getTimeSeries,
  getHeatmapData,
  getCrimeTypes,
  getHotspots,
} from '../../services/crimeService';
import PageTopBar from './Pagetopbar';

/* ── Register all Chart.js modules ────────────────────────────────────────── */
Chart.register(
  CategoryScale, LinearScale,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  PieController, ArcElement, DoughnutController,
  Title, Tooltip, Legend, Filler
);

/* ── Colour palette shared across bar / pie charts ───────────────────────── */
const CHART_COLOURS = [
  '#1565C0', '#c0392b', '#f0b429', '#1e8449',
  '#7b2d8b', '#d35400', '#2e86c1', '#717d7e'
];

/* ── Risk level colour mapping used in both map legend and table badges ───── */
const RISK_META = {
  Critical : { badge: 'bg-purple text-white',   hex: '#7b2d8b', label: 'Critical' },
  High     : { badge: 'bg-danger  text-white',   hex: '#c0392b', label: 'High'     },
  Medium   : { badge: 'bg-warning text-dark',    hex: '#f0b429', label: 'Medium'   },
  Low      : { badge: 'bg-success text-white',   hex: '#1e8449', label: 'Low'      },
};
const riskMeta = (level) => RISK_META[level] ?? RISK_META.Low;

/* ── Harare CBD reference point (used for cardinal-bearing calculation) ───── */
const HARARE_CBD = { lat: -17.8292, lng: 31.0522 };

/**
 * cardinalBearing — returns a human-readable compass direction from the
 * CBD reference to a hotspot centroid, e.g. "3.4 km NW".
 */
const cardinalBearing = (lat, lng) => {
  if (!lat || !lng) return '—';
  const R = 6371; // Earth radius in km
  const dLat = (lat - HARARE_CBD.lat) * (Math.PI / 180);
  const dLng = (lng - HARARE_CBD.lng) * (Math.PI / 180);
  // Approximate Euclidean distance in km (good enough within Harare)
  const dist = Math.sqrt(dLat * dLat + dLng * dLng) * R;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((angle % 360) + 360) % 360 / 45) % 8;
  return `${dist.toFixed(1)} km ${dirs[idx]}`;
};

/**
 * movingAverage — returns a 4-period moving average array, padding the
 * first 3 positions with null so indices align with the source array.
 */
const movingAverage = (arr, window = 4) =>
  arr.map((_, i) =>
    i < window - 1
      ? null
      : parseFloat(
          (arr.slice(i - window + 1, i + 1).reduce((s, v) => s + (v ?? 0), 0) / window).toFixed(1)
        )
  );

/**
 * percentChange — returns the % change between two consecutive values,
 * formatted as "+12.5 %" or "−3.2 %" with an appropriate colour class.
 */
const percentChange = (prev, curr) => {
  if (!prev || prev === 0) return { text: '—', cls: 'text-muted' };
  const pct = (((curr ?? 0) - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(1)} %`,
    cls : pct > 5 ? 'text-danger fw-semibold'
        : pct < -5 ? 'text-success fw-semibold'
        : 'text-muted',
  };
};

/**
 * trendInterpretation — plain-English label for a single time period.
 * Compares observed vs moving-average to describe the local pattern.
 */
const trendInterpretation = (observed, mavg, prevObserved) => {
  if (observed === null || observed === undefined) return '—';
  const rising = prevObserved !== null && (observed ?? 0) > (prevObserved ?? 0);
  const aboveMa = mavg !== null && (observed ?? 0) > mavg;
  if (observed === 0) return 'No incidents recorded';
  if (observed > 20 && aboveMa && rising)  return 'Surge — significantly above trend';
  if (observed > 10 && rising)              return 'Elevated — increasing activity';
  if (!rising && !aboveMa && observed < 5) return 'Quiet — below average';
  if (!rising && aboveMa)                  return 'Declining from elevated level';
  if (rising && !aboveMa)                  return 'Recovering — approaching average';
  return 'Within normal range';
};

/* ── KPI card component ───────────────────────────────────────────────────── */
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

/* ── Inline loading spinner ───────────────────────────────────────────────── */
const Spinner = () => (
  <span className="spinner-border spinner-border-sm ms-2 text-primary" role="status" aria-hidden="true" />
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
function Dashboard() {
  /* ── Global state ──────────────────────────────────────────────────────── */
  const [summary,    setSummary]    = useState(null);
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  /* ── Heatmap-specific state ────────────────────────────────────────────── */
  const [heatmapCrimeType,  setHeatmapCrimeType]  = useState('');       // '' = all types
  const [heatmapStartDate,  setHeatmapStartDate]  = useState('');
  const [heatmapEndDate,    setHeatmapEndDate]    = useState('');
  const [hotspots,          setHotspots]          = useState([]);        // DBSCAN cluster objects
  const [heatmapLoading,    setHeatmapLoading]    = useState(false);
  const [heatmapSortKey,    setHeatmapSortKey]    = useState('incidents'); // table sort column
  const [heatmapSortDir,    setHeatmapSortDir]    = useState('desc');

  /* ── Time-series-specific state ────────────────────────────────────────── */
  const [tsFreq,       setTsFreq]       = useState('W');    // D | W | M
  const [tsCrimeType,  setTsCrimeType]  = useState('');
  const [tsStartDate,  setTsStartDate]  = useState('');
  const [tsEndDate,    setTsEndDate]    = useState('');
  const [tsData,       setTsData]       = useState({ labels: [], observed: [], trend: [] });
  const [tsLoading,    setTsLoading]    = useState(false);
  const [tsSortDir,    setTsSortDir]    = useState('asc');  // table chronological sort

  /* ── Canvas / DOM refs ─────────────────────────────────────────────────── */
  const barChartRef       = useRef(null);
  const pieChartRef       = useRef(null);
  const doughnutChartRef  = useRef(null);
  const lineChartRef      = useRef(null);
  const mapRef            = useRef(null);

  /* ── Chart / Leaflet instance refs (not tracked by React state) ─────────── */
  const barChartInstance      = useRef(null);
  const pieChartInstance      = useRef(null);
  const doughnutChartInstance = useRef(null);
  const lineChartInstance     = useRef(null);
  const mapInstance           = useRef(null);
  const heatLayerGroup        = useRef(null);   // holds the current L.heatLayer instance

  /* ── Derived status counts ─────────────────────────────────────────────── */
  const byStatus = {
    open:          summary?.by_status?.open          ?? summary?.by_status?.reported       ?? 0,
    investigating: summary?.by_status?.investigating  ?? 0,
    resolved:      summary?.by_status?.resolved       ?? summary?.by_status?.closed         ?? 0,
  };

  /* ── Destroy a Chart.js instance safely ───────────────────────────────── */
  const destroyChart = (ref) => {
    if (ref.current) { ref.current.destroy(); ref.current = null; }
  };

  /* ─────────────────────────────────────────────────────────────────────────
   * renderHeatmapPoints
   * Renders KDE heatmap points onto the Leaflet map.
   * Strategy:
   *   1. Remove previous heat layer and zoom listener.
   *   2. Normalise the backend response (both array and {points:[]} formats).
   *   3. Fit map bounds to the data extent.
   *   4. Add L.heatLayer (leaflet.heat plugin) with zoom-proportional radius.
   *   5. Register a zoomend handler to keep radius proportional as user zooms.
   * ───────────────────────────────────────────────────────────────────────── */
  const renderHeatmapPoints = useCallback((map, rawData) => {
    if (!map || !rawData) return;

    // 1. Remove the previous heat layer and its zoom listener
    if (heatLayerGroup.current) {
      map.removeLayer(heatLayerGroup.current);
      heatLayerGroup.current = null;
    }
    if (map._heatmapZoomHandler) {
      map.off('zoomend', map._heatmapZoomHandler);
      delete map._heatmapZoomHandler;
    }

    // 2. Normalise input — backend may return an array or an object with a points key
    let points = [];
    if (Array.isArray(rawData)) {
      points = rawData.map(p =>
        Array.isArray(p)
          ? { lat: p[0], lng: p[1], intensity: p[2] ?? 0.5 }
          : p
      );
    } else if (rawData?.points) {
      points = rawData.points;
    }

    if (!points.length) return;

    // 3. Fit map to the data extent
    const latLngs = points.map(p => [p.lat, p.lng]);
    map.fitBounds(latLngs, { padding: [30, 30], maxZoom: 14 });

    // 4. Dynamic radius helper — base radius looks correct at zoom level 13
    const getDynamicRadius = (zoom) =>
      Math.max(5, Math.min(120, 20 * Math.pow(2, zoom - 13)));

    if (L.heatLayer) {
      try {
        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity ?? 1]);
        const heatLayer  = L.heatLayer(heatPoints, {
          radius  : getDynamicRadius(map.getZoom()),
          blur    : 15,
          maxZoom : 17,
          gradient: { 0.2: '#1565C0', 0.5: '#f0b429', 0.8: '#c0392b', 1.0: '#7b2d8b' },
        }).addTo(map);
        heatLayerGroup.current = heatLayer;

        // 5. Update radius on every zoom so the layer stays visually consistent
        const handleZoom = () => {
          if (heatLayerGroup.current) {
            heatLayerGroup.current.setOptions({
              radius: getDynamicRadius(map.getZoom()),
            });
          }
        };
        map.on('zoomend', handleZoom);
        map._heatmapZoomHandler = handleZoom;
      } catch (e) {
        console.warn('[Dashboard] L.heatLayer failed — heatmap skipped:', e.message);
      }
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
   * fetchHeatmap
   * Fetches KDE heatmap data and DBSCAN hotspot list with the current
   * heatmap filter state, then re-renders the Leaflet layer and updates
   * the hotspot table.
   * ───────────────────────────────────────────────────────────────────────── */
  const fetchHeatmap = useCallback(async () => {
    if (!mapInstance.current) return;
    setHeatmapLoading(true);

    // Build the filter payload (empty strings are omitted by the service)
    const filters = {};
    if (heatmapCrimeType) filters.crime_type_id = heatmapCrimeType;
    if (heatmapStartDate) filters.start_date    = heatmapStartDate;
    if (heatmapEndDate)   filters.end_date      = heatmapEndDate;

    try {
      // Fetch heatmap points and hotspot clusters in parallel
      const [heatRes, spotsRes] = await Promise.all([
        getHeatmapData(filters),
        getHotspots(filters),
      ]);

      // Unwrap the heatmap envelope: { heatmap_data: { points: [...] } }
      const heatInner = heatRes?.heatmap_data ?? heatRes;
      renderHeatmapPoints(mapInstance.current, heatInner);

      // Unwrap hotspot response: { hotspots: [...] } or raw array
      const rawSpots = spotsRes?.hotspots ?? spotsRes ?? [];
      setHotspots(
        rawSpots
          .map(s => ({
            location   : s.suburb       || 'Unknown Area',
            crimeType  : s.area         || 'Unknown',
            incidents  : s.incident_count ?? 0,
            risk       : s.risk_level   ?? 'Low',
            lat        : s.centre_lat,
            lng        : s.centre_lng,
            bearing    : cardinalBearing(s.centre_lat, s.centre_lng),
          }))
          .sort((a, b) => b.incidents - a.incidents)
      );
    } catch (e) {
      console.error('[Dashboard] fetchHeatmap error:', e);
    } finally {
      setHeatmapLoading(false);
    }
  }, [heatmapCrimeType, heatmapStartDate, heatmapEndDate, renderHeatmapPoints]);

  /* ─────────────────────────────────────────────────────────────────────────
   * fetchTimeSeries
   * Fetches and renders the line chart for the current TS filter state.
   * Also updates the tsData state so the data table can be derived from it.
   * ───────────────────────────────────────────────────────────────────────── */
  const fetchTimeSeries = useCallback(async () => {
    setTsLoading(true);

    const filters = { freq: tsFreq };
    if (tsCrimeType)  filters.crime_type_id = tsCrimeType;
    if (tsStartDate)  filters.start_date    = tsStartDate;
    if (tsEndDate)    filters.end_date      = tsEndDate;

    try {
      const ts       = await getTimeSeries(filters);
      const tsInner  = ts?.timeseries ?? ts;
      const labels   = tsInner?.labels   ?? tsInner?.dates   ?? [];
      const observed = tsInner?.observed ?? [];
      const trend    = tsInner?.trend    ?? [];

      setTsData({ labels, observed, trend });

      // Rebuild the line chart
      destroyChart(lineChartInstance);
      if (lineChartRef.current && labels.length) {
        // Format labels compactly: "2024-06-10" → "06-10" (weekly/daily) or "2024-06" (monthly)
        const shortLabels = labels.map(d => {
          if (!d) return '';
          return tsFreq === 'M' ? d.slice(0, 7) : d.slice(5);
        });

        lineChartInstance.current = new Chart(lineChartRef.current, {
          type: 'line',
          data: {
            labels: shortLabels,
            datasets: [
              {
                label          : 'Observed',
                data           : observed,
                borderColor    : '#1565C0',
                backgroundColor: 'rgba(21,101,192,0.08)',
                borderWidth    : 2,
                pointRadius    : 3,
                fill           : true,
                tension        : 0.35,
              },
              // Overlay the statistical trend line when available
              ...(trend && trend.some(v => v !== null) ? [{
                label          : 'Trend',
                data           : trend,
                borderColor    : '#c0392b',
                backgroundColor: 'transparent',
                borderWidth    : 2,
                borderDash     : [5, 3],
                pointRadius    : 0,
                fill           : false,
                tension        : 0.35,
              }] : []),
            ],
          },
          options: {
            responsive        : true,
            maintainAspectRatio: false,
            interaction       : { mode: 'index', intersect: false },
            plugins: {
              legend : { display: true, position: 'top', labels: { font: { size: 10 }, boxWidth: 10 } },
              tooltip: { callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw ?? '—'}`,
              }},
            },
            scales: {
              x: {
                ticks: { font: { size: 9 }, maxTicksLimit: 12, maxRotation: 45 },
                grid : { display: false },
              },
              y: {
                beginAtZero: true,
                ticks: { font: { size: 10 } },
                grid : { color: '#f0f2f5' },
                title: { display: true, text: 'Incident Count', font: { size: 10 } },
              },
            },
          },
        });
      } else if (lineChartRef.current) {
        // No data — draw a placeholder message directly on the canvas
        const ctx = lineChartRef.current.getContext('2d');
        ctx.clearRect(0, 0, lineChartRef.current.width, lineChartRef.current.height);
        ctx.fillStyle   = '#adb5bd';
        ctx.font        = '13px Inter, sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText(
          'No trend data for the selected period',
          lineChartRef.current.width  / 2,
          lineChartRef.current.height / 2,
        );
      }
    } catch (e) {
      console.error('[Dashboard] fetchTimeSeries error:', e);
    } finally {
      setTsLoading(false);
    }
  }, [tsFreq, tsCrimeType, tsStartDate, tsEndDate]);

  /* ─────────────────────────────────────────────────────────────────────────
   * buildCharts
   * Initial full-dashboard data load: KPI, bar, pie, doughnut, heatmap, TS.
   * Called once on mount and on the global Refresh button.
   * ───────────────────────────────────────────────────────────────────────── */
  const buildCharts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch summary and crime-type list in parallel first
      const [sum, types] = await Promise.all([
        getDashboardSummary(),
        getCrimeTypes(),
      ]);
      setSummary(sum);
      setCrimeTypes(types);

      /* ── Bar chart: incidents by crime type ─────────────────────────────── */
      destroyChart(barChartInstance);
      if (barChartRef.current) {
        const topTypes = sum?.top_crime_types
          ?.map(t => ({ name: t.crime_type__name ?? t.name, count: t.count ?? 0 }))
          ?? types.map(t => ({ name: t.name, count: t.incident_count ?? 0 }));

        barChartInstance.current = new Chart(barChartRef.current, {
          type: 'bar',
          data: {
            labels  : topTypes.map(t => t.name),
            datasets: [{
              label          : 'Incidents',
              data           : topTypes.map(t => t.count),
              backgroundColor: CHART_COLOURS.map(c => c + 'CC'),
              borderColor    : CHART_COLOURS,
              borderWidth    : 1,
              borderRadius   : 4,
            }],
          },
          options: {
            responsive        : true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales : {
              x: { ticks: { font: { size: 10 } }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f0f2f5' } },
            },
          },
        });
      }

      /* ── Pie chart: status breakdown ────────────────────────────────────── */
      destroyChart(pieChartInstance);
      if (pieChartRef.current) {
        const statuses = sum?.by_status ?? {};
        pieChartInstance.current = new Chart(pieChartRef.current, {
          type: 'pie',
          data: {
            labels  : Object.keys(statuses),
            datasets: [{
              data           : Object.values(statuses),
              backgroundColor: ['#1565C0CC','#f0b429CC','#1e8449CC','#c0392bCC'],
              borderColor    : ['#1565C0',  '#f0b429',  '#1e8449',  '#c0392b'],
              borderWidth    : 1,
            }],
          },
          options: {
            responsive        : true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10, boxWidth: 10 } },
            },
          },
        });
      }

      /* ── Doughnut chart: recency breakdown ──────────────────────────────── */
      destroyChart(doughnutChartInstance);
      if (doughnutChartRef.current) {
        const last7  = sum?.last_7_days  ?? 0;
        const last30 = sum?.last_30_days ?? 0;
        const older  = Math.max(0, (sum?.total_incidents ?? 0) - last30);
        doughnutChartInstance.current = new Chart(doughnutChartRef.current, {
          type: 'doughnut',
          data: {
            labels  : ['Last 7 days', 'Last 8–30 days', 'Older'],
            datasets: [{
              data           : [last7, Math.max(0, last30 - last7), older],
              backgroundColor: ['#1565C0CC','#f0b429CC','#dee2e6'],
              borderColor    : ['#1565C0',  '#f0b429',  '#dee2e6'],
              borderWidth    : 1,
            }],
          },
          options: {
            responsive        : true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8, boxWidth: 10 } },
            },
          },
        });
      }

      /* ── Initialise Leaflet map (once only) ─────────────────────────────── */
      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = L.map(mapRef.current).setView([-17.8292, 31.0522], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom    : 19,
        }).addTo(mapInstance.current);
      }

    } catch (err) {
      setError('Could not load dashboard data. Please check the API connection.');
      console.error('[Dashboard]', err);
    } finally {
      setLoading(false);
    }

    // Fire the heatmap and time-series fetches after the core charts are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Re-fetch heatmap whenever its filters change ─────────────────────── */
  useEffect(() => {
    // Only trigger if the map has been initialised
    if (mapInstance.current) fetchHeatmap();
  }, [fetchHeatmap]);

  /* ── Re-fetch time series whenever its filters change ─────────────────── */
  useEffect(() => {
    fetchTimeSeries();
  }, [fetchTimeSeries]);

  /* ── Initial load + cleanup ────────────────────────────────────────────── */
  useEffect(() => {
    buildCharts();
    return () => {
      destroyChart(barChartInstance);
      destroyChart(pieChartInstance);
      destroyChart(doughnutChartInstance);
      destroyChart(lineChartInstance);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [buildCharts]);

  /* ── Trigger heatmap fetch once the map DOM node is available ────────── */
  useEffect(() => {
    if (mapInstance.current) fetchHeatmap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────────────────────────────────────────────────────────────────
   * Hotspot table — sorted version derived from state
   * ───────────────────────────────────────────────────────────────────────── */
  const sortedHotspots = useMemo(() => {
    const copy = [...hotspots];
    copy.sort((a, b) => {
      // Numeric columns
      if (heatmapSortKey === 'incidents') {
        return heatmapSortDir === 'desc'
          ? b.incidents - a.incidents
          : a.incidents - b.incidents;
      }
      // String columns
      const aVal = String(a[heatmapSortKey] ?? '').toLowerCase();
      const bVal = String(b[heatmapSortKey] ?? '').toLowerCase();
      return heatmapSortDir === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
    return copy;
  }, [hotspots, heatmapSortKey, heatmapSortDir]);

  const toggleHeatmapSort = (key) => {
    if (heatmapSortKey === key) {
      setHeatmapSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setHeatmapSortKey(key);
      setHeatmapSortDir('desc');
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
   * Time-series data table — computed from tsData with moving average,
   * % change, and plain-English interpretation columns.
   * ───────────────────────────────────────────────────────────────────────── */
  const tsTableRows = useMemo(() => {
    const { labels, observed, trend } = tsData;
    if (!labels.length) return [];

    const mavg = movingAverage(observed, 4);

    // Build an array of row objects in chronological order
    const rows = labels.map((label, i) => {
      const obs  = observed[i] ?? 0;
      const prev = i > 0 ? observed[i - 1] : null;
      const pct  = percentChange(prev, obs);

      return {
        label,
        observed    : obs,
        trend       : trend[i] !== null && trend[i] !== undefined ? parseFloat((trend[i] ?? 0).toFixed(1)) : null,
        movingAvg   : mavg[i],
        pctChange   : pct,
        interpretation: trendInterpretation(obs, mavg[i], prev),
      };
    });

    // Allow the user to reverse chronological order
    return tsSortDir === 'asc' ? rows : [...rows].reverse();
  }, [tsData, tsSortDir]);

  /* ── Time-series statistical summary ─────────────────────────────────── */
  const tsSummary = useMemo(() => {
    const obs = tsData.observed.filter(v => v !== null && v !== undefined);
    if (!obs.length) return null;
    const total   = obs.reduce((s, v) => s + v, 0);
    const peak    = Math.max(...obs);
    const avg     = (total / obs.length).toFixed(1);
    const first   = obs[0] ?? 0;
    const last    = obs[obs.length - 1] ?? 0;
    const dirText = last > first * 1.05 ? '↑ Rising'
                  : last < first * 0.95 ? '↓ Falling'
                  : '→ Stable';
    const dirCls  = last > first * 1.05 ? 'text-danger'
                  : last < first * 0.95 ? 'text-success'
                  : 'text-muted';
    return { total, peak, avg, dirText, dirCls };
  }, [tsData]);

  /* ─────────────────────────────────────────────────────────────────────────
   * Sort icon helper — renders the appropriate Bootstrap Icon for a table
   * header based on whether it is the active sort column.
   * ───────────────────────────────────────────────────────────────────────── */
  const SortIcon = ({ col, activeCol, dir }) =>
    activeCol === col
      ? <i className={`bi bi-sort-${dir === 'asc' ? 'up' : 'down'} ms-1`} />
      : <i className="bi bi-arrow-down-up ms-1 text-muted opacity-50" style={{ fontSize: '0.7rem' }} />;

  /* ─────────────────────────────────────────────────────────────────────────
   * RENDER
   * ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="topbar container-fluid p-0">

      {/* ── Sticky page header ──────────────────────────────────────────── */}
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
          {loading ? 'Refreshing…' : 'Refresh All'}
        </button>
      </PageTopBar>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="page-content">

        {error && (
          <div className="alert alert-warning alert-dismissible mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        {/* ── KPI row ───────────────────────────────────────────────────── */}
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

        {/* ════════════════════════════════════════════════════════════════
            CRIME DENSITY HEATMAP  (enhanced with filters + data table)
        ════════════════════════════════════════════════════════════════ */}
        <CrimeDensityHeatmap />

        {/* ════════════════════════════════════════════════════════════════
            TIME SERIES TREND CHART  (enhanced with filters + data table)
        ════════════════════════════════════════════════════════════════ */}
        <div className="card shadow-sm mb-4">
          <div className="card-header card-header-accent-dark d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span>
              <i className="bi bi-graph-up me-2"></i>
              Crime Trend Analysis
              {tsLoading && <Spinner />}
            </span>

            {/* ── Time series filter controls ──────────────────────────── */}
            <div className="d-flex gap-2 flex-wrap align-items-center">

              {/* Frequency toggle */}
              <div className="btn-group btn-group-sm">
                {[['D','Daily'],['W','Weekly'],['M','Monthly']].map(([code, label]) => (
                  <button
                    key={code}
                    className={`btn ${tsFreq === code ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    onClick={() => setTsFreq(code)}
                    disabled={tsLoading}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Crime type */}
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto', fontSize: '0.78rem' }}
                value={tsCrimeType}
                onChange={e => setTsCrimeType(e.target.value)}
                disabled={tsLoading}
              >
                <option value="">All crime types</option>
                {crimeTypes.map(ct => (
                  <option key={ct.id} value={ct.id}>{ct.name}</option>
                ))}
              </select>

              {/* Date range */}
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 140, fontSize: '0.78rem' }}
                value={tsStartDate}
                onChange={e => setTsStartDate(e.target.value)}
                disabled={tsLoading}
                title="Series start date"
              />
              <span className="text-muted small">→</span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 140, fontSize: '0.78rem' }}
                value={tsEndDate}
                onChange={e => setTsEndDate(e.target.value)}
                disabled={tsLoading}
                title="Series end date"
              />

              {/* Clear filters */}
              {(tsCrimeType || tsStartDate || tsEndDate) && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => { setTsCrimeType(''); setTsStartDate(''); setTsEndDate(''); }}
                  title="Clear series filters"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}

              {/* Chronological sort toggle for the table */}
              <button
                className="btn btn-sm btn-outline-secondary ms-1"
                title={`Sort table ${tsSortDir === 'asc' ? 'newest first' : 'oldest first'}`}
                onClick={() => setTsSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              >
                <i className={`bi bi-sort-${tsSortDir === 'asc' ? 'down' : 'up'}`}></i>
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* ── Line chart ──────────────────────────────────────────── */}
            <div style={{ height: 260, position: 'relative' }}>
              <canvas ref={lineChartRef} />
            </div>

            {/* ── Statistical summary strip below the chart ────────────── */}
            {tsSummary && (
              <div className="mt-3 d-flex gap-4 flex-wrap border rounded p-2 bg-light" style={{ fontSize: '0.8rem' }}>
                <div>
                  <span className="text-muted">Total incidents: </span>
                  <strong>{tsSummary.total}</strong>
                </div>
                <div>
                  <span className="text-muted">Peak period: </span>
                  <strong>{tsSummary.peak}</strong>
                </div>
                <div>
                  <span className="text-muted">Average / period: </span>
                  <strong>{tsSummary.avg}</strong>
                </div>
                <div>
                  <span className="text-muted">Overall trend: </span>
                  <strong className={tsSummary.dirCls}>{tsSummary.dirText}</strong>
                </div>
                <div className="ms-auto text-muted" style={{ fontSize: '0.72rem' }}>
                  <i className="bi bi-info-circle me-1"></i>
                  Dashed red line = statistical trend component (seasonal decomposition)
                </div>
              </div>
            )}

            {/* ── Time-series data table ───────────────────────────────── */}
            {tsTableRows.length > 0 && (
              <div className="mt-3">
                <h6 className="fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-table me-2 text-primary"></i>
                  Period Detail Table
                  <span className="text-muted fw-normal ms-2" style={{ fontSize: '0.75rem' }}>
                    — What the trend is showing
                  </span>
                </h6>
                <p className="text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                  <strong>4-Period MA</strong> smooths short-term noise to reveal the underlying pattern.
                  <strong> % Change</strong> compares each period to the previous one.
                  The <strong>Interpretation</strong> column translates statistical values into actionable operational language.
                </p>

                <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        <th>Period</th>
                        <th className="text-end">Observed</th>
                        <th className="text-end">Trend</th>
                        <th className="text-end">4-Period MA</th>
                        <th className="text-end">% Change</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tsTableRows.map((row, i) => (
                        <tr key={i}>
                          <td className="font-monospace" style={{ fontSize: '0.78rem' }}>{row.label}</td>
                          <td className="text-end fw-semibold">{row.observed}</td>
                          <td className="text-end text-muted" style={{ fontSize: '0.78rem' }}>
                            {row.trend ?? '—'}
                          </td>
                          <td className="text-end text-muted" style={{ fontSize: '0.78rem' }}>
                            {row.movingAvg ?? '—'}
                          </td>
                          <td className={`text-end ${row.pctChange.cls}`} style={{ fontSize: '0.78rem' }}>
                            {row.pctChange.text}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#495057' }}>
                            {row.interpretation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Interpretation legend */}
                <div className="mt-2 d-flex gap-3 flex-wrap" style={{ fontSize: '0.72rem', color: '#6c757d' }}>
                  <span><strong className="text-danger">Red % change</strong> = &gt; 5 % increase (alert)</span>
                  <span><strong className="text-success">Green % change</strong> = &gt; 5 % decrease (positive)</span>
                  <span>4-Period MA is unavailable for the first 3 periods (insufficient history)</span>
                </div>
              </div>
            )}

            {!tsLoading && tsTableRows.length === 0 && (
              <p className="text-muted text-center mt-3 mb-0 small">
                No data available for the selected filters. Try widening the date range.
              </p>
            )}
          </div>
        </div>

        {/* ── Lower charts row ─────────────────────────────────────────── */}
        <div className="row g-3 mb-4">

          {/* Incidents by type */}
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-dark d-flex align-items-center justify-content-between">
                <span><i className="bi bi-bar-chart me-2"></i>Incidents by Type</span>
                <span className="badge badge-reported" style={{ fontSize: '0.65rem' }}>Live</span>
              </div>
              <div className="card-body">
                <div style={{ height: 200, position: 'relative' }}>
                  <canvas ref={barChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="col-md-3">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-dark">
                <i className="bi bi-pie-chart me-2"></i>Case Status
              </div>
              <div className="card-body">
                <div style={{ height: 200, position: 'relative' }}>
                  <canvas ref={pieChartRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity doughnut */}
          <div className="col-md-3">
            <div className="card shadow-sm h-100">
              <div className="card-header card-header-accent-dark">
                <i className="bi bi-clock-history me-2"></i>Recency
              </div>
              <div className="card-body">
                <div style={{ height: 200, position: 'relative' }}>
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