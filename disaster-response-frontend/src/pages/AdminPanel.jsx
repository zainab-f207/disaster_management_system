import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore, useAlertStore } from '../store';
import ReportQueue from '../components/admin/ReportQueue';
import DisasterManager from '../components/admin/DisasterManager';
import AssignmentOverride from '../components/admin/AssignmentOverride';
import { alertApi, disasterApi, reportApi } from '../services/api';
import api from '../services/api';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateDisasterForm from '../components/admin/CreateDisasterForm';
import LiveResponderMap from '../components/admin/LiveResponderMap';
import TeamChat from '../components/chat/TeamChat';
import { orgApi } from '../services/api';


const TABS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'reports', label: 'Report Queue', icon: '📩' },
  { key: 'disasters', label: 'Disasters', icon: '🌍' },
  { key: 'create', label: 'Create Disaster', icon: '🛡️' },
  { key: 'assignments', label: 'Assignments', icon: '🚒' },
  { key: 'tracking', label: 'Live Tracking', icon: '📡' },
  { key: 'completions', label: 'Completions', icon: '✅' },
  { key: 'alerts', label: 'Alert History', icon: '🔔' },
  { key: 'chat', label: 'Team Chat', icon: '💬' }
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const locationSearch = useLocation().search;
  const { search } = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { alerts: liveAlerts } = useAlertStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(locationSearch);
    const tab = params.get('tab');
    if (tab && TABS.some(t => t.key === tab)) {
      setActiveTab(tab);
    }
  }, [locationSearch]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'Admin') {
      toast.error('Admin access only.');
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'alerts') fetchAlerts();
    if (activeTab === 'completions') fetchCompletions();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      orgApi.getAll().then(res => setOrganizations(res.data || [])).catch(() => { });
    }
  }, [activeTab]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [disRes, repRes] = await Promise.all([
        disasterApi.getAll(),
        reportApi.getAll(),
      ]);
      const disasters = disRes.data || [];
      const reports = repRes.data || [];
      setStats({
        totalDisasters: disasters.length,
        activeDisasters: disasters.filter(d => !['Resolved', 'FalseAlarm'].includes(d.status)).length,
        critical: disasters.filter(d => d.severity === 'Critical').length,
        pendingReports: reports.filter(r => r.status === 'Pending').length,
        resolvedToday: disasters.filter(d => {
          if (d.status !== 'Resolved') return false;
          const today = new Date();
          const rep = new Date(d.reportedAt);
          return rep.toDateString() === today.toDateString();
        }).length,
        byType: disasters.reduce((acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1;
          return acc;
        }, {}),
        bySeverity: {
          Critical: disasters.filter(d => d.severity === 'Critical').length,
          High: disasters.filter(d => d.severity === 'High').length,
          Medium: disasters.filter(d => d.severity === 'Medium').length,
          Low: disasters.filter(d => d.severity === 'Low').length,
        }
      });
    } catch { toast.error('Failed to load stats'); }
    finally { setLoadingStats(false); }
  };

  const fetchAlerts = async () => {
    setLoadingTab(true);
    try {
      const res = await alertApi.getAll();
      setAlertHistory(res.data || []);
    } catch { }
    finally { setLoadingTab(false); }
  };

  const fetchCompletions = async () => {
    setLoadingTab(true);
    try {
      const disRes = await disasterApi.getAll();
      const disasters = disRes.data || [];
      const allCompletions = [];
      for (const d of disasters) {
        try {
          const res = await api.get(`/assignments/disaster/${d.id}`);
          const completed = (res.data || [])
            .filter(a => a.status === 'Completed')
            .map(a => ({ ...a, disasterType: d.type, disasterSeverity: d.severity }));
          allCompletions.push(...completed);
        } catch { }
      }
      setCompletions(allCompletions.sort((a, b) =>
        new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
      ));
    } catch { }
    finally { setLoadingTab(false); }
  };

  if (!isAuthenticated || user?.role !== 'Admin') return null;

  return (
    <div style={{
      maxWidth: '1300px', margin: '0 auto',
      padding: '88px 24px 60px', minHeight: '100vh',
    }}>

      <div style={{ marginBottom: '24px', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, #145c33, #27ae60)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(33,150,83,0.3)',
            }}>
              <Shield size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: '24px',
                fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1,
              }}>
                Admin Control Panel
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                {user?.fullName} · Pakistan Disaster Response System
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {liveAlerts.filter(a => a.type === 'report').length > 0 && (
              <div style={{
                padding: '8px 14px',
                background: 'rgba(159,122,234,0.1)',
                border: '1px solid rgba(159,122,234,0.3)',
                borderRadius: '10px',
                fontSize: '13px', fontWeight: 700, color: '#9f7aea',
                animation: 'pulse-dot 2s infinite',
              }}>
                📩 {liveAlerts.filter(a => a.type === 'report').length} new report{liveAlerts.filter(a => a.type === 'report').length !== 1 ? 's' : ''}
              </div>
            )}
            {liveAlerts.filter(a => a.severity === 'Critical').length > 0 && (
              <div style={{
                padding: '8px 14px',
                background: 'rgba(229,62,62,0.1)',
                border: '1px solid rgba(229,62,62,0.3)',
                borderRadius: '10px',
                fontSize: '13px', fontWeight: 700, color: '#e53e3e',
              }}>
                🚨 {liveAlerts.filter(a => a.severity === 'Critical').length} critical
              </div>
            )}
            <button
              onClick={fetchStats}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                background: 'var(--accent-subtle)', color: 'var(--accent)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px', cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px', marginBottom: '24px',
        }}>
          {[
            { label: 'Total Disasters', value: stats.totalDisasters, color: 'var(--accent)', emoji: '🗺️' },
            { label: 'Active Events', value: stats.activeDisasters, color: '#dd6b20', emoji: '⚡' },
            { label: 'Critical Now', value: stats.critical, color: '#e53e3e', emoji: '🚨' },
            { label: 'Pending Reports', value: stats.pendingReports, color: '#9f7aea', emoji: '📩' },
            { label: 'Resolved Today', value: stats.resolvedToday, color: '#38a169', emoji: '✅' },
            { label: 'Live Alerts', value: liveAlerts.length, color: '#4299e1', emoji: '🔔' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '14px', padding: '16px',
                animation: `fadeInUp 0.3s ease ${i * 40}ms both`,
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.emoji}</div>
              <div style={{
                fontSize: '28px', fontWeight: 900,
                fontFamily: 'var(--font-display)', color: s.color,
                lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {stats?.bySeverity && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: '8px', marginBottom: '24px',
        }}>
          {Object.entries(stats.bySeverity).map(([sev, count]) => {
            const colors = { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' };
            const color = colors[sev] || '#a0aec0';
            return (
              <div key={sev} style={{
                padding: '10px 14px',
                background: `${color}10`,
                border: `1px solid ${color}30`,
                borderRadius: '10px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                  {sev}
                </span>
                <span style={{
                  fontSize: '18px', fontWeight: 900,
                  fontFamily: 'var(--font-display)', color,
                }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        display: 'flex', gap: '0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px', overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '11px 20px',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: activeTab === tab.key ? 700 : 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s', marginBottom: '-1px',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.key === 'reports' && stats?.pendingReports > 0 && (
              <span style={{
                background: '#9f7aea', color: '#fff',
                fontSize: '10px', fontWeight: 700,
                padding: '1px 6px', borderRadius: '8px',
              }}>
                {stats.pendingReports}
              </span>
            )}
            {tab.key === 'completions' && completions.length > 0 && (
              <span style={{
                background: '#38a169', color: '#fff',
                fontSize: '10px', fontWeight: 700,
                padding: '1px 6px', borderRadius: '8px',
              }}>
                {completions.length}
              </span>
            )}
          </button>

        ))}
      </div>

      <div style={{ animation: 'fadeIn 0.2s ease' }} key={activeTab}>

        {activeTab === 'overview' && (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '20px',
            }}>
              <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '20px',
              }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                  ⚡ Quick Actions
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { label: 'Review Pending Reports', icon: '📩', tab: 'reports', color: '#9f7aea' },
                    { label: 'Manage Disasters', icon: '🌍', tab: 'disasters', color: '#dd6b20' },
                    { label: 'Override Assignments', icon: '🚒', tab: 'assignments', color: '#4299e1' },
                    { label: 'View Completions', icon: '✅', tab: 'completions', color: '#38a169' },
                  ].map(action => (
                    <button
                      key={action.tab}
                      onClick={() => setActiveTab(action.tab)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px',
                        background: `${action.color}08`,
                        border: `1px solid ${action.color}25`,
                        borderRadius: '10px', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = `${action.color}15`}
                      onMouseLeave={e => e.currentTarget.style.background = `${action.color}08`}
                    >
                      <span style={{ fontSize: '20px' }}>{action.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: action.color }}>
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '20px',
                maxHeight: '320px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                  🔔 Live Session Alerts
                </h3>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {liveAlerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔕</div>
                      No alerts this session
                    </div>
                  ) : (
                    liveAlerts.slice(0, 8).map((a, i) => {
                      const color = { disaster: '#e53e3e', report: '#9f7aea', assignment: '#4299e1' }[a.type] || '#a0aec0';
                      return (
                        <div key={a.id || i} style={{
                          padding: '9px 12px', marginBottom: '6px',
                          background: 'var(--bg-surface-2)',
                          border: `1px solid var(--border)`,
                          borderLeft: `3px solid ${color}`,
                          borderRadius: '8px', fontSize: '12px',
                          animation: `fadeInUp 0.2s ease ${i * 20}ms both`,
                        }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {a.type === 'disaster' ? `🚨 ${a.disasterType} — ${a.affectedCity || 'Pakistan'}` :
                              a.type === 'report' ? `📩 Report by ${a.reportedBy}` :
                                `🚒 ${a.organizationName} → ${a.status}`}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            {new Date(a.createdAt || Date.now()).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'reports' && <ReportQueue />}
        {activeTab === 'create' && (
          <div style={{ maxWidth: '700px' }}>
            <CreateDisasterForm onCreated={() => { fetchStats(); setActiveTab('disasters'); }} />
          </div>
        )}
        {activeTab === 'disasters' && <DisasterManager />}
        {activeTab === 'assignments' && <AssignmentOverride />}
        {activeTab === 'tracking' && <LiveResponderMap />}

        {activeTab === 'completions' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                ✅ Completed Assignments
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Review proof of completion submitted by responders
              </p>
            </div>

            {loadingTab ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
                ))}
              </div>
            ) : completions.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '48px',
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '16px' }}>
                  No completions yet
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
                  Responders must mark assignments complete with proof.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {completions.map((c, i) => (
                  <div key={c.id} style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderTop: '3px solid #38a169',
                    borderRadius: '14px', padding: '18px',
                    animation: `fadeInUp 0.3s ease ${i * 30}ms both`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                          🚒 {c.organizationName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Disaster #{c.disasterId} · {c.disasterType} ·
                          Completed {c.completedAt ? new Date(c.completedAt).toLocaleString('en-PK', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          }) : 'N/A'}
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px',
                        background: 'rgba(56,161,105,0.1)',
                        color: '#38a169', fontSize: '12px', fontWeight: 700,
                      }}>
                        ✅ Verified Complete
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: c.completionPhotoBase64 ? '1fr 1fr' : '1fr',
                      gap: '14px',
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
                          📋 COMPLETION REPORT
                        </div>
                        <div style={{
                          padding: '12px', background: 'var(--bg-surface-2)',
                          borderRadius: '10px', fontSize: '13px',
                          color: 'var(--text-secondary)', lineHeight: 1.6,
                          minHeight: '80px',
                        }}>
                          {c.completionNotes || 'No notes provided.'}
                        </div>
                      </div>

                      {c.completionPhotoBase64 && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
                            📷 PHOTO PROOF
                          </div>
                          <img
                            src={c.completionPhotoBase64}
                            alt="Completion proof"
                            style={{
                              width: '100%', height: '130px',
                              objectFit: 'cover', borderRadius: '10px',
                              border: '1px solid var(--border)', cursor: 'pointer',
                            }}
                            onClick={() => window.open(c.completionPhotoBase64, '_blank')}
                            title="Click to view full size"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                🔔 Alert History
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                All alerts saved to database
              </p>
            </div>

            {loadingTab ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '10px' }} />
                ))}
              </div>
            ) : alertHistory.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px',
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔕</div>
                No alerts saved yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {alertHistory.map((alert, i) => {
                  const color = { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' }[alert.severity] || '#a0aec0';
                  return (
                    <div key={alert.id} style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${color}`,
                      borderRadius: '10px', padding: '12px 16px',
                      animation: `fadeInUp 0.3s ease ${i * 25}ms both`,
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: '12px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                          {alert.message}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Disaster #{alert.disasterId} · Audience: {alert.audience}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                          background: `${color}15`, color, borderRadius: '8px', marginBottom: '4px',
                        }}>
                          {alert.severity}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(alert.createdAt).toLocaleString('en-PK', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Select organization channel
              </label>
              <select
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
                style={{
                  padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', minWidth: '260px',
                }}
              >
                <option value="">-- Select organization --</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            {selectedOrgId && (
              <TeamChat
                organizationId={parseInt(selectedOrgId)}
                organizationName={organizations.find(o => o.id === parseInt(selectedOrgId))?.name}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}