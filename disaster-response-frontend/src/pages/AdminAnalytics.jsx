import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, MapPin, Clock, Users, AlertTriangle,
  RefreshCw, Calendar, BookOpen,
} from 'lucide-react';

const sevColors = { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' };
const typeEmojis = {
  Flood: '🌊', Earthquake: '🌍', Storm: '⛈️', Heatwave: '🌡️', Smog: '🌫️',
  UrbanFire: '🔥', BuildingCollapse: '🏚️', RoadAccident: '🚗', Other: '⚠️',
  Landslide: '⛰️', ColdWave: '❄️', GasExplosion: '💥', Stampede: '👥',
  WaterContamination: '💧', PowerGridFailure: '🔌',
};
const GLIDE_TYPE_MAP = {
  FL: 'Flood', EQ: 'Earthquake', ST: 'Storm', TC: 'Storm',
  LS: 'Landslide', DR: 'Drought', HT: 'Heatwave',
  AV: 'Other', WF: 'Other', EP: 'Other',
};
const EVENT_COLORS = {
  Flood: '#3182ce', Earthquake: '#e53e3e', Storm: '#805ad5', Landslide: '#dd6b20',
  Drought: '#d69e2e', Heatwave: '#e05252', Other: '#718096',
};

function parseCSV(text) {
  const lines = [];
  let row = [''], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"') { if (inQ && n === '"') { row[row.length - 1] += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) row.push('');
    else if ((c === '\r' || c === '\n') && !inQ) {
      if (c === '\r' && n === '\n') i++;
      lines.push(row); row = [''];
    } else row[row.length - 1] += c;
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (line[i] || '').trim(); });
    return obj;
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      fontSize: '12px',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: <strong>{p.value?.toLocaleString?.() ?? p.value}</strong>
        </div>
      ))}
    </div>
  );
}

const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' };

function StatCard({ icon, label, value, sub, color = 'var(--accent)' }) {
  return (
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
}

function BarRow({ label, value, max, color, emoji }) {
  const pct = Math.round((value / max) * 100) || 0;
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
}

export default function AdminAnalytics() {
  const [view, setView] = useState('combined');
  const [period, setPeriod] = useState('30');

  const [disasters, setDisasters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingLive, setLoadingLive] = useState(true);

  const [records, setRecords] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [histError, setHistError] = useState(null);

  const fetchLive = useCallback(async () => {
    setLoadingLive(true);
    try {
      const [statsRes, disRes] = await Promise.all([
        api.get('/stats').catch(() => ({ data: null })),
        api.get('/disasters').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setDisasters(disRes.data || []);
    } finally { setLoadingLive(false); }
  }, []);

  const fetchHistorical = useCallback(async () => {
    setLoadingHist(true);
    try {
      const res = await api.get('/geocoding/historical-events');
      const raw = parseCSV(res.data);
      const mapped = raw.map(r => ({
        type: GLIDE_TYPE_MAP[r.event?.slice(0, 2)] || 'Other',
        killed: parseInt(r.killed) || 0,
        affected: parseInt(r.affected) || 0,
        year: parseInt(r.year) || 0,
      })).filter(r => r.year >= 1990 && r.year <= new Date().getFullYear());
      setRecords(mapped);
      setHistError(null);
    } catch {
      setHistError('Could not load historical dataset.');
    } finally { setLoadingHist(false); }
  }, []);

  useEffect(() => { fetchLive(); fetchHistorical(); }, [fetchLive, fetchHistorical]);

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
  const sevPieData = ['Critical', 'High', 'Medium', 'Low']
    .map(s => ({ name: s, value: bySeverity[s] || 0 }))
    .filter(d => d.value > 0);

  const total = inPeriod.length || 1;
  const resolved = inPeriod.filter(d => d.status === 'Resolved').length;
  const resolutionRate = Math.round((resolved / total) * 100);

  const dailyTrend = (() => {
    const days = parseInt(period) > 90 ? 90 : parseInt(period); // cap trend line at 90 pts for readability
    const map = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
      map[key] = 0;
    }
    inPeriod.forEach(d => {
      const dt = new Date(d.reportedAt);
      if (now - dt.getTime() > days * 86400000) return;
      const key = dt.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
      if (key in map) map[key] += 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  })();

  const byYear = (() => {
    const map = {};
    records.forEach(r => {
      if (!r.year) return;
      if (!map[r.year]) map[r.year] = { year: r.year, events: 0, killed: 0, affected: 0 };
      map[r.year].events++;
      map[r.year].killed += r.killed;
      map[r.year].affected += r.affected;
    });
    return Object.values(map).sort((a, b) => a.year - b.year);
  })();

  const histByType = (() => {
    const map = {};
    records.forEach(r => {
      if (!map[r.type]) map[r.type] = { name: r.type, value: 0 };
      map[r.type].value++;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  })();

  const histTotals = records.reduce((acc, r) => ({
    events: acc.events + 1, killed: acc.killed + r.killed, affected: acc.affected + r.affected,
  }), { events: 0, killed: 0, affected: 0 });

  const recentYears = byYear.slice(-10);
  const avgEventsPerYear = recentYears.length
    ? Math.round(recentYears.reduce((s, y) => s + y.events, 0) / recentYears.length)
    : 0;
  const annualizedCurrentRate = Math.round(inPeriod.length * (365 / parseInt(period)));

  const loading = loadingLive || loadingHist;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#1a365d,#4299e1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(66,153,225,0.3)' }}>
            <BarChart3 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Live incidents combined with Pakistan's historical disaster record</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={view}
            onChange={e => setView(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--accent-subtle)', border: '1.5px solid var(--accent)', borderRadius: '10px', color: 'var(--accent)', fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
          >
            <option value="combined">📊 Combined (Live + Historical)</option>
            <option value="live">⚡ Live Analytics Only</option>
            <option value="historical">📚 Historical Analytics Only</option>
          </select>

          {(view === 'live' || view === 'combined') && (
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="9999">All time</option>
            </select>
          )}

          <button onClick={() => { fetchLive(); fetchHistorical(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '100px', borderRadius: '16px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <>
          {(view === 'live' || view === 'combined') && (
            <section style={{ marginBottom: view === 'combined' ? '36px' : 0 }}>
              {view === 'combined' && (
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚡ Live Activity <span style={{ fontSize: '11px', fontWeight: 700, color: '#38a169', background: 'rgba(56,161,105,0.1)', padding: '3px 8px', borderRadius: '8px' }}>Last {period === '9999' ? 'all time' : `${period} days`}</span>
                </h2>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px', marginBottom: '20px', animation: 'fadeInUp 0.4s ease' }}>
                <StatCard icon={<AlertTriangle size={22} color="#e53e3e" />} label="Total Incidents" value={inPeriod.length} sub={`Selected window`} color="#e53e3e" />
                <StatCard icon={<TrendingUp size={22} color="#38a169" />} label="Resolution Rate" value={`${resolutionRate}%`} sub={`${resolved} resolved`} color="#38a169" />
                <StatCard icon={<Clock size={22} color="#d69e2e" />} label="Active Now" value={inPeriod.filter(d => ['Verified', 'ResponseInProgress'].includes(d.status)).length} sub="Verified/In-progress" color="#d69e2e" />
                <StatCard icon={<Users size={22} color="#3182ce" />} label="Citizens Reporting" value={stats?.activeCitizens ?? '—'} sub="Platform total" color="#3182ce" />
              </div>

              <div style={{ ...card, marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} color="var(--accent)" /> Incident Trend
                </h3>
                {dailyTrend.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No data for this window.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyTrend} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="count" name="Incidents" stroke="#e53e3e" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
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

                <div style={card}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color="#dd6b20" /> Severity Breakdown
                  </h3>
                  {sevPieData.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No data for selected period.</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <ResponsiveContainer width="55%" height={180}>
                        <PieChart>
                          <Pie data={sevPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                            {sevPieData.map(entry => <Cell key={entry.name} fill={sevColors[entry.name]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {sevPieData.map(s => (
                          <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: 9, height: 9, borderRadius: '50%', background: sevColors[s.name], display: 'inline-block' }} /> {s.name}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: sevColors[s.name] }}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
            </section>
          )}

          {(view === 'historical' || view === 'combined') && (
            <section style={{ marginBottom: view === 'combined' ? '36px' : 0 }}>
              {view === 'combined' && (
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📚 Historical Record <span style={{ fontSize: '11px', fontWeight: 700, color: '#805ad5', background: 'rgba(128,90,213,0.1)', padding: '3px 8px', borderRadius: '8px' }}>GLIDE / HDX · 1990–present</span>
                </h2>
              )}

              {histError ? (
                <div style={{ ...card, textAlign: 'center', color: '#e53e3e', padding: '30px' }}>⚠️ {histError}</div>
              ) : records.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No historical records available.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '16px', marginBottom: '20px' }}>
                    <StatCard icon={<Calendar size={20} color="#805ad5" />} label="Total Historical Events" value={histTotals.events.toLocaleString()} color="#805ad5" />
                    <StatCard icon={<AlertTriangle size={20} color="#e53e3e" />} label="Total Deaths Recorded" value={histTotals.killed.toLocaleString()} color="#e53e3e" />
                    <StatCard icon={<Users size={20} color="#3182ce" />} label="Total People Affected" value={histTotals.affected >= 1e6 ? `${(histTotals.affected / 1e6).toFixed(1)}M` : histTotals.affected.toLocaleString()} color="#3182ce" />
                    <StatCard icon={<BookOpen size={20} color="#38a169" />} label="Avg Events / Year (last 10y)" value={avgEventsPerYear} color="#38a169" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '20px' }}>
                    <div style={card}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                        Events per Year
                      </h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={byYear} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="events" name="Events" radius={[6, 6, 0, 0]} fill="#805ad5" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={card}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                        By Disaster Type
                      </h3>
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie data={histByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={72} paddingAngle={3} strokeWidth={0}>
                            {histByType.map(entry => <Cell key={entry.name} fill={EVENT_COLORS[entry.name] || '#718096'} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
                        {histByType.map(t => (
                          <span key={t.name} style={{ fontSize: '11px', color: EVENT_COLORS[t.name] || '#718096', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: EVENT_COLORS[t.name] || '#718096', display: 'inline-block' }} /> {t.name} ({t.value})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={card}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                      Deaths & People Affected Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={byYear} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <defs>
                          <linearGradient id="gradKilled2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e53e3e" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#e53e3e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Area type="monotone" dataKey="killed" name="Deaths" stroke="#e53e3e" strokeWidth={2} fill="url(#gradKilled2)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </section>
          )}

          {view === 'combined' && records.length > 0 && (
            <section>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
                🧭 Live vs. Historical Comparison
              </h2>
              <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Historical avg. events/year (last 10y)</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#805ad5', fontFamily: 'var(--font-display)' }}>{avgEventsPerYear}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current pace, annualized from selected window</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: annualizedCurrentRate > avgEventsPerYear ? '#e53e3e' : '#38a169', fontFamily: 'var(--font-display)' }}>
                    {annualizedCurrentRate}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trend</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: annualizedCurrentRate > avgEventsPerYear ? '#e53e3e' : '#38a169' }}>
                    {annualizedCurrentRate > avgEventsPerYear
                      ? `↑ ${Math.round(((annualizedCurrentRate - avgEventsPerYear) / (avgEventsPerYear || 1)) * 100)}% above historical average`
                      : `↓ ${Math.round(((avgEventsPerYear - annualizedCurrentRate) / (avgEventsPerYear || 1)) * 100)}% below historical average`}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
                ℹ️ This estimate projects your selected live window across a full year and compares it to the 10-year historical average from the GLIDE/HDX archive. Use it as a rough early-warning signal, not a forecast.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}