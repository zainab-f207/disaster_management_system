import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';

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

export default function ResponderNavigate() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const [assignment, setAssignment] = useState(null);
    const [myPos, setMyPos] = useState(null);
    const [error, setError] = useState('');
    const lastSentRef = useRef(0);
    const watchIdRef = useRef(null);

    useEffect(() => {
        api.get(`/assignments/${assignmentId}`)
            .then(res => setAssignment(res.data))
            .catch(() => setError('Could not load assignment.'));
    }, [assignmentId]);

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

    if (!assignment) {
        return <div style={{ padding: '88px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>{error || 'Loading assignment…'}</div>;
    }

    const dist = myPos ? distanceKm(myPos[0], myPos[1], assignment.disasterLat, assignment.disasterLon) : null;
    const eta = dist ? Math.round((dist / 40) * 60) : null;

    return (
        <div style={{ paddingTop: '64px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                        🧭 Navigate to Disaster #{assignment.disasterId} ({assignment.disasterType})
                    </div>
                    {error && <div style={{ fontSize: '12px', color: '#e53e3e' }}>{error}</div>}
                    {dist != null && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dist.toFixed(1)} km · ~{eta} min at 40km/h avg</div>}
                </div>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface-2)', cursor: 'pointer' }}>Back</button>
            </div>
            <div style={{ flex: 1 }}>
                <MapContainer center={myPos || [assignment.disasterLat, assignment.disasterLon]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {myPos && <Recenter pos={myPos} />}
                    {myPos && <Marker position={myPos} icon={myIcon} />}
                    <Marker position={[assignment.disasterLat, assignment.disasterLon]} icon={destIcon} />
                    {myPos && <Polyline positions={[myPos, [assignment.disasterLat, assignment.disasterLon]]} pathOptions={{ color: '#4299e1', weight: 4, dashArray: '8 8' }} />}
                </MapContainer>
            </div>
        </div>
    );
}