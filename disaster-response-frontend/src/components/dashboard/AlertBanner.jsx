import { useState, useEffect } from 'react';
import { useAlertStore } from '../../store';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';

export default function AlertBanner() {
  const { alerts } = useAlertStore();
  const [dismissed, setDismissed] = useState(new Set());
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const active = alerts
      .filter(a => a.type === 'disaster' && !dismissed.has(a.id))
      .slice(0, 3);
    setVisible(active);
  }, [alerts, dismissed]);

  if (!visible.length) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      {visible.map((alert, i) => {
        const isC = alert.severity === 'Critical';
        const isH = alert.severity === 'High';
        const bgColor = isC ? 'rgba(229,62,62,0.08)' : isH ? 'rgba(221,107,32,0.08)' : 'rgba(214,158,46,0.08)';
        const borderColor = isC ? '#e53e3e' : isH ? '#dd6b20' : '#d69e2e';
        const textColor = isC ? '#e53e3e' : isH ? '#dd6b20' : '#d69e2e';
        const emoji = { Flood: '🌊', Earthquake: '🌍', Fire: '🔥', Storm: '⛈️', Heatwave: '🌡️', Other: '⚠️' };

        return (
          <div
            key={alert.id}
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderLeft: `4px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'alert-slide 0.3s ease',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: '-4px',
                borderRadius: '50%',
                border: `2px solid ${borderColor}`,
                animation: 'pulse-ring 2s ease-out infinite',
                opacity: 0.5,
              }} />
              <span style={{ fontSize: '20px' }}>{emoji[alert.disasterType] || '⚠️'}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: textColor }}>
                  {alert.severity} {alert.disasterType} Alert
                </span>
                <span style={{
                  fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                  background: textColor, color: '#fff', fontWeight: 700,
                }}>
                  {alert.affectedCity || 'Pakistan'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {alert.description}
              </p>
              {alert.assignedOrganization && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                  🚒 Responding: {alert.assignedOrganization} • {alert.assignedOrgContact}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(alert.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => setDismissed(d => new Set([...d, alert.id]))}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: '2px',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
