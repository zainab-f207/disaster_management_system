import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { DisasterIcon, SeverityBadge } from '../ui';
import CompletionModal from './CompletionModal';
import GeofenceNotification from './GeofenceNotification';
import { useGpsTracking } from '../../hooks/useGpsTracking';
import toast from 'react-hot-toast';
import { Navigation, Play, MapPin, Compass } from 'lucide-react';

const STATUS_FLOW = ['Assigned', 'EnRoute', 'Arrived', 'OnScene', 'OperationStarted', 'Completed'];

const STATUS_CONFIG = {
  Assigned:  { color: '#a0aec0', emoji: '📋', next: 'EnRoute',  nextLabel: '⚡ Accept & Start Journey' },
  EnRoute:   { color: '#4299e1', emoji: '🚗', next: 'Arrived',  nextLabel: '📍 Simulated Arrival (100m)' },
  Arrived:   { color: '#3182ce', emoji: '🔔', next: 'OnScene',  nextLabel: '📍 Simulated Close-Range (20m)' },
  OnScene:   { color: '#319795', emoji: '📍', next: 'OperationStarted', nextLabel: '🚀 Start Operation' },
  OperationStarted: { color: '#2f855a', emoji: '🛠️', next: 'Complete', nextLabel: '✅ Mark Complete' },
  OnSite:    { color: '#d69e2e', emoji: '📍', next: 'Complete', nextLabel: '✅ Mark Complete' }, // fallback
  Completed: { color: '#38a169', emoji: '✅', next: null,        nextLabel: null },
  Cancelled: { color: '#e53e3e', emoji: '❌', next: null,        nextLabel: null },
};

export default function AssignmentCard({ assignment, onStatusUpdated }) {
  const navigate = useNavigate();
  const [updating, setUpdating]             = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [geofenceType, setGeofenceType]     = useState(null);
  const [hasPromptedLeaving, setHasPromptedLeaving] = useState(false);

  const config = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.Assigned;

  const {
    gpsActive,
    gpsError,
    distanceMeters,
    startTracking,
    stopTracking,
  } = useGpsTracking({
    onStatusChange: (newStatus) => {
      toast.success(`Status auto-updated to: ${newStatus} 📍`);
      onStatusUpdated?.();
    }
  });

  // Start tracking automatically on mount/status change if in tracking state
  useEffect(() => {
    const trackingStatuses = ['EnRoute', 'Arrived', 'OnScene'];
    if (trackingStatuses.includes(assignment.status)) {
      startTracking(assignment.id, assignment.status);
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [assignment.id, assignment.status, startTracking, stopTracking]);

  // Manage geofence popup notifications based on status and distance
  useEffect(() => {
    if (assignment.status === 'OnScene') {
      setGeofenceType('on-scene');
    } else if (
      (assignment.status === 'OperationStarted' || assignment.status === 'OnSite') &&
      distanceMeters !== null &&
      distanceMeters > 150 &&
      !hasPromptedLeaving
    ) {
      setGeofenceType('leaving');
    } else {
      setGeofenceType(null);
    }
  }, [assignment.status, distanceMeters, hasPromptedLeaving]);

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'Complete') {
      setShowProofModal(true);
      return;
    }

    setUpdating(true);
    try {
      // Simulation mode: if in EnRoute/Arrived, clicking the button triggers simulated GPS ping near the incident
      if (assignment.status === 'EnRoute' && newStatus === 'Arrived') {
        // Mock coordinates: 90m away from disaster
        const mockLat = assignment.disasterLat + 0.00078;
        const mockLon = assignment.disasterLon + 0.0002;
        await api.post(`/assignments/${assignment.id}/location`, {
          latitude: mockLat,
          longitude: mockLon,
          accuracyMeters: 5,
        });
        toast.success('Simulated GPS ping within 100 meters. Checking auto-transition...');
        onStatusUpdated?.();
        return;
      }

      if (assignment.status === 'Arrived' && newStatus === 'OnScene') {
        // Mock coordinates: 15m away from disaster
        const mockLat = assignment.disasterLat + 0.00012;
        const mockLon = assignment.disasterLon + 0.00005;
        await api.post(`/assignments/${assignment.id}/location`, {
          latitude: mockLat,
          longitude: mockLon,
          accuracyMeters: 3,
        });
        toast.success('Simulated GPS ping within 20 meters. Checking auto-transition...');
        onStatusUpdated?.();
        return;
      }

      await api.put(`/assignments/${assignment.id}/status`, { status: newStatus });
      toast.success(`Status updated: ${newStatus} 👍`);
      onStatusUpdated?.();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartOperation = async () => {
    setUpdating(true);
    try {
      await api.put(`/assignments/${assignment.id}/start-operation`);
      toast.success('Response operations officially started! 🚀');
      setGeofenceType(null);
      onStatusUpdated?.();
    } catch {
      toast.error('Failed to start operations');
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async ({ completionNotes, completionPhotoBase64 }) => {
    setUpdating(true);
    try {
      await api.post(`/assignments/${assignment.id}/complete`, {
        completionNotes,
        completionPhotoBase64,
      });
      toast.success('Assignment completed! Proof submitted to admin. ✅');
      setShowProofModal(false);
      setGeofenceType(null);
      onStatusUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit completion');
    } finally {
      setUpdating(false);
    }
  };

  // Helper button to simulate leaving the geofence area for testing
  const simulateLeavingGeofence = async () => {
    try {
      const mockLat = assignment.disasterLat + 0.0022; // ~240m away
      const mockLon = assignment.disasterLon + 0.0022;
      await api.post(`/assignments/${assignment.id}/location`, {
        latitude: mockLat,
        longitude: mockLon,
        accuracyMeters: 10,
      });
      toast.success('Simulated leaving geofence (>150m away). Alert triggered.');
      onStatusUpdated?.();
    } catch {
      toast.error('Failed to simulate leaving');
    }
  };

  return (
    <>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '14px', padding: '18px',
        boxShadow: 'var(--shadow-md)',
        transition: 'box-shadow 0.2s',
        animation: 'fadeInUp 0.3s ease',
      }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DisasterIcon type={assignment.disasterType} size={28} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {assignment.disasterType}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Disaster #{assignment.disasterId} · Assignment #{assignment.id}
              </div>
            </div>
          </div>
          <SeverityBadge severity={assignment.disasterSeverity} />
        </div>

        <div style={{
          background: 'var(--bg-surface-2)',
          borderRadius: '10px', padding: '12px', marginBottom: '14px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <DetailRow label="Organization"  value={assignment.organizationName} />
            <DetailRow label="Method"        value={assignment.method === 'Auto' ? '🤖 Auto' : '👤 Manual'} />
            <DetailRow
              label="Assigned At"
              value={new Date(assignment.assignedAt).toLocaleString('en-PK', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            />
            <DetailRow
              label="GPS Status"
              value={gpsActive ? '🟢 Live Sharing' : gpsError ? '🔴 GPS Error' : '⚪ Standby'}
            />
          </div>
        </div>

        {gpsActive && distanceMeters !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', marginBottom: '14px',
            background: 'var(--accent-subtle)', borderRadius: '10px',
            border: '1px solid var(--border-strong)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <Compass size={16} className="spin-slow" style={{ color: 'var(--accent)' }} />
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Live Geofence Distance: <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{distanceMeters} meters</span>
            </div>
          </div>
        )}

        {assignment.disasterDescription && (
          <p style={{
            fontSize: '12px', color: 'var(--text-secondary)',
            marginBottom: '14px', lineHeight: 1.5,
            padding: '10px 12px',
            background: 'var(--bg-surface-2)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--accent)',
          }}>
            {assignment.disasterDescription?.slice(0, 120)}
            {assignment.disasterDescription?.length > 120 ? '...' : ''}
          </p>
        )}

        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              STATUS FLOW
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: config.color }}>
              {config.emoji} {config.label || assignment.status}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STATUS_FLOW.map((s, i) => {
              const currentIdx = STATUS_FLOW.indexOf(assignment.status);
              const isDone     = i <= currentIdx;
              const isActive   = i === currentIdx;
              const col        = STATUS_CONFIG[s]?.color || '#a0aec0';

              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_FLOW.length - 1 ? 1 : 'none' }}>
                  <div style={{
                    width:  isActive ? '14px' : '10px',
                    height: isActive ? '14px' : '10px',
                    borderRadius: '50%',
                    background: isDone ? col : 'var(--border)',
                    border:     isActive ? `2px solid ${col}` : 'none',
                    boxShadow:  isActive ? `0 0 8px ${col}` : 'none',
                    flexShrink: 0, transition: 'all 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone && !isActive && (
                      <span style={{ fontSize: '7px', color: '#fff' }}>✓</span>
                    )}
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div style={{
                      flex: 1, height: '2px',
                      background: i < currentIdx ? (STATUS_CONFIG[STATUS_FLOW[i+1]]?.color || col) : 'var(--border)',
                      transition: 'background 0.3s',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {STATUS_FLOW.map(s => (
              <span key={s} style={{
                fontSize: '9px',
                color: s === assignment.status ? (STATUS_CONFIG[s]?.color || 'var(--text-primary)') : 'var(--text-muted)',
                fontWeight: s === assignment.status ? 700 : 400,
              }}>
                {STATUS_CONFIG[s]?.emoji} {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {assignment.status !== 'Completed' && (
            <button
              onClick={() => navigate(`/responder/navigate/${assignment.id}`)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', background: 'rgba(66,153,225,0.1)', color: '#4299e1', border: '1px solid rgba(66,153,225,0.3)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              🧭 Navigate to Location
            </button>
          )}
          {config.next && (
            <button
              onClick={() => handleStatusUpdate(config.next)}
              disabled={updating}
              style={{
                flex: 1, minWidth: '160px', padding: '12px',
                background: updating
                  ? 'var(--border)'
                  : config.next === 'Complete'
                    ? 'linear-gradient(135deg, #145c33, #27ae60)'
                    : `linear-gradient(135deg, ${config.color}cc, ${config.color})`,
                color: '#fff', border: 'none',
                borderRadius: '10px', fontSize: '14px',
                fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
                boxShadow: updating ? 'none' : `0 4px 12px rgba(0,0,0,0.15)`,
                fontFamily: 'var(--font-display)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
              }}
            >
              {updating ? '⏳ Updating...' : config.nextLabel}
            </button>
          )}

          {/* Leave simulation trigger for testing */}
          {(assignment.status === 'OperationStarted' || assignment.status === 'OnSite') && (
            <button
              onClick={simulateLeavingGeofence}
              style={{
                padding: '8px 12px', fontSize: '11px', fontWeight: 600,
                background: 'rgba(221,107,32,0.1)', color: '#dd6b20',
                border: '1px solid rgba(221,107,32,0.25)', borderRadius: '8px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              🏃 Leave Geofence (Simulate)
            </button>
          )}
        </div>

        {assignment.status === 'Completed' && (
          <div style={{ marginTop: '14px' }}>
            <div style={{
              textAlign: 'center', padding: '10px',
              background: 'rgba(56,161,105,0.08)',
              border: '1px solid rgba(56,161,105,0.25)',
              borderRadius: '10px',
              fontSize: '13px', fontWeight: 600, color: '#38a169',
              marginBottom: assignment.completionNotes ? '12px' : '0',
            }}>
              ✅ Assignment Completed
              {assignment.completedAt && (
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
                  {new Date(assignment.completedAt).toLocaleString('en-PK', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {assignment.completionNotes && (
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-surface-2)',
                borderRadius: '8px', marginBottom: '10px',
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                  📋 COMPLETION NOTES
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {assignment.completionNotes}
                </p>
              </div>
            )}

            {assignment.completionPhotoBase64 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                  📷 PROOF PHOTO
                </div>
                <img
                  src={assignment.completionPhotoBase64}
                  alt="Completion proof"
                  style={{
                    width: '100%', maxHeight: '180px',
                    objectFit: 'cover', borderRadius: '10px',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}
                  onClick={() => window.open(assignment.completionPhotoBase64, '_blank')}
                  title="Click to view full size"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {geofenceType && (
        <GeofenceNotification
          type={geofenceType}
          onStartOp={handleStartOperation}
          onComplete={() => setShowProofModal(true)}
          onDismiss={() => {
            setGeofenceType(null);
            if (geofenceType === 'leaving') setHasPromptedLeaving(true);
          }}
        />
      )}

      {showProofModal && (
        <CompletionModal
          assignment={assignment}
          onConfirm={handleComplete}
          onCancel={() => setShowProofModal(false)}
          loading={updating}
        />
      )}
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}