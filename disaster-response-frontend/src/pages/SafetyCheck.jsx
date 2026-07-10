import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import api from '../services/api';
import { disasterApi } from '../services/api';
import toast from 'react-hot-toast';
import { Heart, CheckCircle, AlertTriangle, Users } from 'lucide-react';


export default function SafetyCheck() {
    const { user, isAuthenticated } = useAuthStore();
    const [disasters, setDisasters] = useState([]);
    const [safeStatuses, setSafeStatuses] = useState({});  // disasterId → { markedSafe, count, users }
    const [marking, setMarking] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveDisasters();
    }, []);

    const fetchActiveDisasters = async () => {
        setLoading(true);
        try {
            const res = await disasterApi.getAll();
            const active = (res.data || []).filter(d =>
                !['Resolved', 'FalseAlarm', 'Closed', 'AlertExpired'].includes(d.status)
            ).slice(0, 10);
            setDisasters(active);

            const statusMap = {};
            await Promise.all(active.map(async d => {
                try {
                    const r = await api.get(`/safety/check/${d.id}`);
                    statusMap[d.id] = r.data;
                } catch {
                    statusMap[d.id] = { markedSafe: false, count: 0, users: [] };
                }
            }));
            setSafeStatuses(statusMap);
        } catch {
            toast.error('Failed to load disasters');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkSafe = async (disasterId) => {
        if (!isAuthenticated) {
            toast.error('Please sign in to mark yourself safe.');
            return;
        }
        setMarking(disasterId);
        try {
            await api.post('/safety/mark-safe', { disasterId });
            toast.success('You have been marked safe! Your family will be notified. 💚');
            setSafeStatuses(prev => ({
                ...prev,
                [disasterId]: {
                    ...prev[disasterId],
                    markedSafe: true,
                    count: (prev[disasterId]?.count || 0) + 1,
                    users: [...(prev[disasterId]?.users || []), user?.fullName],
                }
            }));
        } catch {
            toast.error('Failed to mark safe. Try again.');
        } finally {
            setMarking(null);
        }
    };

    const getDisasterEmoji = (type) => ({
        Flood: '🌊', Earthquake: '🌍', Fire: '🔥', Storm: '⛈️',
        Heatwave: '🌡️', RoadAccident: '🚗', BuildingCollapse: '🏚️',
        GasExplosion: '💥', Other: '⚠️'
    }[type] || '⚠️');

    const sevColor = (s) => ({
        Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169'
    }[s] || '#38a169');

    return (
        <div style={{
            maxWidth: '800px', margin: '0 auto',
            padding: '88px 24px 60px', minHeight: '100vh',
        }}>
            <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        background: 'linear-gradient(135deg, #c41a1a, #e53e3e)',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(229,62,62,0.3)',
                    }}>
                        <Heart size={22} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: '24px',
                            fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1,
                        }}>
                            Family Safety Check
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                            Let your family know you are safe during active disasters
                        </p>
                    </div>
                </div>

                <div style={{
                    padding: '14px 16px',
                    background: 'rgba(39,174,96,0.06)',
                    border: '1px solid rgba(39,174,96,0.2)',
                    borderRadius: '12px', fontSize: '13px',
                    color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                    <strong style={{ color: 'var(--accent)' }}>How it works:</strong>{' '}
                    When a disaster is active near you, tap "I Am Safe" below.
                    Your family members who use this system will see a notification
                    that you have marked yourself as safe. No phone call needed.
                </div>
            </div>

            {isAuthenticated && (
                <div style={{
                    padding: '16px 18px', marginBottom: '24px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                    <div style={{
                        width: '42px', height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #145c33, #27ae60)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px',
                    }}>
                        👤
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {user?.fullName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Signed in · {user?.email}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
                        {Object.values(safeStatuses).filter(s => s.markedSafe).length} disasters marked safe
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '14px' }} />
                    ))}
                </div>
            ) : disasters.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px',
                    background: 'var(--card-bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                }}>
                    <div style={{ fontSize: '56px', marginBottom: '14px' }}>🛡️</div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        No Active Disasters
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        There are no active disasters right now. Stay safe!
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                    {disasters.map((d, i) => {
                        const status = safeStatuses[d.id] || {};
                        const isSafe = status.markedSafe;
                        const safeCount = status.count || 0;
                        const color = sevColor(d.severity);

                        return (
                            <div
                                key={d.id}
                                style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderLeft: `4px solid ${color}`,
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    animation: `fadeInUp 0.3s ease ${i * 50}ms both`,
                                    boxShadow: isSafe ? '0 4px 20px rgba(39,174,96,0.15)' : 'var(--shadow-sm)',
                                    transition: 'box-shadow 0.3s',
                                }}
                            >
                                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '24px' }}>{getDisasterEmoji(d.type)}</span>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {d.type}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    Disaster #{d.id} ·{' '}
                                                    {new Date(d.reportedAt).toLocaleDateString('en-PK', {
                                                        day: 'numeric', month: 'short',
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px',
                                            background: `${color}15`, color,
                                            fontSize: '11px', fontWeight: 700,
                                        }}>
                                            {d.severity}
                                        </span>
                                    </div>

                                    <p style={{
                                        fontSize: '13px', color: 'var(--text-secondary)',
                                        marginTop: '10px', lineHeight: 1.5,
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        display: '-webkit-box', WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}>
                                        {d.description}
                                    </p>
                                </div>

                                <div style={{
                                    padding: '14px 18px',
                                    background: isSafe ? 'rgba(39,174,96,0.05)' : 'var(--bg-surface-2)',
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', flexWrap: 'wrap', gap: '10px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Users size={14} color="var(--text-muted)" />
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {safeCount > 0
                                                ? `${safeCount} ${safeCount === 1 ? 'person' : 'people'} marked safe`
                                                : 'No one marked safe yet'}
                                        </span>
                                        {/* Show first few names */}
                                        {status.users?.slice(0, 3).map((name, ni) => (
                                            <span key={ni} style={{
                                                fontSize: '11px', padding: '2px 8px',
                                                background: 'rgba(39,174,96,0.1)',
                                                color: '#38a169', borderRadius: '10px', fontWeight: 600,
                                            }}>
                                                {name.split(' ')[0]}
                                            </span>
                                        ))}
                                        {(status.users?.length || 0) > 3 && (
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                +{status.users.length - 3} more
                                            </span>
                                        )}
                                    </div>

                                    {/* Mark safe button */}
                                    {isSafe ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 16px',
                                            background: 'rgba(39,174,96,0.1)',
                                            border: '1px solid rgba(39,174,96,0.3)',
                                            borderRadius: '10px',
                                            fontSize: '13px', fontWeight: 700, color: '#38a169',
                                        }}>
                                            <CheckCircle size={16} />
                                            You Are Marked Safe
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleMarkSafe(d.id)}
                                            disabled={marking === d.id || !isAuthenticated}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '9px 20px',
                                                background: marking === d.id
                                                    ? 'var(--border)'
                                                    : 'linear-gradient(135deg, #c41a1a, #e53e3e)',
                                                color: '#fff', border: 'none',
                                                borderRadius: '10px', cursor: (!isAuthenticated || marking === d.id) ? 'not-allowed' : 'pointer',
                                                fontSize: '13px', fontWeight: 800,
                                                boxShadow: '0 4px 12px rgba(229,62,62,0.3)',
                                                fontFamily: 'var(--font-display)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <Heart size={14} />
                                            {marking === d.id ? 'Marking...' : 'I Am Safe'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!isAuthenticated && (
                <div style={{
                    marginTop: '20px', padding: '14px 18px',
                    background: 'rgba(214,158,46,0.08)',
                    border: '1px solid rgba(214,158,46,0.25)',
                    borderRadius: '12px', fontSize: '13px',
                    color: 'var(--text-secondary)',
                }}>
                    ⚠️ <strong>Sign in required</strong> to mark yourself safe and notify your family.
                </div>
            )}
        </div>
    );
}