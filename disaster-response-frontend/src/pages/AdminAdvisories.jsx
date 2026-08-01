import { useState, useEffect, useCallback } from 'react';
import { CloudSun, CheckCircle, RefreshCw, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { advisoryApi } from '../services/api';

const SEV_COLOR = { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' };
const TYPE_EMOJI = { Flood: '🌊', Storm: '⛈️', Heatwave: '🌡️', DustStorm: '🌪️', Smog: '🌫️' };

export default function AdminAdvisories() {
    const [advisories, setAdvisories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAcked, setShowAcked] = useState(false);

    const fetchAdvisories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await advisoryApi.getAll(showAcked);
            setAdvisories(res.data || []);
        } catch { toast.error('Failed to load advisories'); }
        finally { setLoading(false); }
    }, [showAcked]);

    useEffect(() => { fetchAdvisories(); }, [fetchAdvisories]);

    const handleAck = async (id) => {
        try {
            await advisoryApi.acknowledge(id);
            toast.success('Advisory acknowledged');
            fetchAdvisories();
        } catch { toast.error('Failed to acknowledge'); }
    };

    const card = {
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)',
    };

    return (
        <div className="responsive-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#2b6cb0,#4299e1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CloudSun size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            Forecast Advisories
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            Early-warning risk forecasts — not yet active incidents
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setShowAcked(s => !s)}
                        style={{
                            padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                            border: `1.5px solid ${showAcked ? 'var(--accent)' : 'var(--border)'}`,
                            background: showAcked ? 'var(--accent-subtle)' : 'transparent',
                            color: showAcked ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer',
                        }}
                    >
                        {showAcked ? '✓ Showing All' : 'Show Acknowledged'}
                    </button>
                    <button onClick={fetchAdvisories} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ ...card, height: '90px' }} />)}
                </div>
            ) : advisories.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                    No active forecast advisories right now.
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {advisories.map(a => {
                        const color = SEV_COLOR[a.severity] || '#38a169';
                        return (
                            <div key={a.id} style={{ ...card, borderLeft: `5px solid ${color}`, opacity: a.acknowledged ? 0.6 : 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '20px' }}>{TYPE_EMOJI[a.type] || '⚠️'}</span>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {a.type} — {a.city}
                                            </span>
                                            <span style={{ fontSize: '11px', fontWeight: 700, background: `${color}18`, color, padding: '2px 8px', borderRadius: '6px' }}>
                                                {a.severity}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: 1.5 }}>
                                            {a.message}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Calendar size={12} /> Forecast for {new Date(a.forecastFor).toLocaleDateString('en-PK', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    {!a.acknowledged && (
                                        <button
                                            onClick={() => handleAck(a.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(56,161,105,0.1)', color: '#38a169', border: '1px solid rgba(56,161,105,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                                        >
                                            <CheckCircle size={13} /> Acknowledge
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}