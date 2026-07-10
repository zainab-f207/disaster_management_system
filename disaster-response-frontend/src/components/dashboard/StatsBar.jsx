import { useMemo } from 'react';
import { StatCard } from '../ui';

export default function StatsBar({ disasters, loading }) {
  const stats = useMemo(() => {
    if (!disasters?.length) return { total: 0, critical: 0, active: 0, resolved: 0 };
    return {
      total: disasters.length,
      critical: disasters.filter(d => d.severity === 'Critical').length,
      active: disasters.filter(d => !['Resolved', 'FalseAlarm'].includes(d.status)).length,
      resolved: disasters.filter(d => d.status === 'Resolved').length,
    };
  }, [disasters]);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '96px', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '28px',
    }}>
      <StatCard
        label="Total Disasters"
        value={stats.total}
        icon="🗺️"
        color="var(--accent)"
        trend="All recorded events"
        delay={0}
      />
      <StatCard
        label="Critical Alerts"
        value={stats.critical}
        icon="🚨"
        color="#e53e3e"
        trend={stats.critical > 0 ? 'Immediate response needed' : 'All clear'}
        delay={50}
      />
      <StatCard
        label="Active Events"
        value={stats.active}
        icon="⚡"
        color="#dd6b20"
        trend="Ongoing response"
        delay={100}
      />
      <StatCard
        label="Resolved"
        value={stats.resolved}
        icon="✅"
        color="#38a169"
        trend="Successfully handled"
        delay={150}
      />

      <style>{`
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 500px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
