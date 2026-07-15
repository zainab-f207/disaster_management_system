import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { RefreshCw, Play, Navigation, AlertTriangle } from 'lucide-react';

const PAKISTAN_CENTER = [30.3753, 69.3451];

const STATUS_CONFIG = {
  Assigned:  { color: '#a0aec0', label: 'Assigned', emoji: '📋' },
  EnRoute:   { color: '#4299e1', label: 'En Route', emoji: '🚗' },
  Arrived:   { color: '#3182ce', label: 'Arrived', emoji: '🔔' },
  OnScene:   { color: '#319795', label: 'On Scene', emoji: '📍' },
  OperationStarted: { color: '#2f855a', label: 'Operating', emoji: '🚀' },
  OnSite:    { color: '#d69e2e', label: 'On Site', emoji: '📍' },
};

const DISASTER_EMOJI = {
  Flood: '🌊', Earthquake: '🌍', Storm: '⛈️', Landslide: '⛰️', Heatwave: '🌡️',
  RoadAccident: '🚗', UrbanFire: '🔥', BuildingCollapse: '🏚️', GasExplosion: '💥', Other: '⚠️'
};

export default function LiveResponderMap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchLive = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/assignments/live');
      setData(res.data || []);
    } catch {
      toast.error('Failed to update live responder tracking');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLive();
    // Poll every 10 seconds
    const interval = setInterval(() => fetchLive(true), 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 320px',
      height: 'calc(100vh - 220px)', minHeight: '500px',
      border: '1px solid var(--border)', borderRadius: '16px',
      overflow: 'hidden', background: 'var(--card-bg)',
      animation: 'fadeInUp 0.4s ease',
    }} className="map-layout">

      {/* Map Side */}
      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <MapContainer
          center={PAKISTAN_CENTER} zoom={6}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LiveTrackingInner data={data} selected={selectedAssignment} onSelect={setSelectedAssignment} />
        </MapContainer>

        <button
          onClick={() => fetchLive(true)}
          disabled={refreshing}
          style={{
            position: 'absolute', top: '16px', right: '16px', zIndex: 800,
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', fontSize: '12px', fontWeight: 700,
            background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)',
            color: 'var(--text-primary)', border: '1px solid var(--border)',
            borderRadius: '10px', cursor: 'pointer', boxShadow: 'var(--shadow-md)',
          }}
        >
          <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Live'}
        </button>
      </div>

      {/* List Side */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--border)', height: '100%',
        overflow: 'hidden', background: 'var(--bg-surface)'
      }}>
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border)',
          background: 'var(--card-bg)'
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '15px',
            fontWeight: 800, color: 'var(--text-primary)', display: 'flex',
            alignItems: 'center', gap: '8px', margin: 0
          }}>
            📡 Active Operations
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Tracking {data.filter(a => a.responderLatitude != null).length} active GPS links
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {loading ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '78px', borderRadius: '10px' }} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 16px',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚒</div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>No Active Assignments</div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                When responders start operations, their details will display here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {data.map(a => {
                const conf = STATUS_CONFIG[a.status] || STATUS_CONFIG.Assigned;
                const isSelected = selectedAssignment?.id === a.id;
                const hasGps = a.responderLatitude != null;

                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAssignment(a)}
                    style={{
                      padding: '10px 12px', background: isSelected ? 'var(--accent-subtle)' : 'var(--card-bg)',
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {a.organizationName}
                      </span>
                      <span style={{
                        fontSize: '9px', fontWeight: 800, padding: '2px 6px',
                        background: `${conf.color}15`, color: conf.color, borderRadius: '6px'
                      }}>
                        {conf.emoji} {conf.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {DISASTER_EMOJI[a.disasterType] || '⚠️'} {a.disasterType} #{a.disasterId}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {hasGps ? `${a.distanceMeters}m away` : 'No GPS Ping'}
                      </span>
                    </div>

                    {hasGps && a.lastPingAt && (
                      <div style={{
                        fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px',
                        textAlign: 'right'
                      }}>
                        Last ping: {new Date(a.lastPingAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveTrackingInner({ data, selected, onSelect }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    if (!map) return;

    // Clear old markers/polylines
    markersRef.current.forEach(item => map.removeLayer(item));
    markersRef.current = [];

    const newItems = [];

    data.forEach(a => {
      // 1. Incident Marker
      const incidentIcon = L.divIcon({
        html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:32px;height:32px;border-radius:50%;border:2px solid #e53e3e;animation:pulse-ring 1.8s ease-out infinite;opacity:0.6;"></div>
          <div style="width:16px;height:16px;border-radius:50%;background:#e53e3e;border:2px solid #fff;box-shadow:0 0 8px #e53e3e;z-index:2;"></div>
        </div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
      });

      const incidentMarker = L.marker([a.disasterLatitude, a.disasterLongitude], { icon: incidentIcon })
        .bindPopup(`
          <div style="padding:10px;min-width:180px;font-family:Inter,sans-serif;">
            <div style="font-weight:700;font-size:13px;color:#e53e3e;margin-bottom:4px;">
              🚨 Incident Area
            </div>
            <div style="font-size:12px;font-weight:600;margin-bottom:6px;">
              ${DISASTER_EMOJI[a.disasterType] || '⚠️'} ${a.disasterType}
            </div>
            <a href="/disasters/${a.disasterId}" style="display:block;text-align:center;padding:5px;background:#e53e3e;color:#fff;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;">
              View Details
            </a>
          </div>
        `, { maxWidth: 220 });

      incidentMarker.addTo(map);
      newItems.push(incidentMarker);

      // 2. Responder & Polyline
      if (a.responderLatitude && a.responderLongitude) {
        const conf = STATUS_CONFIG[a.status] || STATUS_CONFIG.Assigned;

        const responderIcon = L.divIcon({
          html: `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:36px;height:36px;border-radius:50%;border:2px solid ${conf.color};animation:pulse-ring 2s ease-out infinite;opacity:0.4;"></div>
            <div style="width:20px;height:20px;border-radius:6px;background:${conf.color};border:2px solid #fff;box-shadow:0 0 10px ${conf.color};display:flex;align-items:center;justify-content:center;z-index:2;font-size:12px;">
              🚒
            </div>
          </div>`,
          className: '', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18]
        });

        const responderMarker = L.marker([a.responderLatitude, a.responderLongitude], { icon: responderIcon })
          .bindPopup(`
            <div style="padding:10px;min-width:200px;font-family:Inter,sans-serif;">
              <div style="font-weight:700;font-size:13px;color:${conf.color};margin-bottom:4px;">
                🚒 ${a.organizationName}
              </div>
              <div style="font-size:11px;color:#555;margin-bottom:6px;">
                <b>Status:</b> ${conf.emoji} ${conf.label}<br/>
                <b>Distance:</b> ${a.distanceMeters} meters<br/>
                <b>Last Ping:</b> ${new Date(a.lastPingAt).toLocaleTimeString()}
              </div>
              <a href="/disasters/${a.disasterId}" style="display:block;text-align:center;padding:5px;background:${conf.color};color:#fff;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;">
                Disaster Details
              </a>
            </div>
          `, { maxWidth: 240 });

        responderMarker.addTo(map);
        newItems.push(responderMarker);

        // Click handler to select in sidebar
        responderMarker.on('click', () => onSelect(a));

        // Line connection
        const polyline = L.polyline(
          [[a.responderLatitude, a.responderLongitude], [a.disasterLatitude, a.disasterLongitude]],
          { color: conf.color, weight: 2, dashArray: '6, 6', opacity: 0.8 }
        ).addTo(map);
        newItems.push(polyline);
      }
    });

    markersRef.current = newItems;

    // Pan map to selected assignment if specified
    if (selected) {
      if (selected.responderLatitude && selected.responderLongitude) {
        map.setView([selected.responderLatitude, selected.responderLongitude], 13);
      } else {
        map.setView([selected.disasterLatitude, selected.disasterLongitude], 13);
      }
    }
  }, [data, selected, map]);

  return null;
}
