import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { disasterApi } from '../services/api';
import { AlertTriangle, ShieldCheck, Navigation, X, Search, Locate } from 'lucide-react';

// Direct Nominatim geocoding — no backend needed
async function nominatimSearch(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=pk&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'PakistanDRS/1.0' } });
    if (!res.ok) throw new Error('Nominatim failed');
    const data = await res.json();
    return data.map(item => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
    }));
}

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

async function fetchRoutes(startLat, startLon, endLat, endLon) {
    const url = `${OSRM_BASE}/${startLon},${startLat};${endLon},${endLat}?alternatives=true&overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM failed');
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route');
    return data.routes.map(r => ({
        distanceKm: r.distance / 1000,
        durationMin: r.duration / 60,
        coordinates: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    }));
}

function hazardOverlapKm(routeCoords, hazards) {
    let overlap = 0;
    for (let i = 0; i < routeCoords.length; i += 3) {
        const [lat, lon] = routeCoords[i];
        for (const h of hazards) {
            if (distanceKm(lat, lon, h.latitude, h.longitude) <= (h.affectedAreaRadiusKm || 1.5)) { overlap += 0.3; break; }
        }
    }
    return overlap;
}

// Pulsing "you are here" marker — moves live during navigation
const liveIcon = L.divIcon({
    html: `<div style="position:relative;width:26px;height:26px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:#3182ce;opacity:0.35;animation:pulse-ring 1.8s ease-out infinite;"></div>
    <div style="position:absolute;top:6px;left:6px;width:14px;height:14px;border-radius:50%;background:#3182ce;border:3px solid #fff;box-shadow:0 0 8px #3182ce;"></div>
  </div>`,
    className: '', iconSize: [26, 26], iconAnchor: [13, 13],
});
const searchIcon = L.divIcon({ html: '<div style="font-size:24px">📍</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 28] });
const destIcon = L.divIcon({
    html: `<div style="position:relative;width:34px;height:44px;">
    <svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 27 17 27s17-14.3 17-27C34 7.6 26.4 0 17 0z" fill="#e53e3e"/><circle cx="17" cy="17" r="7" fill="#fff"/></svg>
  </div>`,
    className: '', iconSize: [34, 44], iconAnchor: [17, 44],
});

function Recenter({ pos, zoom }) {
    const map = useMap();
    useEffect(() => { if (pos) map.setView(pos, zoom || Math.max(map.getZoom(), 15), { animate: true }); }, [pos, map]);
    return null;
}

function LocationSearch({ label, value, onChange, onSelect, autoFocus }) {
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const timer = useRef(null);

    // Special non-geocodable placeholder values set by handleLocateMe
    const SKIP_GEOCODE = ['Locating...', '📍 My Current Location'];

    useEffect(() => {
        clearTimeout(timer.current);
        if (!value || value.length < 3 || SKIP_GEOCODE.includes(value)) { setResults([]); return; }
        timer.current = setTimeout(async () => {
            try {
                const data = await nominatimSearch(value);
                setResults(data);
                setOpen(true);
            } catch { setResults([]); }
        }, 400); // Slightly longer debounce to respect Nominatim rate limits
        return () => clearTimeout(timer.current);
    }, [value]);

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '10px 12px' }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                    autoFocus={autoFocus}
                    value={value}
                    onChange={e => { onChange(e.target.value); setOpen(true); }}
                    onFocus={() => results.length && setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 200)}
                    placeholder={label}
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }}
                />
            </div>
            {open && results.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 2000, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
                    {results.map((r, i) => (
                        <div key={i} onMouseDown={() => onSelect(r)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '12px', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--text-primary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-subtle)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            📍 {r.displayName}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CitizenSafeRoute() {
    const navigate = useNavigate();
    const [hazards, setHazards] = useState([]);

    const [sourceQuery, setSourceQuery] = useState('');
    const [destQuery, setDestQuery] = useState('');
    const [sourcePos, setSourcePos] = useState(null);
    const [destPos, setDestPos] = useState(null);

    const [chosenRoute, setChosenRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState('');

    const [navigating, setNavigating] = useState(false); // true once "Start Navigation" pressed
    const watchIdRef = useRef(null);
    const lastRouteFetchRef = useRef(null);

    useEffect(() => {
        disasterApi.getAll()
            .then(res => setHazards((res.data || []).filter(d => !['Resolved', 'FalseAlarm', 'Closed', 'AlertExpired'].includes(d.status))))
            .catch(() => setHazards([]));
    }, []);

    const handleLocateMe = () => {
        if (!navigator.geolocation) return;
        setSourceQuery('Locating...');
        navigator.geolocation.getCurrentPosition(pos => {
            setSourcePos([pos.coords.latitude, pos.coords.longitude]);
            setSourceQuery('📍 My Current Location');
        }, () => { setSourceQuery(''); setRouteError('Could not get your location.'); });
    };

    const loadRoutes = useCallback(async (lat, lon, dLat, dLon) => {
        setRouteLoading(true);
        setRouteError('');
        try {
            const results = await fetchRoutes(lat, lon, dLat, dLon);
            const scored = results.map(r => ({ ...r, hazardKm: hazardOverlapKm(r.coordinates, hazards) }))
                .sort((a, b) => a.hazardKm - b.hazardKm || a.distanceKm - b.distanceKm);
            setChosenRoute(scored[0]);
            lastRouteFetchRef.current = [lat, lon];
        } catch {
            setRouteError('Could not calculate a route. Try again.');
            setChosenRoute(null);
        } finally {
            setRouteLoading(false);
        }
    }, [hazards]);

    // Recalculate whenever both points are set (preview mode)
    useEffect(() => {
        if (sourcePos && destPos && !navigating) loadRoutes(sourcePos[0], sourcePos[1], destPos[0], destPos[1]);
    }, [sourcePos, destPos, navigating, loadRoutes]);

    const startNavigation = () => {
        if (!sourcePos || !destPos) return;
        setNavigating(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
            pos => {
                const p = [pos.coords.latitude, pos.coords.longitude];
                setSourcePos(p);
                const last = lastRouteFetchRef.current;
                // Re-route only if drifted >150m off the last calculated start point
                if (!last || distanceKm(last[0], last[1], p[0], p[1]) > 0.15) {
                    loadRoutes(p[0], p[1], destPos[0], destPos[1]);
                }
            },
            () => setRouteError('Lost GPS signal.'),
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
        );
    };

    const stopNavigation = () => {
        setNavigating(false);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    };

    useEffect(() => () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

    const isHazardFree = chosenRoute && chosenRoute.hazardKm === 0;
    const hasHazardWarning = chosenRoute && chosenRoute.hazardKm > 0;
    const readyToStart = sourcePos && destPos && chosenRoute && !navigating;

    return (
        <div style={{ paddingTop: '64px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* ── Control panel ── */}
            <div style={{ padding: '16px 18px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', zIndex: 1000, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Navigation size={19} color="var(--accent)" /> Safe Route Navigation
                    </h2>
                    <button onClick={() => navigate(-1)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface-2)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }}>
                        <X size={14} />
                    </button>
                </div>

                {!navigating && (
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <LocationSearch label="Choose starting point..." value={sourceQuery} onChange={setSourceQuery}
                                    onSelect={r => { setSourcePos([r.latitude, r.longitude]); setSourceQuery(r.displayName); }} autoFocus />
                            </div>
                            <button onClick={handleLocateMe} title="Use my location" style={{ padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                                <Locate size={16} />
                            </button>
                        </div>
                        <LocationSearch label="Choose destination..." value={destQuery} onChange={setDestQuery}
                            onSelect={r => { setDestPos([r.latitude, r.longitude]); setDestQuery(r.displayName); }} />
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: navigating ? '10px' : 0 }}>
                    {routeLoading ? 'Calculating safest route…' :
                        chosenRoute ? `${chosenRoute.distanceKm.toFixed(1)} km · ~${Math.round(chosenRoute.durationMin)} min` : ''}
                </div>

                {readyToStart && (
                    <button onClick={startNavigation} style={{
                        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                        background: 'linear-gradient(135deg,#145c33,#27ae60)', color: '#fff',
                        fontWeight: 800, fontSize: '15px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 16px rgba(39,174,96,0.35)',
                    }}>
                        <Navigation size={18} /> Start Navigation
                    </button>
                )}

                {navigating && (
                    <button onClick={stopNavigation} style={{
                        width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                        background: '#e53e3e', color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                    }}>
                        ⏹ Stop Navigation
                    </button>
                )}
            </div>

            {routeError && (
                <div style={{ padding: '8px 18px', background: 'rgba(214,158,46,0.1)', color: '#d69e2e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={13} /> {routeError}
                </div>
            )}
            {hasHazardWarning && (
                <div style={{ padding: '8px 18px', background: 'rgba(229,62,62,0.1)', color: '#e53e3e', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={13} /> Route passes near active hazards — proceed with caution.
                </div>
            )}
            {isHazardFree && chosenRoute && !routeLoading && (
                <div style={{ padding: '8px 18px', background: 'rgba(56,161,105,0.08)', color: '#38a169', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={13} /> Route avoids all currently active hazard zones.
                </div>
            )}

            {/* ── Map ── */}
            <div style={{ flex: 1 }}>
                <MapContainer center={sourcePos || [30.3753, 69.3451]} zoom={sourcePos ? 14 : 6} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {sourcePos && <Recenter pos={sourcePos} zoom={navigating ? 16 : undefined} />}
                    {sourcePos && <Marker position={sourcePos} icon={navigating ? liveIcon : searchIcon} />}
                    {destPos && <Marker position={destPos} icon={destIcon} />}

                    {hazards.map(h => (
                        <Circle key={h.id} center={[h.latitude, h.longitude]} radius={(h.affectedAreaRadiusKm || 1.5) * 1000}
                            pathOptions={{ color: '#e53e3e', fillColor: '#e53e3e', fillOpacity: 0.12, weight: 1.5, dashArray: '6' }} />
                    ))}

                    {chosenRoute && (
                        <Polyline positions={chosenRoute.coordinates} pathOptions={{ color: isHazardFree ? '#38a169' : '#dd6b20', weight: 6, opacity: 0.9 }} />
                    )}
                </MapContainer>
            </div>

            <style>{`
        @keyframes pulse-ring { 0% { transform: scale(0.6); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
      `}</style>
        </div>
    );
}