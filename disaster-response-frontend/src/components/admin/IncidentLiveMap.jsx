import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocationStore } from '../../store';
import { subscribeToDisaster, unsubscribeFromDisaster } from '../../services/signalrConnection';
import { X } from 'lucide-react';

const vehicleIcon = L.divIcon({
    html: `<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">🚑</div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15],
});
const disasterIcon = (color) => L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 10px ${color}"></div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
});

function FitBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 1) map.fitBounds(points, { padding: [40, 40] });
        else if (points.length === 1) map.setView(points[0], 14);
    }, [points, map]);
    return null;
}

export default function IncidentLiveMap({ disaster, assignments, onClose }) {
    const locations = useLocationStore(s => s.locations);

    useEffect(() => {
        subscribeToDisaster(disaster.id);
        return () => unsubscribeFromDisaster(disaster.id);
    }, [disaster.id]);

    const sevColor = { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' }[disaster.severity] || '#38a169';
    const points = [[disaster.latitude, disaster.longitude]];
    assignments.forEach(a => {
        const live = locations[a.id] || (a.currentLatitude && { lat: a.currentLatitude, lng: a.currentLongitude });
        if (live) points.push([live.lat, live.lng]);
    });

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(900px,100%)', height: 'min(600px,90vh)', background: 'var(--bg-elevated)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>🚨 {disaster.type} — Disaster #{disaster.id}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live incident tracking</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ flex: 1 }}>
                    <MapContainer center={[disaster.latitude, disaster.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <FitBounds points={points} />
                        <Marker position={[disaster.latitude, disaster.longitude]} icon={disasterIcon(sevColor)}>
                            <Popup>{disaster.type} — {disaster.severity}</Popup>
                        </Marker>
                        {assignments.map(a => {
                            const live = locations[a.id] || (a.currentLatitude && { lat: a.currentLatitude, lng: a.currentLongitude, updatedAt: a.locationUpdatedAt });
                            if (!live) return null;
                            return (
                                <div key={a.id}>
                                    <Marker position={[live.lat, live.lng]} icon={vehicleIcon}>
                                        <Popup>{a.organizationName}<br />Updated {new Date(live.updatedAt).toLocaleTimeString()}</Popup>
                                    </Marker>
                                    <Polyline positions={[[live.lat, live.lng], [disaster.latitude, disaster.longitude]]} pathOptions={{ color: sevColor, dashArray: '6 8', weight: 3 }} />
                                </div>
                            );
                        })}
                    </MapContainer>
                </div>
                <div style={{ padding: '10px 18px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                    {assignments.some(a => locations[a.id] || a.currentLatitude)
                        ? '🟢 Live responder position streaming'
                        : "⚪ No live GPS yet — responder hasn't opened Navigate mode."}
                </div>
            </div>
        </div>
    );
}