import { useState, useEffect, useRef } from 'react';
import { chatApi } from '../../services/api';
import { useChatStore } from '../../store';
import { useAuthStore } from '../../store';
import { activeConnectionInvoke } from '../../services/signalrConnection';
import { Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeamChat({ organizationId, organizationName }) {
    const { user } = useAuthStore();
    const messagesByOrg = useChatStore((s) => s.messagesByOrg);
    const setInitialMessages = useChatStore((s) => s.setInitialMessages);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    const messages = messagesByOrg[organizationId] || [];

    useEffect(() => {
        if (!organizationId) return;
        setLoading(true);
        chatApi.getMessages(organizationId)
            .then(res => setInitialMessages(organizationId, res.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));

        // Join the live channel for this org
        activeConnectionInvoke('SubscribeToOrgChat', organizationId);
        return () => activeConnectionInvoke('UnsubscribeFromOrgChat', organizationId);
    }, [organizationId, setInitialMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput('');
        try {
            await chatApi.sendMessage(organizationId, text);
            // No need to manually add — SignalR broadcast will deliver it back to us too
        } catch {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    if (!organizationId) {
        return (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Select an organization to view its chat.
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            height: '520px',
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: '14px', overflow: 'hidden',
        }}>
            <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--bg-surface-2)',
            }}>
                <MessageCircle size={16} color="var(--accent)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {organizationName || `Organization #${organizationId}`} — Team Chat
                </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>
                        Loading messages...
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>
                        No messages yet. Say hello 👋
                    </div>
                ) : (
                    messages.map((m, i) => {
                        const isMe = m.senderId === user?.id;
                        const isAdmin = m.senderRole === 'Admin';
                        return (
                            <div key={m.id || i} style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                marginBottom: '10px',
                            }}>
                                <div style={{
                                    maxWidth: '75%', padding: '9px 13px',
                                    background: isMe ? 'linear-gradient(135deg,#145c33,#27ae60)' : 'var(--bg-surface-2)',
                                    color: isMe ? '#fff' : 'var(--text-primary)',
                                    borderRadius: isMe ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                                    fontSize: '13px', lineHeight: 1.5,
                                }}>
                                    {!isMe && (
                                        <div style={{
                                            fontSize: '11px', fontWeight: 700, marginBottom: '2px',
                                            color: isAdmin ? '#d69e2e' : 'var(--accent)',
                                        }}>
                                            {isAdmin ? '👑 ' : '🚒 '}{m.senderName}
                                        </div>
                                    )}
                                    {m.message}
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                    {new Date(m.sentAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid var(--border)' }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type a message..."
                    style={{
                        flex: 1, padding: '10px 14px',
                        background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                        borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    style={{
                        padding: '0 16px', background: !input.trim() || sending ? 'var(--border)' : 'var(--accent)',
                        color: '#fff', border: 'none', borderRadius: '10px',
                        cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center',
                    }}
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}