import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { disasterApi } from '../services/api';
import api from '../services/api';
import { SeverityBadge, StatusBadge, DisasterIcon, SourceBadge } from '../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ResponseTimeEstimate from '../components/ui/ResponseTimeEstimate';

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.neighbourhood || a.suburb || a.quarter || a.road,
      a.city || a.town || a.village,
      a.state,
    ].filter(Boolean);
    return parts.join(', ') + ', Pakistan';
  } catch {
    return `${lat?.toFixed(4)}, ${lon?.toFixed(4)}`;
  }
}

export default function DisasterDetail() {
  const { id } = useParams();
  const [disaster, setDisaster] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [disRes, assignRes] = await Promise.all([
        disasterApi.getById(id),
        api.get(`/assignments/disaster/${id}`),
      ]);
      const d = disRes.data;
      setDisaster(d);
      setAssignments(assignRes.data || []);

      if (d.latitude && d.longitude) {
        const name = await reverseGeocode(d.latitude, d.longitude);
        setLocationName(name);
      }
    } catch (err) {
      setError('Disaster not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '88px 24px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px', marginBottom: '12px' }} />
      ))}
    </div>
  );

  if (error || !disaster) return (
    <div style={{
      maxWidth: '800px', margin: '0 auto', padding: '88px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
      <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {error || 'Disaster not found'}
      </h2>
      <Link to="/disasters" style={{ color: 'var(--accent)', textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>
        ← Back to disasters
      </Link>
    </div>
  );

  const severityColor = {
    Critical: '#e53e3e', High: '#dd6b20',
    Medium: '#d69e2e', Low: '#38a169',
  }[disaster.severity] || '#38a169';

  const disasterIcon = L.divIcon({
    html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
      ${{
        Flood: '🌊', Earthquake: '🌍', Fire: '🔥', Storm: '⛈️', Heatwave: '🌡️',
        RoadAccident: '🚗', BuildingCollapse: '🏚️', UrbanFire: '🔥',
        GasExplosion: '💥', Other: '⚠️'
      }[disaster.type] || '⚠️'}
    </div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  });

  return (
    <div style={{
      maxWidth: '900px', margin: '0 auto',
      padding: '88px 24px 60px', minHeight: '100vh',
    }}>
      {/* Back link */}
      <Link to="/disasters" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: 'var(--text-muted)',
        textDecoration: 'none', marginBottom: '20px',
        animation: 'fadeIn 0.3s ease',
      }}>
        ← Back to all disasters
      </Link>

      <div style={{
        background: 'var(--card-bg)',
        border: `1px solid var(--border)`,
        borderTop: `4px solid ${severityColor}`,
        borderRadius: 'var(--radius-xl)',
        padding: '24px 28px', marginBottom: '20px',
        animation: 'fadeInUp 0.4s ease',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <DisasterIcon type={disaster.type} size={38} />
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: '24px',
                fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1,
              }}>
                {disaster.type}
              </h1>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Disaster #{disaster.id}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <SeverityBadge severity={disaster.severity} />
            <StatusBadge status={disaster.status} />
          </div>
        </div>

        <p style={{
          fontSize: '15px', color: 'var(--text-secondary)',
          lineHeight: 1.7, marginBottom: '18px',
          padding: '14px 16px',
          background: 'var(--bg-surface-2)',
          borderRadius: '10px',
          borderLeft: `3px solid ${severityColor}`,
        }}>
          {disaster.description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
          {[
            { label: '📍 Location', value: locationName || 'Fetching area name...' },
            { label: '📡 Source', value: <SourceBadge source={disaster.source} /> },
            { label: '🕒 Reported', value: new Date(disaster.reportedAt).toLocaleString('en-PK') },
            { label: '✅ Verified', value: disaster.verifiedAt ? new Date(disaster.verifiedAt).toLocaleString('en-PK') : 'Not yet verified' },
            { label: '📏 Affected Radius', value: disaster.affectedAreaRadiusKm ? `${disaster.affectedAreaRadiusKm} km` : 'Not specified' },
            { label: '🗺️ Coordinates', value: `${disaster.latitude?.toFixed(4)}, ${disaster.longitude?.toFixed(4)}` },
          ].map(item => (
            <div key={item.label} style={{
              padding: '10px 14px',
              background: 'var(--bg-surface-2)',
              borderRadius: '10px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        {assignments.some(a => ['Assigned','EnRoute'].includes(a.status)) && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              ⏱️ Response Time Estimate
            </div>
            <ResponseTimeEstimate
              disasterId={disaster.id}
              disasterLat={disaster.latitude}
              disasterLon={disaster.longitude}
            />
          </div>
        )}

        {disaster.isAlertOnly && (
          <div style={{
            marginTop: '16px', padding: '16px',
            background: 'rgba(214,158,46,0.08)',
            border: '1px solid rgba(214,158,46,0.3)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#d69e2e', marginBottom: '8px' }}>
              ⚠️ Citizen Alert — No Physical Dispatch
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {disaster.description}
            </p>
            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              This type of emergency ({disaster.type}) requires citizen precautions rather than
              physical rescue deployment. Relevant authorities have been notified.
            </div>
          </div>
        )}
      </div>

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden', marginBottom: '20px',
        boxShadow: 'var(--shadow-md)',
        animation: 'fadeInUp 0.4s ease 0.1s both',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
        }}>
          🗺️ Disaster Location — {locationName}
        </div>
        <div style={{ height: '320px' }}>
          <MapContainer
            center={[disaster.latitude, disaster.longitude]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[disaster.latitude, disaster.longitude]} icon={disasterIcon}>
              <Popup>
                <strong>{disaster.type}</strong><br />
                {locationName}<br />
                Severity: {disaster.severity}
              </Popup>
            </Marker>
            {disaster.affectedAreaRadiusKm && (
              <Circle
                center={[disaster.latitude, disaster.longitude]}
                radius={disaster.affectedAreaRadiusKm * 1000}
                pathOptions={{ color: severityColor, fillColor: severityColor, fillOpacity: 0.1, weight: 2 }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
        animation: 'fadeInUp 0.4s ease 0.15s both',
        boxShadow: 'var(--shadow-md)',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '16px',
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px',
        }}>
          🚒 Responding Organizations
        </h3>

        {assignments.length === 0 ? (
          <div style={{
            padding: '24px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: '13px',
          }}>
            {disaster.status === 'Verified'
              ? 'Assignment details loading...'
              : 'No organizations assigned yet. Disaster needs admin verification first.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {assignments.map(a => {
              const statusColor = {
                Assigned: '#a0aec0', EnRoute: '#4299e1',
                OnSite: '#d69e2e', Completed: '#38a169', Cancelled: '#e53e3e',
              }[a.status] || '#a0aec0';

              return (
                <div key={a.id} style={{
                  padding: '14px 16px',
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {a.organizationName}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '8px',
                        background: `${statusColor}15`, color: statusColor, fontWeight: 700,
                      }}>
                        {{ Assigned: '📋 Assigned', EnRoute: '🚗 En Route', OnSite: '📍 On Site', Completed: '✅ Completed', Cancelled: '❌ Cancelled' }[a.status] || a.status}
                      </span>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '8px',
                        background: a.method === 'Auto' ? 'rgba(39,174,96,0.1)' : 'rgba(66,153,225,0.1)',
                        color: a.method === 'Auto' ? '#38a169' : '#4299e1', fontWeight: 600,
                      }}>
                        {a.method === 'Auto' ? '🤖 Auto-assigned' : '👤 Manual'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Assigned {new Date(a.assignedAt).toLocaleString('en-PK', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}