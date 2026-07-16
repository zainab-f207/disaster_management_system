import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { disasterApi } from '../services/api';
import { useDisasterStore, useAlertStore } from '../store';
import DisasterMap from '../components/map/DisasterMap';
import AlertBanner from '../components/dashboard/AlertBanner';
import StatsBar from '../components/dashboard/StatsBar';
import { DisasterCard, SectionHeader, CardSkeleton, DisasterIcon, SeverityBadge } from '../components/ui';
import { RefreshCw, ArrowRight, Filter, Layers, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const TYPE_COLORS = {
  Flood: '#4299e1', Earthquake: '#ed8936', Fire: '#e53e3e',
  Storm: '#9f7aea', Heatwave: '#dd6b20', Landslide: '#68d391', Other: '#a0aec0',
};

export default function Dashboard() {
  const { disasters, setDisasters, loading, setLoading, error, setError } = useDisasterStore();
  const { alerts } = useAlertStore();

  const [filter, setFilter] = useState('all');   // all | Critical | High | active
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);

  const fetchNews = useCallback(async () => {
      setLoadingNews(true);
      try {
          const res = await api.get('/monitoring/news-rss', { responseType: 'text' });
          const xmlDoc = new window.DOMParser().parseFromString(res.data, 'text/xml');
          const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 4).map(item => ({
              title: item.querySelector('title')?.textContent || '',
              link: item.querySelector('link')?.textContent || '',
              pubDate: item.querySelector('pubDate')?.textContent || '',
          }));
          setNews(items);
      } catch {
          setNews([]);
      } finally {
          setLoadingNews(false);
      }
  }, []);

  const fetchDisasters = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await disasterApi.getAll();
      const sorted = (res.data || []).sort((a, b) => {
        const si = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
        if (si !== 0) return si;
        return new Date(b.reportedAt) - new Date(a.reportedAt);
      });
      setDisasters(sorted);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Could not connect to backend. Make sure your API is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setDisasters, setLoading, setError]);

  useEffect(() => {
    fetchDisasters();
    fetchNews();
    const interval = setInterval(() => {
      fetchDisasters(true);
      fetchNews();
    }, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchDisasters, fetchNews]);

  const filteredDisasters = disasters.filter(d => {
    const severityMatch = filter === 'all' ? true
      : filter === 'active' ? !['Resolved', 'FalseAlarm'].includes(d.status)
      : d.severity === filter;
    const typeMatch = typeFilter === 'all' || d.type === typeFilter;
    return severityMatch && typeMatch;
  });

  // Chart data
  const typeChartData = Object.keys(TYPE_COLORS).map(type => ({
    type,
    count: disasters.filter(d => d.type === type).length,
  })).filter(d => d.count > 0);

  // Recent real-time alerts
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '88px 24px 40px',
      minHeight: '100vh',
    }}>

      {/* ── Hero Header ───────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px', animation: 'float 3s ease-in-out infinite' }}>🇵🇰</span>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(22px, 4vw, 32px)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}>
                Pakistan Disaster Response
                <span style={{ color: 'var(--accent)' }}> Command</span>
              </h1>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              Real-time monitoring across 8 cities — Lahore, Karachi, Islamabad, Peshawar, Quetta, Multan, Faisalabad, Rawalpindi
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {lastUpdated && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Updated {lastUpdated.toLocaleTimeString('en-PK')}
              </span>
            )}
            <button
              onClick={() => fetchDisasters(true)}
              disabled={refreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px', cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: 600, color: 'var(--accent)',
              }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin-slow 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Alert Banner ────────────────────────────────── */}
      <AlertBanner />

      {/* ── Stats Row ────────────────────────────────────────── */}
      <StatsBar disasters={disasters} loading={loading} />

      {/* Error state */}
      {error && (
        <div style={{
          background: 'rgba(229,62,62,0.08)',
          border: '1px solid rgba(229,62,62,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          color: '#e53e3e', fontSize: '14px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Main Layout: Map + Sidebar ───────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '20px',
        marginBottom: '28px',
      }}
        className="main-grid"
      >
        {/* ── Live Map ──────────────────────────────────────── */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          minHeight: '520px',
        }}
          className="animate-fade-up stagger-1"
        >
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--accent)" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Live Disaster Map
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#27ae60',
                animation: 'pulse-dot 2s infinite',
              }} />
              <span style={{ fontSize: '11px', color: '#27ae60', fontWeight: 600 }}>LIVE</span>
            </div>
          </div>
          <div style={{ height: '470px' }}>
            <DisasterMap disasters={filteredDisasters} height="100%" />
          </div>
        </div>

        {/* ── Right Sidebar: Recent Alerts + Type Chart ───── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Real-time alert feed */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            flex: 1,
          }}
            className="animate-fade-up stagger-2"
          >
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={15} color="var(--accent)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Alert Feed
                </span>
              </div>
              {recentAlerts.length > 0 && (
                <span style={{
                  fontSize: '10px', padding: '2px 8px',
                  background: 'rgba(229,62,62,0.1)',
                  color: '#e53e3e', borderRadius: '10px', fontWeight: 700,
                }}>
                  {recentAlerts.length} NEW
                </span>
              )}
            </div>

            <div style={{ padding: '12px', maxHeight: '240px', overflowY: 'auto' }}>
              {recentAlerts.length === 0 ? (
                <div style={{
                  padding: '30px', textAlign: 'center',
                  color: 'var(--text-muted)', fontSize: '13px',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔔</div>
                  No real-time alerts yet.<br />
                  <span style={{ fontSize: '11px' }}>Connect to receive live notifications.</span>
                </div>
              ) : (
                recentAlerts.map((alert, i) => (
                  <div key={alert.id} style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-2)',
                    marginBottom: '8px',
                    animation: `alert-slide 0.3s ease ${i * 50}ms both`,
                    borderLeft: `3px solid ${
                      alert.severity === 'Critical' ? '#e53e3e' :
                      alert.severity === 'High' ? '#dd6b20' : '#d69e2e'
                    }`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {alert.disasterType || alert.type}
                        {alert.affectedCity && ` — ${alert.affectedCity}`}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                        {new Date(alert.createdAt || Date.now()).toLocaleTimeString('en-PK', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {alert.severity && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        color: alert.severity === 'Critical' ? '#e53e3e' :
                               alert.severity === 'High' ? '#dd6b20' : '#d69e2e',
                      }}>
                        {alert.severity}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Latest News feed */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
          }}
            className="animate-fade-up stagger-2"
          >
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>📰</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Latest News
              </span>
            </div>
            <div style={{ padding: '12px' }}>
                {loadingNews ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '10px' }} />)}
                    </div>
                ) : news.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                        No news available right now.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {news.map((n, i) => (
                            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '10px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', color: 'var(--text-primary)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-3)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}>
                                {n.title}
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                    {n.pubDate ? new Date(n.pubDate).toLocaleDateString('en-PK') : ''}
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* Disaster by type chart */}
          {typeChartData.length > 0 && (
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              boxShadow: 'var(--shadow-md)',
            }}
              className="animate-fade-up stagger-3"
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                By Disaster Type
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={typeChartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                    cursor={{ fill: 'var(--accent-subtle)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {typeChartData.map((entry) => (
                      <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || '#a0aec0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Disaster List ────────────────────────────────────── */}
      <div className="animate-fade-up stagger-4">
        <SectionHeader
          title="Active Disasters"
          subtitle={`${filteredDisasters.length} events — sorted by severity`}
          action={
            <Link to="/disasters" style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '13px', fontWeight: 600,
              color: 'var(--accent)', textDecoration: 'none',
            }}>
              View all <ArrowRight size={14} />
            </Link>
          }
        />

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'Critical', label: '🚨 Critical' },
            { key: 'High', label: '⚠️ High' },
            { key: 'Medium', label: '⚡ Medium' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === f.key ? 'var(--accent-subtle)' : 'transparent',
                color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '12px', fontWeight: filter === f.key ? 600 : 400,
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}
            >
              {f.label}
            </button>
          ))}

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-muted)',
              fontSize: '12px', cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All Types</option>
            {Object.keys(TYPE_COLORS).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Grid of disaster cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filteredDisasters.length === 0 ? (
          <div style={{
            padding: '60px', textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
              No active disasters
            </div>
            <div style={{ fontSize: '13px' }}>All clear for the selected filters.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '12px',
          }}>
            {filteredDisasters.map((d, i) => (
              <DisasterCard
                key={d.id}
                disaster={d}
                delay={i * 30}
                onClick={setSelectedDisaster}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Disaster Detail Modal ─────────────────────────── */}
      {selectedDisaster && (
        <div
          onClick={() => setSelectedDisaster(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              maxWidth: '500px', width: '100%',
              boxShadow: 'var(--shadow-lg)',
              animation: 'scaleIn 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <DisasterIcon type={selectedDisaster.type} size={32} />
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedDisaster.type} Event
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Disaster #{selectedDisaster.id}</span>
                </div>
              </div>
              <SeverityBadge severity={selectedDisaster.severity} />
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {selectedDisaster.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Status', value: selectedDisaster.status },
                { label: 'Source', value: selectedDisaster.source },
                { label: 'Latitude', value: selectedDisaster.latitude?.toFixed(4) },
                { label: 'Longitude', value: selectedDisaster.longitude?.toFixed(4) },
                { label: 'Reported', value: new Date(selectedDisaster.reportedAt).toLocaleString('en-PK') },
                { label: 'Verified', value: selectedDisaster.verifiedAt ? new Date(selectedDisaster.verifiedAt).toLocaleString('en-PK') : 'Pending' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSelectedDisaster(null)}
                style={{
                  flex: 1, padding: '10px',
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', fontSize: '13px',
                  color: 'var(--text-secondary)', fontWeight: 600,
                }}
              >
                Close
              </button>
              <Link
                to={`/disasters/${selectedDisaster.id}`}
                style={{
                  flex: 1, padding: '10px',
                  background: 'linear-gradient(135deg, var(--pk-green-600), var(--pk-green-400))',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none', color: '#fff',
                  fontSize: '13px', fontWeight: 600,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(33,150,83,0.3)',
                }}
                onClick={() => setSelectedDisaster(null)}
              >
                Full Details →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Responsive CSS ───────────────────────────────────── */}
      <style>{`
        @media (max-width: 1024px) {
          .main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
