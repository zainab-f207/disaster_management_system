import { useState, useEffect } from 'react';
import { Settings, Bell, Tag, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

// Reference list — matches your backend DisasterCategoryHelper
const CATEGORIES = [
    { type: 'Heatwave', category: '⚠️ Alert Only (no dispatch)' },
    { type: 'Smog', category: '⚠️ Alert Only (no dispatch)' },
    { type: 'DustStorm', category: '⚠️ Alert Only (no dispatch)' },
    { type: 'ColdWave', category: '⚠️ Alert Only (no dispatch)' },
    { type: 'WaterContamination', category: '⚠️ Alert Only (no dispatch)' },
    { type: 'PowerGridFailure', category: '⚠️ Alert Only (no dispatch)' },
    { type: 'Flood', category: '🌍 Natural — auto-detectable + dispatch' },
    { type: 'Earthquake', category: '🌍 Natural — auto-detectable + dispatch' },
    { type: 'Storm', category: '🌍 Natural — auto-detectable + dispatch' },
    { type: 'Landslide', category: '🌍 Natural — auto-detectable + dispatch' },
    { type: 'Lightning', category: '🌍 Natural — auto-detectable + dispatch' },
    { type: 'RoadAccident', category: '🏭 Man-made — citizen report only' },
    { type: 'UrbanFire', category: '🏭 Man-made — citizen report only' },
    { type: 'BuildingCollapse', category: '🏭 Man-made — citizen report only' },
    { type: 'GasExplosion', category: '🏭 Man-made — citizen report only' },
    { type: 'IndustrialAccident', category: '🏭 Man-made — citizen report only' },
    { type: 'TrainAccident', category: '🏭 Man-made — citizen report only' },
    { type: 'Stampede', category: '🏭 Man-made — citizen report only' },
];

export default function AdminSettings() {
    const [pushEnabled, setPushEnabled] = useState(true);
    const [autoAssign, setAutoAssign] = useState(true);

    useEffect(() => {
        setPushEnabled(localStorage.getItem('setting_push_enabled') !== 'false');
        setAutoAssign(localStorage.getItem('setting_auto_assign') !== 'false');
    }, []);

    const togglePush = () => {
        const next = !pushEnabled;
        setPushEnabled(next);
        localStorage.setItem('setting_push_enabled', String(next));
        toast.success(`Push notifications ${next ? 'enabled' : 'disabled'} (this device only)`);
    };

    const toggleAutoAssign = () => {
        const next = !autoAssign;
        setAutoAssign(next);
        localStorage.setItem('setting_auto_assign', String(next));
        toast.success(`Auto-assign preference ${next ? 'enabled' : 'disabled'} (this device only)`);
    };

    const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#4a5568,#718096)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings size={24} color="#fff" />
                </div>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>System Settings</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Preferences and reference information</p>
                </div>
            </div>

            {/* Notification toggle */}
            <div style={{ ...card, marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Bell size={16} color="var(--accent)" />
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Notifications</h3>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Push notifications on this device</span>
                    <button onClick={togglePush} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: pushEnabled ? '#38a169' : 'var(--border)', color: pushEnabled ? '#fff' : 'var(--text-muted)' }}>
                        {pushEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Prefer auto-assign over manual (UI default)</span>
                    <button onClick={toggleAutoAssign} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: autoAssign ? '#38a169' : 'var(--border)', color: autoAssign ? '#fff' : 'var(--text-muted)' }}>
                        {autoAssign ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Disaster categories reference */}
            <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Tag size={16} color="var(--accent)" />
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Disaster Category Reference</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    This is how the system currently classifies each disaster type. To change this, edit <code>DisasterCategoryHelper.cs</code> in the backend.
                </p>
                <div style={{ display: 'grid', gap: '6px' }}>
                    {CATEGORIES.map(c => (
                        <div key={c.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: '8px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.type}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{c.category}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ ...card, marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    User role management and password resets aren't built yet — use the Admin/Responder/Citizen management pages for account status changes.
                </span>
            </div>
        </div>
    );
}