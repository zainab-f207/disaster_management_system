import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle } from 'lucide-react';

const QUICK_QUESTIONS = [
  { emoji: '🌊', q: 'Flood is coming, what should I do?' },
  { emoji: '🔥', q: 'There is smoke in my house' },
  { emoji: '🌍', q: 'Earthquake just happened, what now?' },
  { emoji: '💥', q: 'I smell gas in my home' },
  { emoji: '🌡️', q: 'Heatwave precautions for elderly' },
  { emoji: '🏚️', q: 'Building collapsed nearby, how to help?' },
];

const SYSTEM_PROMPT = `You are Pakistan's Emergency Disaster Assistant. You help citizens during disasters and emergencies in Pakistan.

Rules:
1. Always respond in simple, clear English
2. Always include emergency numbers: 1122 (Rescue), 115 (Edhi), 1135 (NDMA), 15 (Police)
3. Give step-by-step guidance for immediate safety
4. Be brief and actionable — people are in stressful situations
5. Always end with "Call 1122 immediately if this is life-threatening"
6. You know Pakistan's geography and disaster context
7. Mention relevant Pakistan organizations when appropriate
8. Keep responses under 200 words unless absolutely necessary

You are NOT a replacement for emergency services. Always direct people to call emergency numbers.`;

export default function AIAssistant() {
  const [messages, setMessages]   = useState([
    {
      role:    'assistant',
      content: '🛡️ Assalamu Alaikum! I\'m Pakistan\'s Emergency Assistant. I can help you with disaster safety guidance, precautions, and first response steps.\n\n**Remember:** If there is immediate danger, call **1122** (Rescue) or **115** (Edhi) first!\n\nHow can I help you today?',
    }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const bottomRef                 = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const getApiUrl = () => {
        let url = import.meta.env.VITE_API_URL || 'https://localhost:7129';
        if (!url.endsWith('/api') && !url.endsWith('/api/')) {
          url = url.replace(/\/$/, '') + '/api';
        }
        return url.replace(/\/$/, '');
      };
      const response = await fetch(`${getApiUrl()}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg },
          ],
          userMessage: userMsg
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'I could not generate a response. Please call 1122 immediately.';

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: '⚠️ Connection error. If this is an emergency, please call **1122** (Rescue) or **115** (Edhi) immediately.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const renderText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={{
      maxWidth: '760px', margin: '0 auto',
      padding: '88px 24px 40px',
      display: 'flex', flexDirection: 'column',
      height: '100vh', boxSizing: 'border-box',
    }}>
      <div style={{ marginBottom: '20px', animation: 'fadeInUp 0.4s ease', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'linear-gradient(135deg, #145c33, #27ae60)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(33,150,83,0.3)',
            fontSize: '22px',
          }}>
            🤖
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '20px',
              fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1,
            }}>
              AI Disaster Assistant
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Instant guidance for emergencies — Powered by Claude AI
            </p>
          </div>
        </div>

        <div style={{
          padding: '10px 14px',
          background: 'rgba(229,62,62,0.08)',
          border: '1px solid rgba(229,62,62,0.2)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '12px', color: '#e53e3e', fontWeight: 600,
        }}>
          <AlertTriangle size={14} />
          Life-threatening emergency? Call 1122 (Rescue) or 115 (Edhi) immediately — don't wait for AI.
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px', marginBottom: '16px',
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: '10px',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '14px',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                width: '32px', height: '32px', flexShrink: 0,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #145c33, #27ae60)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px',
              }}>
                🤖
              </div>
            )}

            <div style={{
              maxWidth: '80%',
              padding: '12px 14px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #145c33, #27ae60)'
                : 'var(--bg-surface-2)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              borderRadius: msg.role === 'user'
                ? '16px 16px 4px 16px'
                : '4px 16px 16px 16px',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              fontSize: '14px', lineHeight: 1.6,
            }}
              dangerouslySetInnerHTML={{ __html: renderText(msg.content) }}
            />

            {msg.role === 'user' && (
              <div style={{
                width: '32px', height: '32px', flexShrink: 0,
                borderRadius: '10px',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={16} color="var(--text-muted)" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '32px', height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #145c33, #27ae60)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>
              🤖
            </div>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '4px 16px 16px 16px',
              display: 'flex', gap: '4px', alignItems: 'center',
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'var(--accent)',
                  animation: `pulse-dot 1.4s ease-in-out ${i*0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ marginBottom: '12px', flexShrink: 0 }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Quick questions:
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q.q}
                onClick={() => sendMessage(q.q)}
                style={{
                  padding: '6px 12px', fontSize: '12px',
                  background: 'var(--accent-subtle)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '20px', cursor: 'pointer',
                  color: 'var(--accent)', fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(39,174,96,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-subtle)'}
              >
                {q.emoji} {q.q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', gap: '10px', flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Describe your emergency or ask for safety guidance..."
          rows={2}
          style={{
            flex: 1, padding: '12px 14px',
            background: 'var(--bg-surface-2)',
            border: '1.5px solid var(--border)',
            borderRadius: '12px', color: 'var(--text-primary)',
            fontSize: '14px', resize: 'none', outline: 'none',
            fontFamily: 'var(--font-body)', lineHeight: 1.5,
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            padding: '0 18px',
            background: !input.trim() || loading
              ? 'var(--border)'
              : 'linear-gradient(135deg, #145c33, #27ae60)',
            color: '#fff', border: 'none',
            borderRadius: '12px', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            boxShadow: !input.trim() || loading ? 'none' : '0 4px 12px rgba(33,150,83,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}