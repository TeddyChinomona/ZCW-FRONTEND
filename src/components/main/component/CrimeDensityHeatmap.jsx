/**
 * src/components/main/home_components/CrimeDensityHeatmap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone Crime Density Heatmap component.
 *
 * Renders a semi-transparent KDE heatmap on a Leaflet/OpenStreetMap tile layer,
 * followed by a "High Concentration Areas" table that lists the top 10 peak
 * locations sorted by descending intensity.
 *
 * Features:
 *   • Semi-transparent gradient (rgba colours) so the basemap tiles remain
 *     fully visible underneath the heat overlay.
 *   • Canvas opacity set to 0.65 for a second transparency control layer.
 *   • Dynamic heatmap circle radius that scales with zoom level.
 *   • CircleMarker fallback when leaflet.heat plugin is not available.
 *   • High Concentration Areas table with severity badges and progress bars,
 *     derived entirely from the already-fetched heatmap data — no extra API call.
 *
 * Usage:
 *   import CrimeDensityHeatmap from './home_components/CrimeDensityHeatmap';
 *   <CrimeDensityHeatmap />
 *
 * The component calls GET /api/zrp/analytics/heatmap/ via getHeatmapData()
 * on mount and exposes a manual Refresh button for re-fetching.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { getHeatmapData } from '../../../services/crimeService';

// ─── Map intensity score (0.0–1.0) → severity label, badge class, and hex colour ──
// Used to colour the badge and progress bar in the concentration table so they
// visually match the heatmap gradient stops below.
const intensitySeverity = (intensity) => {
  if (intensity >= 0.75) return { label: 'Critical', color: '#c0392b', badge: 'bg-danger' };
  if (intensity >= 0.50) return { label: 'High',     color: '#d35400', badge: 'bg-warning text-dark' };
  if (intensity >= 0.25) return { label: 'Medium',   color: '#f0b429', badge: 'bg-info text-dark' };
  return                        { label: 'Low',      color: '#1e8449', badge: 'bg-success' };
};

function CrimeDensityHeatmap() {
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  // Top 10 KDE peak points sorted by descending intensity — used for the table
  const [topHotPoints, setTopHotPoints] = useState([]);

  /* DOM node that Leaflet mounts its canvas onto */
  const mapRef = useRef(null);

  /* Mutable refs for live Leaflet instances (not React state so they don't
     trigger re-renders) */
  const mapInstance    = useRef(null);  // L.Map
  const heatLayerGroup = useRef(null);  // active heat layer or fallback marker group

  // ── renderHeatmapPoints ──────────────────────────────────────────────────────
  // Draws the transparent KDE heatmap on the provided Leaflet map instance.
  //
  // Transparency is achieved via two mechanisms:
  //   1. The leaflet.heat `gradient` option uses rgba() colours with alpha < 1.0,
  //      so the OpenStreetMap basemap tiles remain legible beneath the overlay.
  //   2. After layer creation, the internal canvas element's CSS opacity is set
  //      to 0.65 as a second control layer (some browsers need this override).
  //
  // Radius scales exponentially with zoom level so visual density stays
  // proportional to map scale at all zoom levels.
  //
  // Fallback: if leaflet.heat is unavailable, semi-transparent CircleMarkers
  // are rendered using Leaflet core (always available).
  const renderHeatmapPoints = useCallback((map, rawData) => {
    if (!map || !rawData) return;

    // Remove any previously rendered layer and its bound zoom listener
    if (heatLayerGroup.current) {
      map.removeLayer(heatLayerGroup.current);
      heatLayerGroup.current = null;
    }
    if (map._heatmapZoomHandler) {
      map.off('zoomend', map._heatmapZoomHandler);
    }

    // Normalise input to a uniform [{lat, lng, intensity}] array.
    // The backend can return either:
    //   • A flat array: [[lat, lng, intensity], ...]
    //   • An object:    { points: [{lat, lng, intensity}] }
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

    // Fit the map viewport to the bounding box of all data points
    const latLngs = points.map(p => [p.lat, p.lng]);
    if (latLngs.length) map.fitBounds(latLngs, { padding: [30, 30], maxZoom: 14 });

    // Calculate heatmap circle radius proportional to the current zoom level.
    // Base = 20 px at zoom 17 (street level); each zoom step halves or doubles it.
    const getDynamicRadius = (zoom) =>
      Math.max(5, Math.min(100, 20 * Math.pow(2, zoom - 17)));

    if (L.heatLayer) {
      try {
        // Convert to [lat, lng, intensity] tuple format expected by leaflet.heat
        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity ?? 1]);

        // Create the heat layer with a semi-transparent colour gradient.
        // Each rgba() stop has alpha < 1.0 so map tiles remain visible underneath.
        const heatLayer = L.heatLayer(heatPoints, {
          radius:     getDynamicRadius(map.getZoom()),
          blur:       15,
          maxZoom:    17,
          minOpacity: 0.05,   // nearly invisible at lowest density areas
          gradient: {
            0.0:  'rgba(0, 0, 200, 0.0)',    // fully transparent — zero density
            0.25: 'rgba(0, 150, 255, 0.35)', // semi-transparent blue — low density
            0.50: 'rgba(0, 255, 128, 0.50)', // semi-transparent green — medium density
            0.75: 'rgba(255, 200, 0, 0.65)', // amber — high density
            1.0:  'rgba(255, 0, 0, 0.80)',   // red — peak density
          },
        }).addTo(map);

        // Apply additional canvas-level opacity so the basemap remains clear.
        // leaflet.heat sets its own canvas opacity internally; this overrides it.
        if (heatLayer._canvas) {
          heatLayer._canvas.style.opacity = '0.65';
        }

        heatLayerGroup.current = heatLayer;

        // Re-calculate radius whenever the user zooms so visual density remains
        // proportional to map scale at all zoom levels
        const handleZoom = () => {
          if (heatLayerGroup.current) {
            heatLayerGroup.current.setOptions({
              radius: getDynamicRadius(map.getZoom()),
            });
          }
        };
        map.on('zoomend', handleZoom);
        // Store the handler reference so we can remove it on the next render
        map._heatmapZoomHandler = handleZoom;

      } catch (err) {
        // leaflet.heat plugin failed (e.g. not loaded) — fall back to
        // semi-transparent CircleMarkers which are part of Leaflet core
        console.warn('leaflet.heat failed, falling back to CircleMarkers:', err);
        const fallbackGroup = L.layerGroup().addTo(map);
        points.forEach(p => {
          L.circleMarker([p.lat, p.lng], {
            radius:      Math.max(4, (p.intensity ?? 0.5) * 12),
            color:       'transparent',
            fillColor:   '#c0392b',
            // Scale fill opacity proportionally so denser areas appear darker
            fillOpacity: Math.max(0.15, Math.min(0.65, (p.intensity ?? 0.5) * 0.7)),
          }).addTo(fallbackGroup);
        });
        heatLayerGroup.current = fallbackGroup;
      }
    }
  }, []);

  // ── fetchAndRender ───────────────────────────────────────────────────────────
  // Fetches heatmap data from the backend, updates the concentration table, and
  // renders the heat layer. Called on mount and whenever Refresh is clicked.
  const fetchAndRender = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const heatRes = await getHeatmapData();

      // Unwrap backend envelope: HeatmapView returns { heatmap_data: {...} }
      const heatInner = heatRes?.heatmap_data ?? heatRes;

      // ── Derive top concentration points for the table ──────────────────
      // Normalise raw data, sort by descending intensity, keep the top 10.
      let rawPoints = [];
      if (Array.isArray(heatInner)) {
        rawPoints = heatInner.map(p => Array.isArray(p)
          ? { lat: p[0], lng: p[1], intensity: p[2] ?? 0 }
          : p
        );
      } else if (heatInner?.points) {
        rawPoints = heatInner.points;
      }

      const topPoints = [...rawPoints]
        .sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0))
        .slice(0, 10);
      setTopHotPoints(topPoints);

      // ── Initialise Leaflet map on first render ─────────────────────────
      // The map is only created once; subsequent calls just update the heat layer.
      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = L.map(mapRef.current).setView([-17.8292, 31.0522], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance.current);
      }

      // Render the transparent heatmap layer
      if (mapInstance.current) {
        renderHeatmapPoints(mapInstance.current, heatInner);
      }

    } catch (err) {
      console.error('[CrimeDensityHeatmap]', err);
      setError('Could not load heatmap data. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  }, [renderHeatmapPoints]);

  /* Fetch on mount; remove the Leaflet map instance on unmount to prevent
     memory leaks and "container already initialised" errors on re-mount */
  useEffect(() => {
    fetchAndRender();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [fetchAndRender]);

  return (
    <div className="card shadow-sm mb-4">

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="card-header card-header-accent-blue d-flex align-items-center justify-content-between">
        <span>
          <i className="bi bi-map me-2"></i>
          Crime Density Heatmap
          <span className="badge badge-investigating ms-2">KDE</span>
          {/* Reminder that the basemap is deliberately visible beneath the overlay */}
          <span className="text-muted ms-3" style={{ fontSize: '0.72rem', fontWeight: 400 }}>
            Heatmap rendered with 65% opacity — basemap visible underneath
          </span>
          {loading && (
            <span className="spinner-border spinner-border-sm ms-2 text-primary" role="status" />
          )}
        </span>

        {/* Refresh button — re-fetches heatmap data without a full page reload */}
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={fetchAndRender}
          disabled={loading}
        >
          <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''} me-1`}></i>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* ── Error alert ───────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-warning alert-dismissible m-3 mb-0" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* ── Leaflet map container ─────────────────────────────────────────── */}
      {/* This div must always be present in the DOM — Leaflet attaches its
          canvas here and will throw if the element disappears while the map
          instance still exists. */}
      <div className="card-body p-0">
        <div ref={mapRef} style={{ height: 420, width: '100%' }} />
      </div>

      {/* ── High Concentration Areas table ────────────────────────────────── */}
      {/* Rendered only when KDE data is available. Derived entirely from the
          already-fetched heatmap points — no extra API call is needed.
          Points are pre-sorted by descending intensity so rank 1 = hottest. */}
      {topHotPoints.length > 0 && (
        <div className="card-footer bg-white p-0">

          {/* Table heading */}
          <div className="px-3 pt-3 pb-1">
            <h6 className="fw-bold text-danger mb-0">
              <i className="bi bi-geo-alt-fill me-2 text-danger"></i>
              High Concentration Areas
              <span className="text-muted fw-normal ms-2" style={{ fontSize: '0.75rem' }}>
                — Top {topHotPoints.length} KDE peak locations
              </span>
            </h6>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Relative Intensity</th>
                  <th>Severity</th>
                  <th style={{ minWidth: 120 }}>Concentration</th>
                </tr>
              </thead>
              <tbody>
                {topHotPoints.map((pt, i) => {
                  // Convert 0–1 intensity to a percentage string for the display column
                  const pct = ((pt.intensity ?? 0) * 100).toFixed(1);
                  const sev = intensitySeverity(pt.intensity ?? 0);

                  return (
                    <tr key={i}>
                      <td className="text-muted fw-semibold">{i + 1}</td>

                      {/* Coordinates rounded to 4 d.p. (~11 m precision).
                          The font-monospace class keeps columns aligned. */}
                      <td className="font-monospace small">
                        {parseFloat(pt.lat).toFixed(4)}
                      </td>
                      <td className="font-monospace small">
                        {parseFloat(pt.lng).toFixed(4)}
                      </td>

                      <td className="small fw-semibold">{pct}%</td>

                      {/* Severity badge — colour matches the heatmap gradient tier */}
                      <td>
                        <span className={`badge ${sev.badge}`}>
                          {sev.label}
                        </span>
                      </td>

                      {/* Progress bar — width = intensity %, colour = severity colour */}
                      <td>
                        <div className="progress" style={{ height: 8 }}>
                          <div
                            className="progress-bar"
                            style={{
                              width:           `${pct}%`,
                              backgroundColor: sev.color,
                              transition:      'width 0.5s ease',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrimeDensityHeatmap;
