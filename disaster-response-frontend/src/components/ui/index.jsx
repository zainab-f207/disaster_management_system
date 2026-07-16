// ── Severity Badge ───────────────────────────────────────────────────────────
export function SeverityBadge({ severity }) {
  const config = {
    Critical: { bg: 'rgba(229,62,62,0.12)', color: '#e53e3e', dot: '#e53e3e', label: 'Critical' },
    High: { bg: 'rgba(221,107,32,0.12)', color: '#dd6b20', dot: '#dd6b20', label: 'High' },
    Medium: { bg: 'rgba(214,158,46,0.12)', color: '#d69e2e', dot: '#d69e2e', label: 'Medium' },
    Low: { bg: 'rgba(56,161,105,0.12)', color: '#38a169', dot: '#38a169', label: 'Low' },
  };
  const c = config[severity] || config.Low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 9px', borderRadius: '20px',
      background: c.bg, color: c.color,
      fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em',
      textTransform: 'uppercase',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: c.dot,
        boxShadow: `0 0 6px ${c.dot}`,
        animation: severity === 'Critical' ? 'pulse-dot 1.5s infinite' : 'none',
      }} />
      {c.label}
    </span>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const config = {
    Verified: { bg: 'rgba(56,161,105,0.1)', color: '#38a169' },
    ResponseInProgress: { bg: 'rgba(66,153,225,0.1)', color: '#4299e1' },
    Reported: { bg: 'rgba(160,174,192,0.1)', color: '#a0aec0' },
    UnderVerification: { bg: 'rgba(214,158,46,0.1)', color: '#d69e2e' },
    Resolved: { bg: 'rgba(56,161,105,0.08)', color: '#68d391' },
    FalseAlarm: { bg: 'rgba(160,174,192,0.08)', color: '#a0aec0' },
    AlertActive: { bg: 'rgba(214,158,46,0.1)', color: '#d69e2e' },
    AlertExpired: { bg: 'rgba(160,174,192,0.08)', color: '#a0aec0' },
  };
  const c = config[status] || config.Reported;
  const labels = {
    ResponseInProgress: 'In Progress',
    UnderVerification: 'Verifying',
    AlertActive: '⚠️ Alert Active',
    AlertExpired: 'Alert Expired',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: '20px',
      background: c.bg, color: c.color,
      fontSize: '11px', fontWeight: 600,
    }}>
      {labels[status] || status}
    </span>
  );
}

// ── Source Badge ─────────────────────────────────────────────────────────────
export function SourceBadge({ source }) {
  const config = {
    WeatherApi: { label: '🌦 Weather API', color: '#4299e1' },
    EarthquakeApi: { label: '🌍 USGS Feed', color: '#ed8936' },
    CitizenReport: { label: '👤 Citizen Report', color: '#9f7aea' },
  };
  const c = config[source] || { label: source, color: '#a0aec0' };
  return (
    <span style={{ fontSize: '11px', color: c.color, fontWeight: 500 }}>
      {c.label}
    </span>
  );
}

// ── Disaster Type Icon ────────────────────────────────────────────────────────
export function DisasterIcon({ type, size = 24 }) {
  const icons = {
    Flood: '🌊', Earthquake: '🌍', Fire: '🔥',
    Storm: '⛈️', Heatwave: '🌡️', Landslide: '⛰️', Other: '⚠️',
  };
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      {icons[type] || '⚠️'}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color, trend, delay = 0 }) {
  return (
    <div
      className="animate-fade-up"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
    >
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: color, opacity: 0.07,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{
            fontSize: '32px', fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)', lineHeight: 1,
          }}>
            {value}
          </div>
          {trend && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {trend}
            </div>
          )}
        </div>
        <div style={{
          width: '42px', height: '42px',
          borderRadius: '12px',
          background: color,
          opacity: 0.15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          <span style={{ opacity: 6.67 }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

// ── Disaster Card ─────────────────────────────────────────────────────────────
export function DisasterCard({ disaster, onClick, delay = 0 }) {
  const severityBorders = {
    Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169',
  };

  return (
    <div
      className="animate-fade-up"
      onClick={() => onClick?.(disaster)}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${severityBorders[disaster.severity] || '#38a169'}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-surface-2)';
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--card-bg)';
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DisasterIcon type={disaster.type} size={22} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {disaster.type}
            </div>
            <SourceBadge source={disaster.source} />
          </div>
        </div>
        <SeverityBadge severity={disaster.severity} />
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.5 }}>
        {disaster.description?.slice(0, 100)}{disaster.description?.length > 100 ? '...' : ''}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatusBadge status={disaster.status} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {new Date(disaster.reportedAt).toLocaleString('en-PK', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
export function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', padding: '16px',
    }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: '14px', width: '60%', marginBottom: '6px' }} />
          <div className="skeleton" style={{ height: '10px', width: '40%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: '12px', marginBottom: '6px' }} />
      <div className="skeleton" style={{ height: '12px', width: '80%' }} />
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '18px',
          fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
