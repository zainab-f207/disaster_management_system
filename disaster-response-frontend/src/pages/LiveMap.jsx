import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { disasterApi } from '../services/api';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SeverityBadge, DisasterIcon } from '../components/ui';
import { useAlertStore } from '../store';

const PAKISTAN_CENTER = [30.3753, 69.3451];
const SEV_COLORS = { Critical:'#e53e3e', High:'#dd6b20', Medium:'#d69e2e', Low:'#38a169' };

export default function LiveMap() {
  const [disasters, setDisasters]   = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const { alerts }                  = useAlertStore();

  useEffect(() => {
    disasterApi.getAll()
      .then(res => setDisasters(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = disasters.filter(d => {
    if (filter === 'active')   return !['Resolved','FalseAlarm'].includes(d.status);
    if (filter === 'critical') return d.severity === 'Critical';
    return true;
  });

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 340px',
      height: 'calc(100vh - 64px)', marginTop: '64px',
    }}
      className="map-layout"
    >
      <div style={{ position: 'relative' }}>
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.8; }
            100% { transform: scale(2.4); opacity: 0; }
          }
        `}</style>

        <MapContainer
          center={PAKISTAN_CENTER} zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapMarkersInner disasters={filtered} onSelect={setSelected} />
        </MapContainer>

        <div style={{
          position: 'absolute', top: '16px', left: '16px', zIndex: 800,
          display: 'flex', gap: '8px', flexWrap: 'wrap',
        }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: '⚡ Active' },
            { key: 'critical', label: '🚨 Critical' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px', fontSize: '12px', fontWeight: 700,
                background: filter === f.key ? 'var(--accent)' : 'var(--bg-overlay)',
                backdropFilter: 'blur(12px)',
                color: filter === f.key ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '20px', cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{
          position: 'absolute', bottom: '16px', left: '16px', zIndex: 800,
          background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)', borderRadius: '12px',
          padding: '10px 16px', display: 'flex', gap: '16px',
        }}>
          {Object.entries(SEV_COLORS).map(([sev, color]) => {
            const count = filtered.filter(d => d.severity === sev).length;
            return (
              <div key={sev} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>
                  {count}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sev}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card-bg)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '16px',
            fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px',
          }}>
            🗺️ Live Map
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {filtered.length} event{filtered.length !== 1 ? 's' : ''} on map
          </p>
        </div>

        {selected && (
          <div style={{
            padding: '14px 16px',
            background: 'var(--accent-subtle)',
            borderBottom: '1px solid var(--border-strong)',
            animation: 'fadeInDown 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DisasterIcon type={selected.type} size={20} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selected.type} #{selected.id}
                </span>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '16px',
              }}>×</button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
              {selected.description?.slice(0, 120)}...
            </p>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', alignItems: 'center' }}>
              <SeverityBadge severity={selected.severity} />
              <Link to={`/disasters/${selected.id}`} style={{
                fontSize: '12px', fontWeight: 700, color: 'var(--accent)',
                textDecoration: 'none',
              }}>
                Full Details →
              </Link>
            </div>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '16px', display: 'grid', gap: '8px' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '10px' }} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px' }}>
              {filtered.map((d, i) => {
                const color = SEV_COLORS[d.severity] || '#38a169';
                const isSelected = selected?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelected(d)}
                    style={{
                      padding: '11px 13px', marginBottom: '7px',
                      background: isSelected ? 'var(--accent-subtle)' : 'var(--card-bg)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: '10px', cursor: 'pointer',
                      transition: 'all 0.15s',
                      animation: `fadeInUp 0.3s ease ${i * 20}ms both`,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--card-bg)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DisasterIcon type={d.type} size={14} /> {d.type}
                      </span>
                      <SeverityBadge severity={d.severity} />
                    </div>
                    <p style={{
                      fontSize: '11px', color: 'var(--text-secondary)',
                      margin: 0, lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {d.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .map-layout { grid-template-columns: 1fr !important; grid-template-rows: 60vh auto; }
        }
      `}</style>
    </div>
  );
}

function MapMarkersInner({ disasters, onSelect }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const markers = [];
    const SEV_COLORS = { Critical:'#e53e3e', High:'#dd6b20', Medium:'#d69e2e', Low:'#38a169' };
    const typeEmoji = { Flood:'🌊', Earthquake:'🌍', Fire:'🔥', Storm:'⛈️', Heatwave:'🌡️', RoadAccident:'🚗', BuildingCollapse:'🏚️', UrbanFire:'🔥', GasExplosion:'💥', Other:'⚠️' };

    disasters.forEach(d => {
      if (!d.latitude || !d.longitude) return;
      const color = SEV_COLORS[d.severity] || '#38a169';
      const isCritical = d.severity === 'Critical';

      const icon = L.divIcon({
        html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          ${isCritical ? `<div style="position:absolute;width:36px;height:36px;border-radius:50%;border:2px solid ${color};animation:pulse-ring 1.8s ease-out infinite;opacity:0.5;"></div>` : ''}
          <div style="width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 12px ${color};border:2px solid rgba(255,255,255,0.8);position:relative;z-index:1;"></div>
        </div>`,
        className: '', iconSize: [36,36], iconAnchor: [18,18], popupAnchor: [0,-18],
      });

      const marker = L.marker([d.latitude, d.longitude], { icon })
        .bindPopup(`
          <div style="padding:14px;min-width:220px;font-family:Inter,sans-serif;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:20px;">${typeEmoji[d.type]||'⚠️'}</span>
              <div>
                <div style="font-weight:700;font-size:14px;">${d.type}</div>
                <div style="font-size:11px;color:#888;">#${d.id} · ${d.severity}</div>
              </div>
            </div>
            <p style="font-size:12px;color:#555;line-height:1.5;margin-bottom:10px;">
              ${(d.description||'').slice(0,100)}${(d.description||'').length>100?'...':''}
            </p>
            <a href="/disasters/${d.id}" style="display:inline-block;padding:6px 14px;background:${color};color:#fff;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">
              View Details →
            </a>
          </div>
        `, { className: 'disaster-popup', maxWidth: 260 })
        .addTo(map);

      marker.on('click', () => onSelect(d));
      markers.push(marker);
    });

    return () => markers.forEach(m => map.removeLayer(m));
  }, [disasters, map, onSelect]);

  return null;
}