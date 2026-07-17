import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts';
import { TrendingUp, AlertTriangle, Users, Calendar, BookOpen, ExternalLink } from 'lucide-react';
import api from '../services/api';

/* ── CSV parser (shared logic) ── */
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

const EVENT_COLORS = {
  Flood:      '#3182ce',
  Earthquake: '#e53e3e',
  Storm:      '#805ad5',
  Landslide:  '#dd6b20',
  Drought:    '#d69e2e',
  Heatwave:   '#e05252',
  Other:      '#718096',
};

const GLIDE_TYPE_MAP = {
  FL: 'Flood', EQ: 'Earthquake', ST: 'Storm', TC: 'Storm',
  LS: 'Landslide', DR: 'Drought', HT: 'Heatwave',
  AV: 'Other', WF: 'Other', EP: 'Other',
};

const EMOJI_MAP = {
  Flood: '🌊', Earthquake: '🌍', Storm: '⛈️',
  Landslide: '⛰️', Drought: '☀️', Heatwave: '🌡️', Other: '⚠️',
};

/* Custom Tooltip for charts */
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
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

export default function DisasterHistory() {
  const navigate = useNavigate();
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('frequency');
  const [reliefWebItems, setReliefWebItems] = useState([]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both HDX and ReliefWeb concurrently
      const [hdxRes, rwRes] = await Promise.allSettled([
        api.get('/geocoding/historical-events'),
        api.get('/monitoring/reliefweb')
      ]);

      if (hdxRes.status === 'fulfilled') {
        const raw = parseCSV(hdxRes.value.data);
        const mapped = raw.map(r => ({
          event:      r.event || '',
          type:       GLIDE_TYPE_MAP[r.event?.slice(0, 2)] || 'Other',
          killed:     parseInt(r.killed) || 0,
          affected:   parseInt(r.affected) || 0,
          location:   r.location || 'Pakistan',
          year:       parseInt(r.year) || 0,
          month:      parseInt(r.month) || 0,
          glide:      r.glidenumber || '',
        })).filter(r => r.year >= 1990 && r.year <= new Date().getFullYear());
        setRecords(mapped);
      } else {
        throw new Error('Failed to load HDX');
      }

      if (rwRes.status === 'fulfilled') {
        setReliefWebItems(rwRes.value.data?.data || []);
      }
      
      setError(null);
    } catch {
      setError('Could not load historical data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  /* Auto-refresh ReliefWeb RSS every 5 minutes (HDX is an archive, no need to re-poll) */
  useEffect(() => {
    const interval = setInterval(() => {
      api.get('/monitoring/reliefweb')
        .then(res => setReliefWebItems(res.data?.data || []))
        .catch(() => {});
    }, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  /* ── Derived datasets ── */
  const byYear = (() => {
    const map = {};
    records.forEach(r => {
      if (!r.year) return;
      if (!map[r.year]) map[r.year] = { year: r.year, events: 0, killed: 0, affected: 0 };
      map[r.year].events++;
      map[r.year].killed   += r.killed;
      map[r.year].affected += r.affected;
    });
    return Object.values(map).sort((a, b) => a.year - b.year);
  })();

  const byType = (() => {
    const map = {};
    records.forEach(r => {
      if (!map[r.type]) map[r.type] = { name: r.type, value: 0, killed: 0, affected: 0 };
      map[r.type].value++;
      map[r.type].killed   += r.killed;
      map[r.type].affected += r.affected;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  })();

  const rwByType = (() => {
    const map = {};
    reliefWebItems.forEach(r => {
      const t = r.fields?.type?.[0]?.name || 'Other';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  const totals = records.reduce((acc, r) => ({
    events:   acc.events + 1,
    killed:   acc.killed + r.killed,
    affected: acc.affected + r.affected,
  }), { events: 0, killed: 0, affected: 0 });

  const worst5 = [...records].sort((a, b) => b.killed - a.killed).slice(0, 5);

  const card = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)',
  };

  const TABS = [
    { key: 'frequency', label: '📅 Events by Year' },
    { key: 'impact',    label: '☠️ Deaths Over Time' },
    { key: 'affected',  label: '👥 People Affected' },
    { key: 'types',     label: '🥧 Disaster Types (HDX)' },
    { key: 'reliefweb', label: '📰 Recent ReliefWeb Analytics' },
  ];

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ ...card, marginBottom: '28px', background: 'linear-gradient(135deg,rgba(128,90,213,0.07),rgba(49,130,206,0.07))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg,#553c9a,#805ad5)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(128,90,213,0.35)' }}>
              <TrendingUp size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Pakistan Disaster History
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Historical disaster records from the GLIDE / HDX database · 1990 – present
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', background: 'rgba(128,90,213,0.12)', color: '#805ad5', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>
              📚 Historical Reference
            </span>
            <a href="https://data.humdata.org/dataset/pak-glide-events" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '10px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
              <ExternalLink size={12} /> Source: HDX
            </a>
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ ...card, textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s ease infinite' }}>📊</div>
          <div style={{ fontSize: '14px' }}>Loading historical records…</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ ...card, textAlign: 'center', padding: '40px', color: '#e53e3e', border: '1px solid rgba(229,62,62,0.3)' }}>
          ⚠️ {error}
          <button onClick={fetchHistory} style={{ display: 'block', margin: '12px auto 0', padding: '8px 18px', background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: '8px', color: '#e53e3e', cursor: 'pointer', fontSize: '13px' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { icon: <Calendar size={20} color="#805ad5" />, label: 'Total Events', value: totals.events.toLocaleString(), color: '#805ad5' },
              { icon: <AlertTriangle size={20} color="#e53e3e" />, label: 'Total Deaths', value: totals.killed.toLocaleString(), color: '#e53e3e' },
              { icon: <Users size={20} color="#3182ce" />, label: 'Total Affected', value: totals.affected >= 1e6 ? `${(totals.affected / 1e6).toFixed(1)}M` : totals.affected.toLocaleString(), color: '#3182ce' },
              { icon: <BookOpen size={20} color="#38a169" />, label: 'Years Covered', value: `${byYear[0]?.year || '—'} – ${byYear[byYear.length - 1]?.year || '—'}`, color: '#38a169' },
            ].map(s => (
              <div key={s.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', background: `${s.color}18`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: activeTab === t.key ? '#805ad5' : 'var(--bg-surface-2)',
                  border: `1.5px solid ${activeTab === t.key ? '#805ad5' : 'var(--border)'}`,
                  color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Charts Section */}
            <div style={{ ...card }}>
              {/* Events by Year */}
            {activeTab === 'frequency' && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                  Disaster Events per Year
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byYear} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="events" name="Events" radius={[6, 6, 0, 0]}
                      fill="url(#gradEvents)" />
                    <defs>
                      <linearGradient id="gradEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#805ad5" />
                        <stop offset="100%" stopColor="#553c9a" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}

            {/* Deaths over time */}
            {activeTab === 'impact' && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                  Deaths Recorded per Year
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={byYear} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradKilled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e53e3e" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#e53e3e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="killed" name="Deaths" stroke="#e53e3e" strokeWidth={2.5} fill="url(#gradKilled)" dot={false} activeDot={{ r: 5, fill: '#e53e3e' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}

            {/* People affected */}
            {activeTab === 'affected' && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                  People Affected per Year
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={byYear} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradAff" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3182ce" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3182ce" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="affected" name="Affected" stroke="#3182ce" strokeWidth={2.5} fill="url(#gradAff)" dot={false} activeDot={{ r: 5, fill: '#3182ce' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}

            {/* Disaster types pie */}
            {activeTab === 'types' && (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                  Breakdown by Disaster Type
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                        paddingAngle={3} strokeWidth={0}>
                        {byType.map(entry => (
                          <Cell key={entry.name} fill={EVENT_COLORS[entry.name] || '#718096'} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {byType.map(t => (
                      <div key={t.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-surface-2)', borderRadius: '10px', borderLeft: `4px solid ${EVENT_COLORS[t.name] || '#718096'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{EMOJI_MAP[t.name] || '⚠️'}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: EVENT_COLORS[t.name] || '#718096' }}>{t.value}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>events</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {/* ReliefWeb Analytics Tab */}
            {activeTab === 'reliefweb' && (() => {
              // Build a monthly timeline from reliefWebItems
              const monthMap = {};
              reliefWebItems.forEach(r => {
                const raw = r.fields?.date || '';
                if (!raw) return;
                const d = new Date(raw);
                if (isNaN(d)) return;
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthMap[key] = (monthMap[key] || 0) + 1;
              });
              const rwTimeline = Object.entries(monthMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, count]) => ({ month: key, reports: count }));

              return (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                    📰 ReliefWeb — Pakistan Disaster Reports
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px' }}>
                    Live feed from the UN ReliefWeb humanitarian database · {reliefWebItems.length} reports loaded
                  </p>

                  {reliefWebItems.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      ⚠ No ReliefWeb reports available. Check backend connection.
                    </div>
                  ) : (
                    <>
                      {/* Stat strip */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
                        {[
                          { label: 'Total Reports', value: reliefWebItems.length, color: '#4299e1' },
                          { label: 'Current / Active', value: reliefWebItems.filter(r => r.fields?.status === 'current').length, color: '#e53e3e' },
                          { label: 'Past Events', value: reliefWebItems.filter(r => r.fields?.status !== 'current').length, color: '#718096' },
                          { label: 'Unique Types', value: rwByType.length, color: '#805ad5' },
                        ].map(s => (
                          <div key={s.label} style={{ background: 'var(--bg-surface-2)', borderRadius: '12px', padding: '12px 14px', borderLeft: `4px solid ${s.color}` }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Two-column: timeline + pie */}
                      <div style={{ display: 'grid', gridTemplateColumns: rwTimeline.length > 0 ? '1.6fr 1fr' : '1fr', gap: '24px', marginBottom: '24px', alignItems: 'center' }}>
                        {rwTimeline.length > 0 && (
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>Reports by Month</div>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={rwTimeline} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="reports" name="Reports" radius={[6, 6, 0, 0]} fill="url(#gradRW)" />
                                <defs>
                                  <linearGradient id="gradRW" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#4299e1" />
                                    <stop offset="100%" stopColor="#2b6cb0" />
                                  </linearGradient>
                                </defs>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        {rwByType.length > 0 && (
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>By Disaster Type</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                  <Pie data={rwByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} strokeWidth={0}>
                                    {rwByType.map(entry => (
                                      <Cell key={entry.name} fill={EVENT_COLORS[entry.name] || '#4299e1'} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                              </ResponsiveContainer>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                {rwByType.map(t => (
                                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: EVENT_COLORS[t.name] || '#4299e1', display: 'inline-block', flexShrink: 0 }} />
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{EMOJI_MAP[t.name] || '📰'} {t.name}</span>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: EVENT_COLORS[t.name] || '#4299e1' }}>{t.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Full clickable list */}
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>All Reports</div>
                      <div style={{ display: 'grid', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                        {reliefWebItems.map((item, i) => {
                          const f = item.fields || {};
                          const type = f.type?.[0]?.name || 'Disaster';
                          const date = f.date ? new Date(f.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                          const status = f.status || 'past';
                          const statusColor = status === 'current' ? '#e53e3e' : '#718096';
                          const typeColor = EVENT_COLORS[type] || '#4299e1';
                          const glide = f.glide || '';
                          const url = f.url || `https://reliefweb.int/disaster/${f.name?.toLowerCase().replace(/\s+/g, '-')}`;
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-surface-2)', borderRadius: '10px', borderLeft: `4px solid ${typeColor}`, textDecoration: 'none', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}>
                              <span style={{ fontSize: '18px', flexShrink: 0 }}>{EMOJI_MAP[type] || '📰'}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {f.name || 'Unnamed Disaster'}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, background: `${statusColor}18`, color: statusColor, padding: '1px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>{status}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{type} · {date}</span>
                                  {glide && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>GLIDE: {glide}</span>}
                                </div>
                              </div>
                              <ExternalLink size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            </a>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
            
          {/* Bottom Section (ReliefWeb + Worst 5) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'flex-start' }}>
              
              {/* ReliefWeb RSS Feed */}
              {reliefWebItems.length > 0 && (
                <div style={{ ...card }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={18} color="#4299e1" /> Recent ReliefWeb Reports
                  </h2>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {reliefWebItems.slice(0, 5).map((item, i) => {
                      const f = item.fields || {};
                      const type = f.type?.[0]?.name || 'Disaster';
                      const date = f.date ? new Date(f.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                      return (
                        <a key={i} href={item.fields?.url || `https://reliefweb.int${item.href}`} target="_blank" rel="noopener noreferrer" 
                          style={{ display: 'block', padding: '10px 14px', background: 'var(--bg-surface-2)', borderRadius: '10px', borderLeft: '4px solid #4299e1', textDecoration: 'none', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{type} · {date}</span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {f.name || item.href}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Worst 5 events */}
              <div style={{ ...card }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#e53e3e" /> 5 Deadliest Recorded Events
                </h2>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {worst5.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-surface-2)', borderRadius: '12px', borderLeft: `4px solid ${EVENT_COLORS[r.type] || '#718096'}`, overflow: 'hidden' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: i === 0 ? '#e53e3e' : 'var(--text-muted)', fontFamily: 'var(--font-display)', minWidth: '32px', flexShrink: 0 }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.type} — {r.location}</span>
                        </div>
                        {r.glide && <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>GLIDE: {r.glide}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#e53e3e' }}>☠ {r.killed.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '14px', padding: '10px 14px', background: 'rgba(128,90,213,0.05)', border: '1px solid rgba(128,90,213,0.15)', borderRadius: '8px', lineHeight: 1.5 }}>
                  📚 Data source: <a href="https://data.humdata.org/dataset/pak-glide-events" target="_blank" rel="noopener noreferrer" style={{ color: '#805ad5' }}>HDX GLIDE Pakistan Events</a>.
                </p>
              </div>
              
            </div>
          </div>
        </>
      )}
    </div>
  );
}
