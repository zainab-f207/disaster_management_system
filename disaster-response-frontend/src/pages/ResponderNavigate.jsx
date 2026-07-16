import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import api, { disasterApi } from '../services/api';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const myIcon = L.divIcon({ html: '<div style="font-size:26px">🚑</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
const destIcon = L.divIcon({ html: '<div style="width:18px;height:18px;border-radius:50%;background:#e53e3e;border:3px solid #fff;box-shadow:0 0 10px #e53e3e"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });

function Recenter({ pos }) {
    const map = useMap();
    useEffect(() => { if (pos) map.setView(pos, Math.max(map.getZoom(), 14)); }, [pos, map]);
    return null;
}

// ── OSRM helpers ─────────────────────────────────────────────────────────────
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

async function fetchRoutes(startLat, startLon, endLat, endLon) {
    const url = `${OSRM_BASE}/${startLon},${startLat};${endLon},${endLat}` +
        `?alternatives=true&overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM request failed');
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found');
    return data.routes.map(r => ({
        distanceKm: r.distance / 1000,
        durationMin: r.duration / 60,
        // GeoJSON is [lon, lat] — Leaflet wants [lat, lon]
        coordinates: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    }));
}

/** Returns how many km of a route pass within radiusKm of any hazard zone. */
function hazardOverlapKm(routeCoords, hazards) {
    let overlap = 0;
    for (let i = 0; i < routeCoords.length; i += 3) { // sample every 3rd point for speed
        const [lat, lon] = routeCoords[i];
        for (const h of hazards) {
            if (distanceKm(lat, lon, h.latitude, h.longitude) <= (h.affectedAreaRadiusKm || 3)) {
                overlap += 0.3; // rough per-sample penalty
                break;
            }
        }
    }
    return overlap;
}

export default function ResponderNavigate() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const [assignment, setAssignment] = useState(null);
    const [myPos, setMyPos] = useState(null);
    const [error, setError] = useState('');
    const [routes, setRoutes] = useState([]);
    const [chosenRoute, setChosenRoute] = useState(null);
    const [hazards, setHazards] = useState([]);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState('');
    const lastSentRef = useRef(0);
    const lastRouteFetchRef = useRef(null);
    const watchIdRef = useRef(null);

    useEffect(() => {
        api.get(`/assignments/${assignmentId}`)
            .then(res => setAssignment(res.data))
            .catch(() => setError('Could not load assignment.'));
    }, [assignmentId]);

    // Load active hazard zones (all other active disasters) to avoid
    useEffect(() => {
        if (!assignment) return;
        disasterApi.getAll()
            .then(res => {
                const active = (res.data || []).filter(d =>
                    !['Resolved', 'FalseAlarm', 'Closed', 'AlertExpired'].includes(d.status) &&
                    d.id !== assignment.disasterId // don't treat our own destination as a hazard to avoid
                );
                setHazards(active);
            })
            .catch(() => setHazards([]));
    }, [assignment]);

    useEffect(() => {
        if (!navigator.geolocation) { setError('Geolocation not supported on this device.'); return; }
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setMyPos([latitude, longitude]);
                const now = Date.now();
                if (now - lastSentRef.current > 15000) {
                    lastSentRef.current = now;
                    api.put(`/assignments/${assignmentId}/location`, { latitude, longitude }).catch(() => { });
                }
            },
            () => setError('Could not access your location. Enable GPS permissions.'),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
        return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
    }, [assignmentId]);

    // Fetch/re-fetch routes when we have both a position and destination
    // (re-fetch only if position moved >300m to avoid hammering the free OSRM server)
    const loadRoutes = useCallback(async (lat, lon) => {
        if (!assignment) return;
        setRouteLoading(true);
        setRouteError('');
        try {
            const results = await fetchRoutes(lat, lon, assignment.disasterLat, assignment.disasterLon);
            setRoutes(results);

            // Score each route by hazard overlap, pick the safest
            const scored = results.map(r => ({
                ...r,
                hazardKm: hazardOverlapKm(r.coordinates, hazards),
            })).sort((a, b) => a.hazardKm - b.hazardKm || a.distanceKm - b.distanceKm);

            setChosenRoute(scored[0]);
            lastRouteFetchRef.current = [lat, lon];
        } catch {
            setRouteError('Could not calculate a route right now (routing service unavailable). Showing direct line instead.');
            setRoutes([]);
            setChosenRoute(null);
        } finally {
            setRouteLoading(false);
        }
    }, [assignment, hazards]);

    useEffect(() => {
        if (!myPos || !assignment) return;
        const last = lastRouteFetchRef.current;
        if (!last || distanceKm(last[0], last[1], myPos[0], myPos[1]) > 0.3) {
            loadRoutes(myPos[0], myPos[1]);
        }
    }, [myPos, assignment, loadRoutes]);

    if (!assignment) {
        return <div style={{ padding: '88px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>{error || 'Loading assignment…'}</div>;
    }

    const dist = chosenRoute?.distanceKm ?? (myPos ? distanceKm(myPos[0], myPos[1], assignment.disasterLat, assignment.disasterLon) : null);
    const eta = chosenRoute?.durationMin
        ? Math.round(chosenRoute.durationMin)
        : (dist ? Math.round((dist / 40) * 60) : null);

    const isHazardFree = chosenRoute && chosenRoute.hazardKm === 0;
    const hasHazardWarning = chosenRoute && chosenRoute.hazardKm > 0;

    return (
        <div style={{ paddingTop: '64px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                        🧭 Navigate to Disaster #{assignment.disasterId} ({assignment.disasterType})
                    </div>
                    {error && <div style={{ fontSize: '12px', color: '#e53e3e' }}>{error}</div>}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {routeLoading ? 'Calculating safest route…' :
                            dist != null ? `${dist.toFixed(1)} km · ~${eta} min` : ''}
                    </div>
                </div>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface-2)', cursor: 'pointer' }}>Back</button>
            </div>

            {routeError && (
                <div style={{ padding: '8px 18px', background: 'rgba(214,158,46,0.1)', color: '#d69e2e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={13} /> {routeError}
                </div>
            )}
            {hasHazardWarning && (
                <div style={{ padding: '8px 18px', background: 'rgba(229,62,62,0.1)', color: '#e53e3e', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={13} /> This route still passes near {chosenRoute.hazardKm > 0.6 ? 'a large' : 'a small'} hazard zone — proceed with caution. No fully clear route was available.
                </div>
            )}
            {isHazardFree && !routeLoading && (
                <div style={{ padding: '8px 18px', background: 'rgba(56,161,105,0.08)', color: '#38a169', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={13} /> Route avoids all currently active hazard zones.
                </div>
            )}

            <div style={{ flex: 1 }}>
                <MapContainer center={myPos || [assignment.disasterLat, assignment.disasterLon]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {myPos && <Recenter pos={myPos} />}
                    {myPos && (
                        <Marker position={myPos} icon={myIcon}>
                            <Popup>Your Location</Popup>
                        </Marker>
                    )}
                    <Marker position={[assignment.disasterLat, assignment.disasterLon]} icon={destIcon}>
                        <Popup>Disaster Location</Popup>
                    </Marker>

                    {/* Hazard zones to avoid */}
                    {hazards.map(h => (
                        <Circle
                            key={h.id}
                            center={[h.latitude, h.longitude]}
                            radius={(h.affectedAreaRadiusKm || 1.5) * 1000}
                            pathOptions={{ color: '#e53e3e', fillColor: '#e53e3e', fillOpacity: 0.12, weight: 1.5, dashArray: '6' }}
                        />
                    ))}

                    {/* Real routed path if available, otherwise fallback straight line */}
                    {chosenRoute ? (
                        <Polyline
                            positions={chosenRoute.coordinates}
                            pathOptions={{ color: isHazardFree ? '#38a169' : '#dd6b20', weight: 5, opacity: 0.85 }}
                        />
                    ) : (
                        myPos && <Polyline positions={[myPos, [assignment.disasterLat, assignment.disasterLon]]} pathOptions={{ color: '#4299e1', weight: 4, dashArray: '8 8' }} />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}