import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  BarChart3, TrendingUp, MapPin, Clock, Users, AlertTriangle,
  RefreshCw, Award
} from 'lucide-react';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, disRes] = await Promise.all([
        api.get('/stats').catch(() => ({ data: null })),
        api.get('/disasters').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setDisasters(disRes.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Computed analytics from raw disaster data */
  const now = Date.now();
  const periodMs = parseInt(period) * 86400000;
  const inPeriod = disasters.filter(d => new Date(d.reportedAt).getTime() > now - periodMs);

  const byType = inPeriod.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {});
  const bySeverity = inPeriod.reduce((acc, d) => { acc[d.severity] = (acc[d.severity] || 0) + 1; return acc; }, {});
  const byCity = inPeriod.reduce((acc, d) => {
    const city = d.locationName?.split(',')[0]?.trim() || 'Unknown';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const total = inPeriod.length || 1;
  const resolved = inPeriod.filter(d => d.status === 'Resolved').length;
  const resolutionRate = Math.round((resolved / total) * 100);

  const sevColors = { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' };
  const typeEmojis = { Flood: '🌊', Earthquake: '🌍', Storm: '⛈️', Heatwave: '🌡️', Smog: '🌫️', UrbanFire: '🔥', BuildingCollapse: '🏚️', RoadAccident: '🚗', Other: '⚠️', Landslide: '⛰️', ColdWave: '❄️', GasExplosion: '💥', Stampede: '👥', WaterContamination: '💧', PowerGridFailure: '🔌' };

  const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' };

  const StatCard = ({ icon, label, value, sub, color = 'var(--accent)' }) => (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '26px', fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  );

  const BarRow = ({ label, value, max, color, emoji }) => {
    const pct = Math.round((value / max) * 100);
    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{emoji} {label}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{value}</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-surface-2)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: '8px', transition: 'width 1s ease' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#1a365d,#4299e1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(66,153,225,0.3)' }}>
            <BarChart3 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Disaster frequency, city impact, severity breakdown</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="9999">All time</option>
          </select>
          <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '100px', borderRadius: '16px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px', marginBottom: '28px', animation: 'fadeInUp 0.4s ease' }}>
            <StatCard icon={<AlertTriangle size={22} color="#e53e3e" />} label="Total Incidents" value={inPeriod.length} sub={`Last ${period} days`} color="#e53e3e" />
            <StatCard icon={<TrendingUp size={22} color="#38a169" />} label="Resolution Rate" value={`${resolutionRate}%`} sub={`${resolved} resolved`} color="#38a169" />
            <StatCard icon={<Clock size={22} color="#d69e2e" />} label="Active Now" value={inPeriod.filter(d => ['Active','Verified'].includes(d.status)).length} sub="Active/Verified" color="#d69e2e" />
            <StatCard icon={<Users size={22} color="#3182ce" />} label="Citizens Reporting" value={stats?.activeCitizens ?? '—'} sub="Platform total" color="#3182ce" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Disaster by type */}
            <div style={card}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={16} color="var(--accent)" /> Disasters by Type
              </h3>
              {topTypes.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No data for selected period.</div>
              ) : topTypes.map(([type, count]) => (
                <BarRow key={type} label={type} value={count} max={topTypes[0][1]} color="var(--accent)" emoji={typeEmojis[type] || '⚠️'} />
              ))}
            </div>

            {/* Severity breakdown */}
            <div style={card}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} color="#dd6b20" /> Severity Breakdown
              </h3>
              {['Critical', 'High', 'Medium', 'Low'].map(sev => {
                const count = bySeverity[sev] || 0;
                const max = Math.max(...Object.values(bySeverity), 1);
                return <BarRow key={sev} label={sev} value={count} max={max} color={sevColors[sev]} emoji={{ Critical: '🔴', High: '🟠', Medium: '🟡', Low: '🟢' }[sev]} />;
              })}
            </div>
          </div>

          {/* Most affected cities */}
          <div style={card}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} color="#e53e3e" /> Most Affected Cities / Areas
            </h3>
            {topCities.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No location data for selected period.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                {topCities.map(([city, count]) => (
                  <BarRow key={city} label={city} value={count} max={topCities[0][1]} color="#e53e3e" emoji="📍" />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
