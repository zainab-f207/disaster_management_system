export default function FormAlert({ type = 'error', message, onClose }) {
    if (!message) return null;
    const config = {
        error: { bg: 'rgba(229,62,62,0.08)', border: '#e53e3e', color: '#e53e3e', icon: '⚠️' },
        success: { bg: 'rgba(56,161,105,0.08)', border: '#38a169', color: '#38a169', icon: '✅' },
        warning: { bg: 'rgba(214,158,46,0.08)', border: '#d69e2e', color: '#d69e2e', icon: '⚠️' },
    }[type];
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 14px', marginBottom: '18px',
            background: config.bg, border: `1.5px solid ${config.border}`,
            borderRadius: '10px', animation: 'fadeInDown 0.25s ease',
        }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{config.icon}</span>
            <span style={{ fontSize: '13px', color: config.color, fontWeight: 600, lineHeight: 1.5, flex: 1 }}>
                {message}
            </span>
            {onClose && (
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: config.color, fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
            )}
        </div>
    );
}