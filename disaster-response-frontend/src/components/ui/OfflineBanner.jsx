import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const goOffline = () => setIsOffline(true);
        const goOnline = () => setIsOffline(false);
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div style={{
            position: 'fixed', bottom: '20px', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '12px 20px',
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '13px', fontWeight: 600,
            animation: 'fadeInUp 0.3s ease',
            maxWidth: 'calc(100vw - 40px)',
        }}>
            <WifiOff size={16} color="#e53e3e" />
            You are offline. Pages are cached and available. Emergency calls still work.
            <a href="tel:1122" style={{ color: '#6fcf97', fontWeight: 800, textDecoration: 'none' }}>
                Call 1122 →
            </a>
        </div>
    );
}