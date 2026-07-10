import { useState } from 'react';
import api from '../../services/api';
import { DisasterIcon, SeverityBadge } from '../ui';
import CompletionModal from './CompletionModal';
import toast from 'react-hot-toast';

const STATUS_FLOW   = ['Assigned', 'EnRoute', 'OnSite', 'Completed'];
const STATUS_CONFIG = {
  Assigned:  { color: '#a0aec0', emoji: '📋', next: 'EnRoute',  nextLabel: '🚗 Start Journey' },
  EnRoute:   { color: '#4299e1', emoji: '🚗', next: 'OnSite',   nextLabel: '📍 Arrived On Site' },
  OnSite:    { color: '#d69e2e', emoji: '📍', next: 'Complete', nextLabel: '✅ Mark Complete' },
  Completed: { color: '#38a169', emoji: '✅', next: null,        nextLabel: null },
  Cancelled: { color: '#e53e3e', emoji: '❌', next: null,        nextLabel: null },
};

export default function AssignmentCard({ assignment, onStatusUpdated }) {
  const [updating, setUpdating]             = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const config = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.Assigned;

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'Complete') {
      setShowProofModal(true);
      return;
    }
    setUpdating(true);
    try {
      await api.put(`/assignments/${assignment.id}/status`, { status: newStatus });
      toast.success(`Status updated: ${newStatus} 👍`);
      onStatusUpdated?.();
    } catch {
      toast.error('Failed to update status');
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
      onStatusUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit completion');
    } finally {
      setUpdating(false);
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
              label="Contact"
              value={assignment.organizationContact || '—'}
            />
          </div>
        </div>

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
              STATUS
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: config.color }}>
              {config.emoji} {assignment.status}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STATUS_FLOW.map((s, i) => {
              const currentIdx = STATUS_FLOW.indexOf(assignment.status);
              const isDone     = i <= currentIdx;
              const isActive   = i === currentIdx;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_FLOW.length - 1 ? 1 : 'none' }}>
                  <div style={{
                    width:  isActive ? '14px' : '10px',
                    height: isActive ? '14px' : '10px',
                    borderRadius: '50%',
                    background: isDone ? config.color : 'var(--border)',
                    border:     isActive ? `2px solid ${config.color}` : 'none',
                    boxShadow:  isActive ? `0 0 8px ${config.color}` : 'none',
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
                      background: i < currentIdx ? config.color : 'var(--border)',
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
                color: s === assignment.status ? config.color : 'var(--text-muted)',
                fontWeight: s === assignment.status ? 700 : 400,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {config.next && (
          <button
            onClick={() => handleStatusUpdate(config.next)}
            disabled={updating}
            style={{
              width: '100%', padding: '12px',
              background: updating
                ? 'var(--border)'
                : config.next === 'Complete'
                  ? 'linear-gradient(135deg, #145c33, #27ae60)'
                  : `linear-gradient(135deg, ${config.color}cc, ${config.color})`,
              color: '#fff', border: 'none',
              borderRadius: '10px', fontSize: '14px',
              fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
              boxShadow: updating ? 'none' : `0 4px 12px rgba(0,0,0,0.2)`,
              fontFamily: 'var(--font-display)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
            }}
          >
            {updating ? '⏳ Updating...' : config.nextLabel}
          </button>
        )}

        {assignment.status === 'Completed' && (
          <div>
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