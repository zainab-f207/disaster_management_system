import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useAlertStore } from '../store';
import AssignmentCard from '../components/responder/AssignmentCard';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RefreshCw, MapPin, Phone } from 'lucide-react';

const EMERGENCY_CONTACTS = [
  { name: 'Rescue 1122', number: '1122', emoji: '🚒' },
  { name: 'Police',      number: '15',   emoji: '👮' },
  { name: 'NDMA',        number: '1135', emoji: '🛡️' },
  { name: 'Edhi',        number: '115',  emoji: '🚑' },
];

export default function ResponderDashboard() {
  const navigate                        = useNavigate();
  const { isAuthenticated, user }       = useAuthStore();
  const { alerts }                      = useAlertStore();
  const [assignments, setAssignments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('active');
  const [refreshing, setRefreshing]     = useState(false);

  useEffect(() => {
    if (!isAuthenticated)               { navigate('/login'); return; }
    if (user?.role !== 'Responder')     { toast.error('Responder access only.'); navigate('/'); }
  }, [isAuthenticated, user, navigate]);

  const fetchAssignments = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const orgId = user?.organizationId;
      if (!orgId) {
        toast.error('No organization linked to your account. Contact admin.');
        return;
      }

      const disRes    = await api.get('/disasters');
      const disasters = disRes.data || [];
      const all       = [];

      await Promise.all(disasters.map(async d => {
        try {
          const res = await api.get(`/assignments/disaster/${d.id}`);
          const mine = (res.data || [])
            .filter(a => a.responderOrganizationId === orgId)
            .map(a => ({
              ...a,
              disasterType:        d.type,
              disasterSeverity:    d.severity,
              disasterStatus:      d.status,
              disasterDescription: d.description,
              disasterLat:         d.latitude,
              disasterLon:         d.longitude,
            }));
          all.push(...mine);
        } catch {}
      }));

      const urgencyOrder = ['OperationStarted','OnScene','Arrived','OnSite','EnRoute','Assigned','Completed','Cancelled'];
      all.sort((a,b) =>
        urgencyOrder.indexOf(a.status) - urgencyOrder.indexOf(b.status)
        || new Date(b.assignedAt) - new Date(a.assignedAt)
      );

      setAssignments(all);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'Responder') fetchAssignments();
  }, [fetchAssignments, isAuthenticated, user]);

  const newAlerts = alerts.filter(a =>
    a.type === 'assignment' &&
    a.organizationId === user?.organizationId
  );

  const filtered = assignments.filter(a => {
    if (filter === 'active')    return !['Completed','Cancelled'].includes(a.status);
    if (filter === 'completed') return a.status === 'Completed';
    return true;
  });

  const onSite    = assignments.filter(a => ['OnSite', 'OnScene', 'OperationStarted'].includes(a.status)).length;
  const enRoute   = assignments.filter(a => ['EnRoute', 'Arrived'].includes(a.status)).length;
  const assigned  = assignments.filter(a => a.status === 'Assigned').length;
  const completed = assignments.filter(a => a.status === 'Completed').length;

  if (!isAuthenticated || user?.role !== 'Responder') return null;

  return (
    <div style={{
      maxWidth: '960px', margin: '0 auto',
      padding: '88px 24px 60px', minHeight: '100vh',
    }}>

      <div style={{ marginBottom: '24px', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, #c05621, #dd6b20)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(221,107,32,0.3)',
              fontSize: '24px',
            }}>
              🚒
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: '22px',
                fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1,
              }}>
                Responder Dashboard
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {user?.fullName}
                {user?.organizationId && (
                  <span style={{ color: 'var(--accent)', marginLeft: '6px', fontWeight: 600 }}>
                    · Org #{user.organizationId}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchAssignments(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 600,
              background: 'var(--accent-subtle)', color: 'var(--accent)',
              border: '1px solid var(--border-strong)',
              borderRadius: '10px', cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin-slow 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {newAlerts.length > 0 && (
          <div style={{
            marginTop: '14px', padding: '12px 16px',
            background: 'rgba(221,107,32,0.08)',
            border: '1px solid rgba(221,107,32,0.3)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#dd6b20' }}>
              {newAlerts.length} new assignment{newAlerts.length > 1 ? 's' : ''} received!
              Check your active list.
            </span>
          </div>
        )}

        {onSite > 0 && (
          <div style={{
            marginTop: '10px', padding: '10px 16px',
            background: 'rgba(214,158,46,0.08)',
            border: '1px solid rgba(214,158,46,0.3)',
            borderRadius: '10px', fontSize: '13px',
            color: '#d69e2e', fontWeight: 600,
          }}>
            📍 You are currently on site/active at {onSite} disaster location{onSite > 1 ? 's' : ''}.
            Mark complete once the situation is resolved.
          </div>
        )}

        {enRoute > 0 && (
          <div style={{
            marginTop: '10px', padding: '10px 16px',
            background: 'rgba(66,153,225,0.08)',
            border: '1px solid rgba(66,153,225,0.3)',
            borderRadius: '10px', fontSize: '13px',
            color: '#4299e1', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4299e1', animation: 'pulse-dot 1.5s infinite' }}></span>
            📡 GPS Location Sharing is active for your journey. Stay safe!
          </div>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: '10px', marginBottom: '24px',
      }}>
        {[
          { label: 'On Site',   value: onSite,    color: '#d69e2e', emoji: '📍', urgent: onSite > 0 },
          { label: 'En Route',  value: enRoute,   color: '#4299e1', emoji: '🚗', urgent: false },
          { label: 'Assigned',  value: assigned,  color: '#a0aec0', emoji: '📋', urgent: false },
          { label: 'Completed', value: completed, color: '#38a169', emoji: '✅', urgent: false },
        ].map((s, i) => (
          <div key={s.label} style={{
            background: 'var(--card-bg)',
            border: `1px solid ${s.urgent ? s.color+'40' : 'var(--border)'}`,
            borderRadius: '12px', padding: '14px',
            textAlign: 'center',
            animation: `fadeInUp 0.3s ease ${i*50}ms both`,
            boxShadow: s.urgent ? `0 4px 16px ${s.color}20` : 'none',
          }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.emoji}</div>
            <div style={{
              fontSize: '26px', fontWeight: 900,
              fontFamily: 'var(--font-display)', color: s.color,
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap',
        marginBottom: '20px',
      }}>
        {EMERGENCY_CONTACTS.map(c => (
          <a
            key={c.number}
            href={`tel:${c.number}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '7px 14px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '20px', textDecoration: 'none',
              fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <span>{c.emoji}</span>
            <span>{c.name}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{c.number}</span>
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'active',    label: `⚡ Active (${assignments.filter(a=>!['Completed','Cancelled'].includes(a.status)).length})` },
          { key: 'completed', label: `✅ Completed (${completed})` },
          { key: 'all',       label: `📋 All (${assignments.length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '7px 16px', fontSize: '13px', fontWeight: 600,
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

      {loading ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {[...Array(3)].map((_,i) => (
            <div key={i} className="skeleton" style={{ height: '260px', borderRadius: '14px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>
            {filter === 'completed' ? '🏆' : '🛡️'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {filter === 'completed' ? 'No completed assignments' : 'No active assignments'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {filter === 'completed'
              ? 'Your completed assignments with proof will appear here.'
              : 'When admin verifies a disaster near your organization, it appears here automatically.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {filtered.map(a => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onStatusUpdated={() => fetchAssignments(true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}