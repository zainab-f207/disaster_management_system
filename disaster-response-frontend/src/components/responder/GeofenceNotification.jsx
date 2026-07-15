import { useState, useEffect } from 'react';

/**
 * GeofenceNotification — a floating, animated overlay card that appears when:
 *   - 'on-scene'  : Responder arrived at the incident (≤20m). Shows [Start Operation].
 *   - 'leaving'   : Responder leaving geofence (>150m after being on-scene). Shows [Complete Mission] / [Still Working].
 *   - 'still-working' : Dismissible reminder banner after choosing Still Working.
 *
 * Props:
 *   type          — 'on-scene' | 'leaving' | null
 *   onStartOp     — called when [Start Operation] tapped
 *   onComplete    — called when [Complete Mission] tapped
 *   onDismiss     — called when notification is closed
 */
export default function GeofenceNotification({ type, onStartOp, onComplete, onDismiss }) {
  const [stillWorkingBanner, setStillWorkingBanner] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type) {
      setVisible(true);
      setStillWorkingBanner(false);
    } else {
      setVisible(false);
    }
  }, [type]);

  if (!visible && !stillWorkingBanner) return null;

  // ─── Still Working reminder banner ───────────────────────────────────────
  if (stillWorkingBanner) {
    return (
      <div style={{
        position: 'fixed', bottom: '24px', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3000, width: 'min(92vw, 480px)',
        animation: 'slideInUp 0.3s ease',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a365d, #2a4a7f)',
          border: '1px solid rgba(66,153,225,0.4)',
          borderRadius: '16px', padding: '16px 20px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <span style={{ fontSize: '28px', flexShrink: 0 }}>🛠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#90cdf4', marginBottom: '3px' }}>
              Still on mission
            </div>
            <div style={{ fontSize: '12px', color: '#bee3f8', lineHeight: 1.5 }}>
              When you're done, open the app and mark the assignment as complete, then upload your proof.
            </div>
          </div>
          <button
            onClick={() => { setStillWorkingBanner(false); onDismiss?.(); }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px', padding: '6px 14px',
              color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  // ─── On-Scene notification ────────────────────────────────────────────────
  if (type === 'on-scene') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(56,161,105,0.4)',
          borderRadius: '20px', padding: '32px 28px',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,161,105,0.15)',
          animation: 'scaleIn 0.25s ease',
          textAlign: 'center',
        }}>
          {/* Pulsing icon */}
          <div style={{
            width: '72px', height: '72px',
            background: 'linear-gradient(135deg, #145c33, #27ae60)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 0 12px rgba(56,161,105,0.15), 0 0 0 24px rgba(56,161,105,0.07)',
            animation: 'pulse-dot 2s infinite',
            fontSize: '32px',
          }}>
            📍
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '22px',
            fontWeight: 900, color: 'var(--text-primary)', marginBottom: '10px',
          }}>
            You've Arrived at the Incident
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            You are within the incident zone. Confirm that you have begun your response operation.
          </p>

          <button
            onClick={() => { setVisible(false); onStartOp?.(); }}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #145c33, #27ae60)',
              color: '#fff', border: 'none',
              borderRadius: '14px', fontSize: '17px',
              fontWeight: 800, cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 6px 24px rgba(33,150,83,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(33,150,83,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(33,150,83,0.4)'; }}
          >
            🚀 Start Operation
          </button>
        </div>
      </div>
    );
  }

  // ─── Leaving geofence notification ────────────────────────────────────────
  if (type === 'leaving') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(221,107,32,0.4)',
          borderRadius: '20px', padding: '32px 28px',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'scaleIn 0.25s ease',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #c05621, #dd6b20)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '28px',
          }}>
            🚶
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '20px',
            fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px',
          }}>
            Leaving the Incident Zone
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            You appear to be moving away from the incident location.
          </p>

          <div style={{ display: 'grid', gap: '10px' }}>
            <button
              onClick={() => { setVisible(false); onComplete?.(); }}
              style={{
                padding: '14px',
                background: 'linear-gradient(135deg, #145c33, #27ae60)',
                color: '#fff', border: 'none',
                borderRadius: '12px', fontSize: '15px',
                fontWeight: 800, cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 4px 16px rgba(33,150,83,0.35)',
              }}
            >
              ✅ Complete Mission
            </button>
            <button
              onClick={() => {
                setVisible(false);
                setStillWorkingBanner(true);
                onDismiss?.();
              }}
              style={{
                padding: '13px',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '12px', fontSize: '14px',
                fontWeight: 700, cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              🛠️ Still Working
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
