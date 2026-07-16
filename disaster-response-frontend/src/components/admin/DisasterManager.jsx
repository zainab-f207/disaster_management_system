import { useState, useEffect } from 'react';
import { disasterApi } from '../../services/api';
import { SeverityBadge, StatusBadge, DisasterIcon } from '../ui';
import toast from 'react-hot-toast';
import api from '../../services/api';
import IncidentLiveMap from './IncidentLiveMap';

const STATUS_OPTIONS = [
  'Reported', 'UnderVerification', 'Verified',
  'ResponseInProgress', 'Resolved', 'FalseAlarm',
];

export default function DisasterManager() {
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [verifying, setVerifying] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [incident, setIncident] = useState(null);
  const [loadingIncident, setLoadingIncident] = useState(false);



  useEffect(() => { fetchDisasters(); }, []);

  const fetchDisasters = async () => {
    setLoading(true);
    try {
      const res = await disasterApi.getAll();
      setDisasters(res.data || []);
    } catch {
      toast.error('Failed to load disasters');
    } finally {
      setLoading(false);
    }
  };

  const openLiveTrack = async (d) => {
    setLoadingIncident(true);
    try {
      const res = await api.get(`/assignments/disaster/${d.id}`);
      setIncident({ disaster: d, assignments: res.data || [] });
    } catch { toast.error('Failed to load live tracking'); }
    finally { setLoadingIncident(false); }
  };

  const handleVerify = async (disaster) => {
    setVerifying(disaster.id);
    try {
      await disasterApi.verify(disaster.id);
      toast.success(`Disaster #${disaster.id} verified! Responder auto-assigned. 🚒`);
      fetchDisasters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const handleStatusChange = async (disaster, newStatus) => {
    setUpdating(disaster.id);
    try {
      await disasterApi.updateStatus(disaster.id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      fetchDisasters();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = disasters.filter(d => {
    if (filter === 'active') return !['Resolved', 'FalseAlarm'].includes(d.status);
    if (filter === 'pending') return ['Reported', 'UnderVerification'].includes(d.status);
    if (filter === 'resolved') return ['Resolved', 'FalseAlarm'].includes(d.status);
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Disaster Management
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {filtered.length} disaster{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'active', label: 'Active' },
            { key: 'pending', label: 'Pending' },
            { key: 'resolved', label: 'Resolved' },
            { key: 'all', label: 'All' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 12px', fontSize: '12px', fontWeight: 600,
                borderRadius: '20px', cursor: 'pointer',
                border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === f.key ? 'var(--accent-subtle)' : 'transparent',
                color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', fontSize: '14px',
        }}>
          No disasters found for this filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filtered.map((d, i) => (
            <div
              key={d.id}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px', padding: '14px 16px',
                animation: `fadeInUp 0.3s ease ${i * 30}ms both`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DisasterIcon type={d.type} size={22} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      #{d.id} — {d.type}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {d.source} {d.sourceReference ? `(${d.sourceReference})` : ''} •{' '}
                      {new Date(d.reportedAt).toLocaleString('en-PK', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <SeverityBadge severity={d.severity} />
                  <StatusBadge status={d.status} />
                </div>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                {d.description?.slice(0, 120)}{d.description?.length > 120 ? '...' : ''}
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {!['Verified', 'ResponseInProgress', 'Resolved', 'FalseAlarm', 'AlertActive', 'AlertExpired'].includes(d.status) && d.source !== 'AdminReport' && (
                  <button
                    onClick={() => handleVerify(d)}
                    disabled={verifying === d.id}
                    style={{
                      padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                      background: 'linear-gradient(135deg, #145c33, #27ae60)',
                      color: '#fff', border: 'none',
                      borderRadius: '8px', cursor: verifying === d.id ? 'not-allowed' : 'pointer',
                      opacity: verifying === d.id ? 0.7 : 1,
                      boxShadow: '0 2px 8px rgba(33,150,83,0.25)',
                    }}
                  >
                    {verifying === d.id ? '⏳ Verifying...' : '✅ Verify + Assign'}
                  </button>
                )}

                <select
                  value={d.status}
                  onChange={e => handleStatusChange(d, e.target.value)}
                  disabled={updating === d.id}
                  style={{
                    padding: '6px 10px', fontSize: '12px',
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px', color: 'var(--text-primary)',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <button
                  onClick={() => openLiveTrack(d)}
                  disabled={loadingIncident}
                  style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, background: 'rgba(66,153,225,0.1)', color: '#4299e1', border: '1px solid rgba(66,153,225,0.3)', borderRadius: '8px', cursor: 'pointer' }}
                >
                  🗺️ Live Track
                </button>

                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  📍 {d.latitude?.toFixed(3)}, {d.longitude?.toFixed(3)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {incident && (
        <IncidentLiveMap
          disaster={incident.disaster}
          assignments={incident.assignments}
          onClose={() => setIncident(null)}
        />
      )}
    </div>
  );
}