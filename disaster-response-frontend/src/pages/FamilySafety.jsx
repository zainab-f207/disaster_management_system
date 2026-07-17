import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Users, UserPlus, Heart, Clock } from 'lucide-react';

export default function FamilySafety() {
    const [family, setFamily] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    const fetchFamily = async () => {
        setLoading(true);
        try {
            const res = await api.get('/family');
            setFamily(res.data || []);
        } catch { toast.error('Failed to load family list'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFamily(); }, []);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            await api.post('/family/invite', { email: inviteEmail.trim() });
            toast.success(`Invitation sent via Email to ${inviteEmail.trim()}!`);
            setInviteEmail('');
            fetchFamily();
        } catch (err) {
            toast.error(err.response?.data?.Error || 'Failed to send invite');
        } finally { setInviting(false); }
    };

    const handleAccept = async (id) => {
        try {
            await api.put(`/family/${id}/accept`);
            toast.success('Connection accepted!');
            fetchFamily();
        } catch { toast.error('Failed to accept'); }
    };

    const handleRemove = async (id) => {
        if (!window.confirm('Remove this family connection?')) return;
        try {
            await api.delete(`/family/${id}`);
            fetchFamily();
        } catch { toast.error('Failed to remove'); }
    };

    const accepted = family.filter(f => f.status === 'Accepted');
    const incoming = family.filter(f => f.isIncomingRequest);
    const outgoing = family.filter(f => f.status === 'Pending' && !f.isIncomingRequest);

    const card = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' };

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '88px 24px 60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#c41a1a,#e53e3e)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={22} color="#fff" />
                </div>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Family Safety Network</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>See who's marked themselves safe, and let your family see you too</p>
                </div>
            </div>

            <div style={{ ...card, marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="Family member's email address..."
                    style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
                <button onClick={handleInvite} disabled={inviting} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'linear-gradient(135deg,#145c33,#27ae60)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                    <UserPlus size={14} /> {inviting ? 'Sending...' : 'Send Invite'}
                </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', marginTop: '-12px' }}>
                💡 An email will be dispatched containing a secure registration link. Once they register and accept, they'll appear here.
            </p>

            {incoming.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>PENDING REQUESTS TO YOU</h3>
                    {incoming.map(f => (
                        <div key={f.connectionId} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderLeft: '3px solid #d69e2e' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.person.fullName} wants to connect</span>
                            <button onClick={() => handleAccept(f.connectionId)} style={{ padding: '6px 14px', background: '#38a169', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Accept</button>
                        </div>
                    ))}
                </div>
            )}

            {outgoing.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>WAITING FOR THEM TO ACCEPT</h3>
                    {outgoing.map(f => (
                        <div key={f.connectionId} style={{ ...card, marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Invitation sent to <strong>{f.person.fullName}</strong> ({f.person.email})
                        </div>
                    ))}
                </div>
            )}

            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>YOUR FAMILY</h3>
            {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
            ) : accepted.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    No family connected yet. Invite someone above.
                </div>
            ) : (
                accepted.map(f => (
                    <div key={f.connectionId} style={{ ...card, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${f.safetyStatus ? '#38a169' : 'var(--border)'}` }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.person.fullName}</div>
                            {f.safetyStatus ? (
                                <div style={{ fontSize: '12px', color: '#38a169', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                                    <Heart size={11} fill="#38a169" /> Safe — {f.safetyStatus.disasterType} · {new Date(f.safetyStatus.markedAt).toLocaleString('en-PK')}
                                </div>
                            ) : (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                                    <Clock size={11} /> No status marked yet
                                </div>
                            )}
                        </div>
                        <button onClick={() => handleRemove(f.connectionId)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                    </div>
                ))
            )}
        </div>
    );
}