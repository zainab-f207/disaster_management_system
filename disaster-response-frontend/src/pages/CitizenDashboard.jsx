import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useAlertStore } from '../store';
import { disasterApi, reportApi, alertApi } from '../services/api';
import { SeverityBadge, DisasterIcon, StatusBadge } from '../components/ui';
import { AlertTriangle, FileText, MapPin, Bell } from 'lucide-react';
import { useCallback } from 'react';
import api from '../services/api';

export default function CitizenDashboard() {
    const { user } = useAuthStore();
    const { alerts } = useAlertStore();
    const navigate = useNavigate();
    const [nearbyDisasters, setNearbyDisasters] = useState([]);
    const [myReports, setMyReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [news, setNews] = useState([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [apiAlerts, setApiAlerts] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [disRes, repRes, alertRes] = await Promise.all([
                disasterApi.getAll(),
                reportApi.getMyReports(),
                alertApi.getAll().catch(() => ({ data: [] })),
            ]);
            // Show only active disasters
            setNearbyDisasters(
                (disRes.data || [])
                    .filter(d => !['Resolved', 'FalseAlarm'].includes(d.status))
                    .slice(0, 5)
            );
            setMyReports((repRes.data || []).slice(0, 5));
            setApiAlerts((alertRes.data || []).slice(0, 4));
        } catch { }
        finally { setLoading(false); }
    };

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

    useEffect(() => { fetchNews(); }, [fetchNews]);

    const criticalCount = nearbyDisasters.filter(d => d.severity === 'Critical').length;

    return (
        <div style={{
            maxWidth: '900px', margin: '0 auto',
            padding: '88px 24px 60px', minHeight: '100vh',
        }}>

            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '36px', animation: 'float 3s ease-in-out infinite' }}>🇵🇰</span>
                    <div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: '26px',
                            fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1,
                        }}>
                            Assalamu Alaikum,<br />
                            <span style={{ color: 'var(--accent)' }}>
                                {user?.fullName?.split(' ')[0] || 'Citizen'}
                            </span>
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Stay safe. Report emergencies. Help your community.
                        </p>
                    </div>
                </div>

                {criticalCount > 0 && (
                    <div style={{
                        padding: '12px 16px', marginTop: '12px',
                        background: 'rgba(229,62,62,0.08)',
                        border: '1px solid rgba(229,62,62,0.3)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        animation: 'fadeIn 0.3s ease',
                    }}>
                        <AlertTriangle size={18} color="#e53e3e" />
                        <span style={{ fontSize: '13px', color: '#e53e3e', fontWeight: 600 }}>
                            {criticalCount} critical emergency{criticalCount > 1 ? 'ies' : ''} active near Pakistan.
                            Stay indoors if possible.
                        </span>
                    </div>
                )}
            </div>

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '10px', marginBottom: '28px',
            }}>
                {[
                    { number: '1122', name: 'Rescue 1122', emoji: '🚒', color: '#e53e3e' },
                    { number: '115', name: 'Edhi Foundation', emoji: '🚑', color: '#dd6b20' },
                    { number: '1135', name: 'NDMA', emoji: '🛡️', color: '#38a169' },
                    { number: '15', name: 'Police', emoji: '👮', color: '#4299e1' },
                ].map(h => (
                    <a
                        key={h.number}
                        href={`tel:${h.number}`}
                        style={{
                            padding: '12px 14px',
                            background: `${h.color}10`,
                            border: `1px solid ${h.color}30`,
                            borderRadius: '12px', textDecoration: 'none',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${h.color}20`}
                        onMouseLeave={e => e.currentTarget.style.background = `${h.color}10`}
                    >
                        <span style={{ fontSize: '22px' }}>{h.emoji}</span>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: h.color, fontFamily: 'var(--font-display)' }}>
                                {h.number}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{h.name}</div>
                        </div>
                    </a>
                ))}
            </div><div style={{
                padding: '24px', marginBottom: '28px',
                background: 'linear-gradient(135deg, #0d3d22, #145c33)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 8px 32px rgba(33,150,83,0.25)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '16px',
            }}>
                <div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: '20px',
                        fontWeight: 800, color: '#fff', marginBottom: '4px',
                    }}>
                        See an emergency?
                    </h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        Report it now — Rescue 1122 or nearby org will be dispatched.
                    </p>
                </div>
                <Link
                    to="/report"
                    style={{
                        padding: '12px 24px',
                        background: '#fff',
                        color: '#145c33', fontWeight: 800, fontSize: '14px',
                        borderRadius: '12px', textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        fontFamily: 'var(--font-display)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    🚨 Report Now
                </Link>
            </div>
            
            <div style={{
                padding: '20px 24px', marginBottom: '28px',
                background: 'linear-gradient(135deg, #1A365D, #3182ce)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 8px 32px rgba(49,130,206,0.25)',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '16px',
            }}>
                <div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: '20px',
                        fontWeight: 800, color: '#fff', marginBottom: '4px',
                    }}>
                        🗺️ Safe Route Navigation
                    </h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        Find routes that avoid active floods and closed roads.
                    </p>
                </div>
                <Link
                    to="/safe-route"
                    style={{
                        padding: '12px 24px',
                        background: '#fff',
                        color: '#3182ce', fontWeight: 800, fontSize: '14px',
                        borderRadius: '12px', textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        fontFamily: 'var(--font-display)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Navigate Now
                </Link>
            </div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
                className="citizen-grid">

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            🌍 Active Disasters
                        </h3>
                        <Link to="/disasters" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                            View all →
                        </Link>
                    </div>

                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: '76px', borderRadius: '10px', marginBottom: '8px' }} />
                        ))
                    ) : nearbyDisasters.length === 0 ? (
                        <div style={{
                            padding: '30px', textAlign: 'center',
                            background: 'var(--card-bg)', border: '1px solid var(--border)',
                            borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px',
                        }}>
                            🛡️ No active disasters
                        </div>
                    ) : (
                        nearbyDisasters.map((d, i) => (
                            <Link
                                key={d.id}
                                to={`/disasters/${d.id}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div style={{
                                    padding: '12px 14px', marginBottom: '8px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderLeft: `3px solid ${d.severity === 'Critical' ? '#e53e3e' :
                                        d.severity === 'High' ? '#dd6b20' : '#38a169'}`,
                                    borderRadius: '10px',
                                    animation: `fadeInUp 0.3s ease ${i * 40}ms both`,
                                    transition: 'all 0.15s',
                                    cursor: 'pointer',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <DisasterIcon type={d.type} size={16} /> {d.type}
                                        </span>
                                        <SeverityBadge severity={d.severity} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                        {d.description?.slice(0, 70)}...
                                    </p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            📩 My Reports
                        </h3>
                        <Link to="/report" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                            + New
                        </Link>
                    </div>

                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: '76px', borderRadius: '10px', marginBottom: '8px' }} />
                        ))
                    ) : myReports.length === 0 ? (
                        <div style={{
                            padding: '30px', textAlign: 'center',
                            background: 'var(--card-bg)', border: '1px solid var(--border)',
                            borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px',
                        }}>
                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
                            No reports yet.<br />
                            <span style={{ fontSize: '11px' }}>Submit a report when you see an emergency.</span>
                        </div>
                    ) : (
                        myReports.map((r, i) => (
                            <div
                                key={r.id}
                                style={{
                                    padding: '12px 14px', marginBottom: '8px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    animation: `fadeInUp 0.3s ease ${i * 40}ms both`,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Report #{r.id}
                                    </span>
                                    <StatusBadge status={r.status} />
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                    {r.description?.slice(0, 70)}...
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Show SignalR real-time alerts, or fall back to API-fetched alerts */}
            {(() => {
                const displayAlerts = alerts.length > 0 ? alerts : apiAlerts;
                if (displayAlerts.length === 0) return null;
                return (
                    <div style={{ marginTop: '28px' }}>
                        <h3 style={{
                            fontFamily: 'var(--font-display)', fontSize: '15px',
                            fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px',
                        }}>
                            🔔 Recent Alerts ({displayAlerts.length})
                        </h3>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {displayAlerts.slice(0, 4).map((a, i) => (
                                <div key={a.id || i} style={{
                                    padding: '10px 14px',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderLeft: `3px solid ${a.severity === 'Critical' ? '#e53e3e' : a.severity === 'High' ? '#dd6b20' : 'var(--accent)'}`,
                                    borderRadius: '10px', fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    animation: `fadeInUp 0.3s ease ${i * 30}ms both`,
                                }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>
                                        {a.disasterType || a.type || 'Alert'}
                                    </strong>
                                    {(a.affectedCity || a.location) && ` — ${a.affectedCity || a.location}`}
                                    <span style={{ float: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {new Date(a.createdAt || a.sentAt || Date.now()).toLocaleTimeString('en-PK', {
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
            
            <div style={{ marginTop: '28px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    📰 Latest News
                </h3>
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
                            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '10px 14px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', color: 'var(--text-primary)' }}>
                                {n.title}
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                    {n.pubDate ? new Date(n.pubDate).toLocaleDateString('en-PK') : ''}
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
        @media (max-width: 640px) {
          .citizen-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </div>
    );
}