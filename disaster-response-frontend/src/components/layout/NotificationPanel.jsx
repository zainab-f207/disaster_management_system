import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlertStore } from '../../store';
import { Bell, X, ChevronRight, AlertTriangle, FileText, Truck } from 'lucide-react';

export default function NotificationPanel() {
  const [isOpen, setIsOpen]       = useState(false);
  const { alerts, unreadCount, markAllRead, clearAlerts } = useAlertStore();
  const navigate = useNavigate();

  const handleOpen = () => {
    setIsOpen(true);
    markAllRead();
  };

  const handleAlertClick = (alert) => {
    setIsOpen(false);
    if (alert.type === 'disaster' && alert.disasterId)
      navigate(`/disasters/${alert.disasterId}`);
    else if (alert.type === 'report')
      navigate('/admin');
    else if (alert.type === 'assignment' && alert.disasterId)
      navigate(`/disasters/${alert.disasterId}`);
  };

  const getAlertIcon = (alert) => {
    if (alert.type === 'disaster')   return '🚨';
    if (alert.type === 'report')     return '📩';
    if (alert.type === 'assignment') return '🚒';
    return '🔔';
  };

  const getAlertColor = (alert) => {
    if (alert.type === 'disaster') {
      return { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' }[alert.severity] || '#38a169';
    }
    if (alert.type === 'report')     return '#9f7aea';
    if (alert.type === 'assignment') return '#4299e1';
    return '#a0aec0';
  };

  const getAlertTitle = (alert) => {
    if (alert.type === 'disaster')
      return `${alert.severity} ${alert.disasterType} Alert${alert.affectedCity ? ` — ${alert.affectedCity}` : ''}`;
    if (alert.type === 'report')
      return `New Report by ${alert.reportedBy}`;
    if (alert.type === 'assignment')
      return `${alert.organizationName} → ${alert.status}`;
    return 'Notification';
  };

  const getAlertBody = (alert) => {
    if (alert.type === 'disaster')
      return alert.description?.slice(0, 80) + (alert.description?.length > 80 ? '...' : '');
    if (alert.type === 'report')
      return alert.description?.slice(0, 80) + '...';
    if (alert.type === 'assignment')
      return `Disaster #${alert.disasterId} — ${alert.method === 'Auto' ? 'Auto-assigned' : 'Manual override'}`;
    return '';
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          width: '38px', height: '38px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-secondary)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-6px',
            background: '#e53e3e', color: '#fff',
            fontSize: '10px', fontWeight: 700,
            minWidth: '18px', height: '18px',
            borderRadius: '9px', padding: '0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'scaleIn 0.2s ease',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.15s ease',
          }}
        />
      )}

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: '72px', right: '16px',
          width: 'min(400px, calc(100vw - 32px))',
          maxHeight: '80vh',
          zIndex: 999,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'fadeInDown 0.2s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-surface)',
          }}>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '15px',
                fontWeight: 700, color: 'var(--text-primary)',
              }}>
                🔔 Notifications
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''} this session
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {alerts.length > 0 && (
                <button
                  onClick={clearAlerts}
                  style={{
                    fontSize: '11px', fontWeight: 600,
                    color: 'var(--text-muted)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                  borderRadius: '8px', width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {alerts.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔕</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Real-time alerts appear here
                </div>
              </div>
            ) : (
              alerts.map((alert, i) => {
                const color = getAlertColor(alert);
                return (
                  <div
                    key={alert.id || i}
                    onClick={() => handleAlertClick(alert)}
                    style={{
                      padding: '13px 18px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      transition: 'background 0.15s',
                      animation: `fadeInDown 0.2s ease ${i * 20}ms both`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '36px', height: '36px', flexShrink: 0,
                      borderRadius: '10px',
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px',
                    }}>
                      {getAlertIcon(alert)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 700,
                        color: 'var(--text-primary)', marginBottom: '2px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {getAlertTitle(alert)}
                      </div>
                      {getAlertBody(alert) && (
                        <div style={{
                          fontSize: '12px', color: 'var(--text-secondary)',
                          lineHeight: 1.4, marginBottom: '4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {getAlertBody(alert)}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(alert.createdAt || Date.now()).toLocaleTimeString('en-PK', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}
                        <span style={{ color, fontWeight: 600 }}>
                          {alert.type === 'disaster' ? 'Tap to view disaster' :
                           alert.type === 'report'   ? 'Tap to review' :
                           'Tap to view details'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '4px' }} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}