import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store';
import toast from 'react-hot-toast';
import { ThumbsUp, ThumbsDown, MapPin } from 'lucide-react';

export default function IncidentVerification({ report, onClose }) {
    const { isAuthenticated } = useAuthStore();
    const [voted, setVoted] = useState(null); // 'yes' | 'no'
    const [counts, setCounts] = useState({ yes: 0, no: 0 });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchVoteCounts();
    }, [report.id]);

    const fetchVoteCounts = async () => {
        try {
            const res = await api.get(`/reports/${report.id}/votes`);
            setCounts(res.data || { yes: 0, no: 0 });
        } catch { }
    };

    const handleVote = async (vote) => {
        if (!isAuthenticated) { toast.error('Sign in to confirm reports'); return; }
        if (voted) return;
        setSubmitting(true);
        try {
            await api.post(`/reports/${report.id}/verify`, { confirmed: vote === 'yes' });
            setVoted(vote);
            setCounts(prev => ({ ...prev, [vote]: (prev[vote] || 0) + 1 }));
            toast.success(vote === 'yes'
                ? 'Thanks! Your confirmation helps us verify this incident. 👍'
                : 'Thanks for your feedback. 👎');
        } catch {
            toast.error('Failed to submit verification');
        } finally {
            setSubmitting(false);
        }
    };

    const total = (counts.yes || 0) + (counts.no || 0);
    const yesPercent = total > 0 ? Math.round(((counts.yes || 0) / total) * 100) : 0;

    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderLeft: '4px solid #d69e2e',
            borderRadius: '14px',
            padding: '18px',
            animation: 'fadeInUp 0.3s ease',
            boxShadow: 'var(--shadow-md)',
        }}>
            <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    👁 Can you confirm this incident?
                </div>
                <div style={{
                    padding: '10px 12px',
                    background: 'var(--bg-surface-2)',
                    borderRadius: '8px',
                    fontSize: '13px', color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                }}>
                    <strong>{report.type}</strong> reported nearby
                    {report.locationName && (
                        <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>
                            <MapPin size={10} style={{ display: 'inline', marginRight: '2px' }} />
                            {report.locationName.split(',')[0]}
                        </span>
                    )}
                    <br />
                    <span style={{ fontSize: '12px' }}>"{report.description?.slice(0, 80)}..."</span>
                </div>
            </div>

            {!voted ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <button
                        onClick={() => handleVote('yes')}
                        disabled={submitting}
                        style={{
                            padding: '12px',
                            background: 'rgba(56,161,105,0.1)',
                            border: '2px solid rgba(56,161,105,0.4)',
                            borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s', color: '#38a169',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(56,161,105,0.2)';
                            e.currentTarget.style.borderColor = '#38a169';
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(56,161,105,0.1)';
                            e.currentTarget.style.borderColor = 'rgba(56,161,105,0.4)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <ThumbsUp size={20} />
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>Yes, I see it</span>
                    </button>

                    <button
                        onClick={() => handleVote('no')}
                        disabled={submitting}
                        style={{
                            padding: '12px',
                            background: 'rgba(229,62,62,0.08)',
                            border: '2px solid rgba(229,62,62,0.3)',
                            borderRadius: '10px', cursor: submitting ? 'not-allowed' : 'pointer',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s', color: '#e53e3e',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(229,62,62,0.15)';
                            e.currentTarget.style.borderColor = '#e53e3e';
                            e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(229,62,62,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(229,62,62,0.3)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <ThumbsDown size={20} />
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>No, not visible</span>
                    </button>
                </div>
            ) : (
                <div style={{
                    padding: '12px 14px', marginBottom: '12px',
                    background: voted === 'yes' ? 'rgba(56,161,105,0.1)' : 'rgba(229,62,62,0.08)',
                    border: `1px solid ${voted === 'yes' ? 'rgba(56,161,105,0.3)' : 'rgba(229,62,62,0.3)'}`,
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '13px', fontWeight: 700,
                    color: voted === 'yes' ? '#38a169' : '#e53e3e',
                }}>
                    {voted === 'yes' ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                    {voted === 'yes' ? 'You confirmed this incident' : 'You marked this as not visible'}
                </div>
            )}

            {total > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '11px', color: '#38a169', fontWeight: 700 }}>
                            {counts.yes || 0} confirmed
                        </span>
                        <span style={{ fontSize: '11px', color: '#e53e3e', fontWeight: 700 }}>
                            {counts.no || 0} not seen
                        </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', background: '#38a169',
                            width: `${yesPercent}%`, borderRadius: '3px',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', textAlign: 'center' }}>
                        {total} {total === 1 ? 'response' : 'responses'} ·{' '}
                        {yesPercent}% confirmed
                    </div>
                </div>
            )}

            {onClose && (
                <button
                    onClick={onClose}
                    style={{
                        marginTop: '10px', width: '100%',
                        padding: '8px', background: 'transparent',
                        border: '1px solid var(--border)', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)',
                    }}
                >
                    Dismiss
                </button>
            )}
        </div>
    );
}