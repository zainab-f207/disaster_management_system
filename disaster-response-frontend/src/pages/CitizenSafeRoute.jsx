import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { disasterApi, geocodingApi } from '../services/api';
import { AlertTriangle, ShieldCheck, MapPin, Navigation } from 'lucide-react';

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ensure icons use standard Leaflet or robust CSS
const sourceIcon = L.divIcon({ html: '<div style="font-size:26px">📍</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 30] });
const destIcon = L.divIcon({ html: '<div style="width:18px;height:18px;border-radius:50%;background:#e53e3e;border:3px solid #fff;box-shadow:0 0 10px #e53e3e"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });

function Recenter({ pos }) {
    const map = useMap();
    useEffect(() => { if (pos) map.setView(pos, Math.max(map.getZoom(), 12)); }, [pos, map]);
    return null;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

async function fetchRoutes(startLat, startLon, endLat, endLon) {
    const url = `${OSRM_BASE}/${startLon},${startLat};${endLon},${endLat}?alternatives=true&overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM request failed');
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found');
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
            if (distanceKm(lat, lon, h.latitude, h.longitude) <= (h.affectedAreaRadiusKm || 1.5)) {
                overlap += 0.3;
                break;
            }
        }
    }
    return overlap;
}

function AutocompleteInput({ placeholder, value, onChange, onSelect, onLocateMe, isLocating }) {
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
        if (!value || value.length < 2) {
            setSuggestions([]);
            return;
        }
        if (value === 'My Location' || value === 'Custom Location' || value === 'Locating...') {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await geocodingApi.search(value);
                setSuggestions(res.data || []);
                setIsOpen(true);
            } catch {
                // ignore
            }
        }, 200); // reduced timeout for snappier dropdown
        return () => clearTimeout(timer);
    }, [value]);

    return (
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
                <input 
                    value={value} 
                    onChange={e => { onChange(e.target.value); setIsOpen(true); }}
                    onFocus={() => { if (suggestions.length) setIsOpen(true); }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    placeholder={placeholder} 
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)' }} 
                    disabled={isLocating}
                />
                {onLocateMe && (
                    <button onClick={onLocateMe} title="Locate Me" style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: isLocating ? 0.7 : 1 }}>
                        {isLocating ? '⏳' : '📍'}
                    </button>
                )}
            </div>
            {isOpen && suggestions.length > 0 && (
                <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', margin: '4px 0 0', padding: 0, listStyle: 'none', zIndex: 1000, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    {suggestions.map((s, i) => (
                        <li key={i} onClick={() => { onSelect(s); setIsOpen(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.display_name}>
                            {s.display_name}
                        </li>
                    ))}
                </ul>
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

    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState('');
    const [chosenRoute, setChosenRoute] = useState(null);
    
    const [isLocating, setIsLocating] = useState(false);
    const [liveNavigation, setLiveNavigation] = useState(false);
    const watchIdRef = useRef(null);
    
    useEffect(() => {
        disasterApi.getAll()
            .then(res => {
                const active = (res.data || []).filter(d =>
                    !['Resolved', 'FalseAlarm', 'Closed', 'AlertExpired'].includes(d.status)
                );
                setHazards(active);
            })
            .catch(() => setHazards([]));
    }, []);

    useEffect(() => {
        if (liveNavigation) {
            if (!navigator.geolocation) {
                setRouteError('Geolocation not supported.');
                setLiveNavigation(false);
                return;
            }
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const p = [pos.coords.latitude, pos.coords.longitude];
                    setSourcePos(p);
                },
                () => {
                    setRouteError("Lost GPS signal.");
                },
                { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
            );
        } else {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        }
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [liveNavigation]);

    const handleSelect = (s, isSource) => {
        const pos = [parseFloat(s.lat), parseFloat(s.lon)];
        if (isSource) {
            setSourcePos(pos);
            setSourceQuery(s.display_name);
            setLiveNavigation(false);
        } else {
            setDestPos(pos);
            setDestQuery(s.display_name);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        setSourceQuery('Locating...');
        navigator.geolocation.getCurrentPosition((pos) => {
            const p = [pos.coords.latitude, pos.coords.longitude];
            setSourcePos(p);
            setSourceQuery('My Location');
            setIsLocating(false);
        }, () => {
            setRouteError("Could not get your location. Please check browser permissions.");
            setSourceQuery('');
            setIsLocating(false);
        });
    };

    useEffect(() => {
        if (!sourcePos || !destPos) return;
        
        setRouteLoading(true);
        setRouteError('');
        
        fetchRoutes(sourcePos[0], sourcePos[1], destPos[0], destPos[1])
            .then(results => {
                const scored = results.map(r => ({
                    ...r,
                    hazardKm: hazardOverlapKm(r.coordinates, hazards),
                })).sort((a, b) => a.hazardKm - b.hazardKm || a.distanceKm - b.distanceKm);

                setChosenRoute(scored[0]);
            })
            .catch(() => {
                setRouteError('Could not calculate a route right now.');
                setChosenRoute(null);
            })
            .finally(() => {
                setRouteLoading(false);
            });
    }, [sourcePos, destPos, hazards]);

    const isHazardFree = chosenRoute && chosenRoute.hazardKm === 0;
    const hasHazardWarning = chosenRoute && chosenRoute.hazardKm > 0;

    return (
        <div style={{ paddingTop: '64px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={20} color="var(--accent)" />
                        Safe Route Navigation
                    </h2>
                    <button onClick={() => navigate(-1)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface-2)', cursor: 'pointer', color: 'var(--text-primary)' }}>Back</button>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <AutocompleteInput 
                        placeholder="Source Location..." 
                        value={sourceQuery} 
                        onChange={(v) => { setSourceQuery(v); setLiveNavigation(false); }} 
                        onSelect={s => handleSelect(s, true)}
                        onLocateMe={handleLocateMe}
                        isLocating={isLocating}
                    />
                    <AutocompleteInput 
                        placeholder="Destination Location..." 
                        value={destQuery} 
                        onChange={setDestQuery} 
                        onSelect={s => handleSelect(s, false)}
                    />
                </div>
                {sourcePos && destPos && (
                    <button 
                        onClick={() => setLiveNavigation(!liveNavigation)} 
                        style={{ 
                            width: '100%', padding: '10px', borderRadius: '8px', border: 'none', 
                            background: liveNavigation ? '#e53e3e' : '#3182ce', 
                            color: '#fff', fontWeight: 'bold', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}>
                        <Navigation size={18} />
                        {liveNavigation ? 'Stop Live Navigation' : 'Start Live Navigation'}
                    </button>
                )}
            </div>

            {routeError && (
                <div style={{ padding: '8px 18px', background: 'rgba(214,158,46,0.1)', color: '#d69e2e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 5 }}>
                    <AlertTriangle size={13} /> {routeError}
                </div>
            )}
            {hasHazardWarning && (
                <div style={{ padding: '8px 18px', background: 'rgba(229,62,62,0.1)', color: '#e53e3e', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', zIndex: 5 }}>
                    <AlertTriangle size={13} /> This route passes near active hazards — proceed with extreme caution!
                </div>
            )}
            {isHazardFree && chosenRoute && !routeLoading && (
                <div style={{ padding: '8px 18px', background: 'rgba(56,161,105,0.08)', color: '#38a169', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', zIndex: 5 }}>
                    <ShieldCheck size={13} /> Route avoids all currently active hazard zones.
                </div>
            )}
            
            {routeLoading && (
                <div style={{ padding: '8px 18px', background: 'var(--bg-surface-2)', color: 'var(--text-muted)', fontSize: '12px', zIndex: 5 }}>
                    Calculating safest route...
                </div>
            )}

            <div style={{ flex: 1, zIndex: 1 }}>
                <MapContainer center={[30.3753, 69.3451]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {sourcePos && !destPos && <Recenter pos={sourcePos} />}
                    {destPos && <Recenter pos={destPos} />}

                    {sourcePos && (
                        <Marker 
                            position={sourcePos} 
                            icon={sourceIcon}
                            draggable={!liveNavigation}
                            eventHandlers={{
                                dragend: (e) => {
                                    if(liveNavigation) return;
                                    const pos = e.target.getLatLng();
                                    setSourcePos([pos.lat, pos.lng]);
                                    setSourceQuery('Custom Location');
                                }
                            }}
                        >
                            <Popup>{liveNavigation ? "Your Live Location" : "Source (Drag to move)"}</Popup>
                        </Marker>
                    )}
                    {destPos && (
                        <Marker 
                            position={destPos} 
                            icon={destIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => {
                                    const pos = e.target.getLatLng();
                                    setDestPos([pos.lat, pos.lng]);
                                    setDestQuery('Custom Location');
                                }
                            }}
                        >
                            <Popup>Destination (Drag to move)</Popup>
                        </Marker>
                    )}

                    {hazards.map(h => (
                        <Circle
                            key={h.id}
                            center={[h.latitude, h.longitude]}
                            radius={(h.affectedAreaRadiusKm || 1.5) * 1000}
                            pathOptions={{ color: '#e53e3e', fillColor: '#e53e3e', fillOpacity: 0.12, weight: 1.5, dashArray: '6' }}
                        >
                            <Popup>{h.type} Hazard Zone</Popup>
                        </Circle>
                    ))}

                    {chosenRoute && (
                        <Polyline
                            positions={chosenRoute.coordinates}
                            pathOptions={{ color: isHazardFree ? '#38a169' : '#dd6b20', weight: 5, opacity: 0.85 }}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
