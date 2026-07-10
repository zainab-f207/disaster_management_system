import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SeverityBadge, StatusBadge, SourceBadge, DisasterIcon } from '../ui';

const PAKISTAN_CENTER = [30.3753, 69.3451];
const PAKISTAN_ZOOM = 6;

const PAKISTAN_CITIES = [
  { name: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { name: 'Karachi', lat: 24.8607, lon: 67.0011 },
  { name: 'Islamabad', lat: 33.6844, lon: 73.0479 },
  { name: 'Peshawar', lat: 34.0151, lon: 71.5249 },
  { name: 'Quetta', lat: 30.1798, lon: 66.9750 },
  { name: 'Multan', lat: 30.1575, lon: 71.5249 },
  { name: 'Rawalpindi', lat: 33.5651, lon: 73.0169 },
  { name: 'Faisalabad', lat: 31.4504, lon: 73.1350 },
];

const severityColors = {
  Critical: '#e53e3e',
  High:     '#dd6b20',
  Medium:   '#d69e2e',
  Low:      '#38a169',
};

function createPulsingIcon(severity) {
  const color = severityColors[severity] || '#38a169';
  const isCritical = severity === 'Critical';

  const html = `
    <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
      ${isCritical ? `
        <div style="
          position:absolute;width:32px;height:32px;border-radius:50%;
          border:2px solid ${color};opacity:0.4;
          animation:pulse-ring 1.8s ease-out infinite;
        "></div>
        <div style="
          position:absolute;width:22px;height:22px;border-radius:50%;
          border:2px solid ${color};opacity:0.6;
          animation:pulse-ring 1.8s ease-out 0.6s infinite;
        "></div>
      ` : ''}
      <div style="
        width:16px;height:16px;border-radius:50%;
        background:${color};
        box-shadow:0 0 12px ${color},0 0 4px rgba(0,0,0,0.4);
        border:2px solid rgba(255,255,255,0.8);
        animation:${isCritical ? 'pulse-dot 1.5s infinite' : 'none'};
        position:relative;z-index:1;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createCityIcon(name) {
  return L.divIcon({
    html: `
      <div style="
        padding:2px 6px;background:rgba(0,0,0,0.5);
        border-radius:4px;font-size:9px;font-weight:600;
        color:#fff;white-space:nowrap;font-family:Inter,sans-serif;
        border:1px solid rgba(255,255,255,0.2);
      ">${name}</div>
    `,
    className: '',
    iconAnchor: [20, 8],
  });
}

function MapLayers({ disasters }) {
  const map = useMap();
  const markersRef = useRef([]);
  const cityMarkersRef = useRef([]);

  useEffect(() => {
    cityMarkersRef.current.forEach(m => map.removeLayer(m));
    cityMarkersRef.current = PAKISTAN_CITIES.map(city => {
      return L.marker([city.lat, city.lon], { icon: createCityIcon(city.name), interactive: false })
        .addTo(map);
    });
    return () => cityMarkersRef.current.forEach(m => map.removeLayer(m));
  }, [map]);

  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (!disasters?.length) return;

    disasters.forEach(disaster => {
      if (!disaster.latitude || !disaster.longitude) return;

      const icon = createPulsingIcon(disaster.severity);
      const marker = L.marker([disaster.latitude, disaster.longitude], { icon });

      const popupContent = `
        <div style="
          padding:16px;min-width:240px;
          font-family:Inter,sans-serif;color:var(--text-primary,#0a2e1a);
        ">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="font-size:20px;">${getDisasterEmoji(disaster.type)}</span>
            <div>
              <div style="font-weight:700;font-size:14px;">${disaster.type}</div>
              <div style="font-size:11px;color:#888;margin-top:1px;">#${disaster.id}</div>
            </div>
          </div>

          <div style="font-size:12px;color:#555;margin-bottom:10px;line-height:1.5;">
            ${disaster.description?.slice(0, 150) || 'No description.'}${disaster.description?.length > 150 ? '...' : ''}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
            <div style="background:#f0f4f0;border-radius:6px;padding:6px 8px;">
              <div style="font-size:10px;color:#888;">Severity</div>
              <div style="font-size:12px;font-weight:600;color:${severityColors[disaster.severity]};">${disaster.severity}</div>
            </div>
            <div style="background:#f0f4f0;border-radius:6px;padding:6px 8px;">
              <div style="font-size:10px;color:#888;">Status</div>
              <div style="font-size:12px;font-weight:600;color:#219653;">${disaster.status}</div>
            </div>
          </div>

          <div style="font-size:11px;color:#888;border-top:1px solid #eee;padding-top:8px;">
            📍 ${disaster.latitude?.toFixed(4)}, ${disaster.longitude?.toFixed(4)}<br/>
            🕒 ${new Date(disaster.reportedAt).toLocaleString('en-PK')}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'disaster-popup', maxWidth: 280 });
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    return () => markersRef.current.forEach(m => map.removeLayer(m));
  }, [disasters, map]);

  return null;
}

function getDisasterEmoji(type) {
  const map = { Flood: '🌊', Earthquake: '🌍', Fire: '🔥', Storm: '⛈️', Heatwave: '🌡️', Landslide: '⛰️', Other: '⚠️' };
  return map[type] || '⚠️';
}

export default function DisasterMap({ disasters = [], height = '100%' }) {
  return (
    <div style={{ position: 'relative', height, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <MapContainer
        center={PAKISTAN_CENTER}
        zoom={PAKISTAN_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
        />
        <MapLayers disasters={disasters} />
      </MapContainer>

      <div style={{
        position: 'absolute', bottom: '16px', left: '16px', zIndex: 800,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
          SEVERITY LEGEND
        </div>
        {Object.entries(severityColors).map(([sev, color]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{sev}</span>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', top: '16px', right: '16px', zIndex: 800,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 14px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
          {disasters.length} Active on Map
        </span>
      </div>
    </div>
  );
}
