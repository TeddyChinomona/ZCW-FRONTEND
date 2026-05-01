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
 * • Semi-transparent gradient (rgba colours) so the basemap tiles remain
 * fully visible underneath the heat overlay.
 * • Canvas opacity set to 0.65 for a second transparency control layer.
 * • Dynamic heatmap circle radius that scales with zoom level.
 * • CircleMarker fallback when leaflet.heat plugin is not available.
 * • High Concentration Areas table with severity badges and progress bars,
 * derived entirely from the already-fetched heatmap data — no extra API call.
 * • Reverse Geocoding to resolve raw KDE coordinates into readable street names,
 * staggered to respect OpenStreetMap (Nominatim) rate limits.
 *
 * Usage:
 * import CrimeDensityHeatmap from './home_components/CrimeDensityHeatmap';
 * <CrimeDensityHeatmap />
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
const intensitySeverity = (intensity) => {
  if (intensity >= 0.75) return { label: 'Critical', color: '#c0392b', badge: 'bg-danger' };
  if (intensity >= 0.50) return { label: 'High',     color: '#d35400', badge: 'bg-warning text-dark' };
  if (intensity >= 0.25) return { label: 'Medium',   color: '#f0b429', badge: 'bg-info text-dark' };
  return                        { label: 'Low',      color: '#1e8449', badge: 'bg-success' };
};

function CrimeDensityHeatmap() {
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  
  // Top 10 KDE peak points sorted by descending intensity — raw coordinates
  const [topHotPoints, setTopHotPoints] = useState([]);

  // States for the Reverse Geocoding process
  const [resolvedHotPoints, setResolvedHotPoints] = useState([]);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveProgress, setResolveProgress] = useState(0);

  /* DOM node that Leaflet mounts its canvas onto */
  const mapRef = useRef(null);

  /* Mutable refs for live Leaflet instances */
  const mapInstance    = useRef(null);  // L.Map
  const heatLayerGroup = useRef(null);  // active heat layer or fallback marker group

  // ── renderHeatmapPoints ──────────────────────────────────────────────────────
  const renderHeatmapPoints = useCallback((map, rawData) => {
    if (!map || !rawData) return;

    if (heatLayerGroup.current) {
      map.removeLayer(heatLayerGroup.current);
      heatLayerGroup.current = null;
    }
    if (map._heatmapZoomHandler) {
      map.off('zoomend', map._heatmapZoomHandler);
    }

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

    const latLngs = points.map(p => [p.lat, p.lng]);
    if (latLngs.length) map.fitBounds(latLngs, { padding: [30, 30], maxZoom: 14 });

    const getDynamicRadius = (zoom) =>
      Math.max(5, Math.min(100, 20 * Math.pow(2, zoom - 13)));

    if (L.heatLayer) {
      try {
        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity ?? 1]);

        const heatLayer = L.heatLayer(heatPoints, {
          radius:     getDynamicRadius(map.getZoom()),
          blur:       12,    
          maxZoom:    14,
          minOpacity: 0.4,  
          gradient: {
            0.4:  'rgb(2, 2, 255)',    
            0.6:  'rgb(6, 173, 250)',
            0.7:  'rgb(0, 255, 64)',
            0.8:  'rgb(251, 255, 0)',
            1.0:  'rgb(255, 0, 0)'
          },
        }).addTo(map);

        if (heatLayer._canvas) {
          heatLayer._canvas.style.opacity = '0.65'; 
        }

        heatLayerGroup.current = heatLayer;

        const handleZoom = () => {
          if (heatLayerGroup.current) {
            heatLayerGroup.current.setOptions({
              radius: getDynamicRadius(map.getZoom()),
            });
          }
        };
        map.on('zoomend', handleZoom);
        map._heatmapZoomHandler = handleZoom;

      } catch (err) {
        console.warn('leaflet.heat failed, falling back to CircleMarkers:', err);
        const fallbackGroup = L.layerGroup().addTo(map);
        points.forEach(p => {
          L.circleMarker([p.lat, p.lng], {
            radius:      Math.max(4, (p.intensity ?? 0.5) * 12),
            color:       'transparent',
            fillColor:   '#c0392b',
            fillOpacity: Math.max(0.15, Math.min(0.65, (p.intensity ?? 0.5) * 0.7)),
          }).addTo(fallbackGroup);
        });
        heatLayerGroup.current = fallbackGroup;
      }
    }
  }, []);

  // ── fetchAndRender ───────────────────────────────────────────────────────────
  const fetchAndRender = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const heatRes = await getHeatmapData();
      const heatInner = heatRes?.heatmap_data ?? heatRes;

      // ── Derive high concentration points for the table ──────────────────
      let rawPoints = [];
      if (Array.isArray(heatInner)) {
        rawPoints = heatInner.map(p => Array.isArray(p)
          ? { lat: p[0], lng: p[1], intensity: p[2] ?? 0 }
          : p
        );
      } else if (heatInner?.points) {
        rawPoints = heatInner.points;
      }

      // NEW LOGIC: Filter for >= 0.8, then sort descending. 
      // Notice that `.slice()` is completely removed.
      const topPoints = [...rawPoints]
        .filter(p => (p.intensity ?? 0) >= 0.8)
        .sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0));

      setTopHotPoints(topPoints);

      if (!mapInstance.current && mapRef.current) {
        mapInstance.current = L.map(mapRef.current).setView([-17.8292, 31.0522], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance.current);
      }

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

  /* Init map and fetch data */
  useEffect(() => {
    fetchAndRender();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [fetchAndRender]);

  // ── Reverse Geocoding Effect ────────────────────────────────────────────────
  // Watches `topHotPoints` and resolves addresses sequentially to prevent API bans
  useEffect(() => {
    let isMounted = true;

    const processAddresses = async () => {
      setIsResolving(true);
      setResolveProgress(0);
      const resolvedData = [];

      for (let i = 0; i < topHotPoints.length; i++) {
        if (!isMounted) return; // Stop if user navigates away or hits Refresh
        
        const pt = topHotPoints[i];
        let addressName = "Address resolution failed";

        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pt.lat}&lon=${pt.lng}`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'ZimCrimeWatchApp/1.0' }
          });
          console.log('Fetching data: ' + i)
          if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
              addressName = data.display_name.split(',').slice(0, 2).join(', ');
              console.log(addressName)
            }
          }
        } catch (error) {
          console.error("Geocoding error for point", i, error);
        }

        resolvedData.push({ ...pt, address: addressName });
        if (isMounted) setResolveProgress(i + 1);

        // 1-second delay for OpenStreetMap compliance (except on the last item)
        if (i < topHotPoints.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (isMounted) {
        setResolvedHotPoints(resolvedData);
        setIsResolving(false);
      }
    };

    if (topHotPoints.length > 0) {
      processAddresses();
    } else {
      setResolvedHotPoints([]);
      setIsResolving(false);
    }

    return () => {
      isMounted = false; // Cleanup to stop loops and state updates
    };
  }, [topHotPoints]);

  return (
    <div className="card shadow-sm mb-4">

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="card-header card-header-accent-blue d-flex align-items-center justify-content-between">
        <span>
          <i className="bi bi-map me-2"></i>
          Crime Density Heatmap
          <span className="badge badge-investigating ms-2">KDE</span>
          <span className="text-muted ms-3" style={{ fontSize: '0.72rem', fontWeight: 400 }}>
            Heatmap rendered basemap visible underneath
          </span>
          {loading && (
            <span className="spinner-border spinner-border-sm ms-2 text-primary" role="status" />
          )}
        </span>

        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={fetchAndRender}
          disabled={loading || isResolving}
        >
          <i className={`bi bi-arrow-repeat ${(loading || isResolving) ? 'spin' : ''} me-1`}></i>
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
      <div className="card-body p-0">
        <div ref={mapRef} style={{ height: 620, width: '100%' }} />
      </div>

      {/* ── High Concentration Areas table ────────────────────────────────── */}
      {topHotPoints.length > 0 && (
        <div className="card-footer bg-white p-0">
          <div className="px-3 pt-3 pb-1">
            <h6 className="fw-bold text-danger mb-0">
              <i className="bi bi-geo-alt-fill me-2 text-danger"></i>
              High Concentration Areas
              <span className="text-muted fw-normal ms-2" style={{ fontSize: '0.75rem' }}>
                — {topHotPoints.length} Critical Zones (≥ 80% Intensity)
              </span>
            </h6>
          </div>

          {/* Loading UI during geocoding */}
          {isResolving ? (
            <div className="text-center p-4">
              <div className="spinner-border text-primary mb-2" role="status"></div>
              <div className="small fw-semibold text-muted">
                Resolving Addresses ({resolveProgress} of {topHotPoints.length})...
              </div>
            </div>
          ) : (
            /* Resolved Table UI */
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Area</th>
                    <th>Relative Intensity</th>
                    <th>Severity</th>
                    <th style={{ minWidth: 120 }}>Concentration</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedHotPoints.map((pt, i) => {
                    const pct = ((pt.intensity ?? 0) * 100).toFixed(1);
                    const sev = intensitySeverity(pt.intensity ?? 0);

                    return (
                      <tr key={i}>
                        <td className="text-muted fw-semibold align-middle">{i + 1}</td>

                        <td>
                          <div className="fw-bold small text-dark">
                            {pt.address}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Zone Center: {parseFloat(pt.lat).toFixed(4)}, {parseFloat(pt.lng).toFixed(4)}
                          </div>
                          <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-bullseye me-1"></i>
                            ~250m radius
                          </div>
                        </td>

                        <td className="small fw-semibold align-middle">{pct}%</td>

                        <td className="align-middle">
                          <span className={`badge ${sev.badge}`}>
                            {sev.label}
                          </span>
                        </td>

                        <td className="align-middle">
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
          )}
        </div>
      )}
    </div>
  );
}

export default CrimeDensityHeatmap;