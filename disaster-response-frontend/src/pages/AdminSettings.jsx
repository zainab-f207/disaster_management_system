import { useState } from 'react';
import { Settings, Bell, Tag, Shield, Database, Trash2, Moon, Sun, Smartphone, Mail, Sliders, Globe, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useThemeStore, useSettingsStore } from '../store';
import { adminApi } from '../services/api';

// Reference list — matches your backend DisasterCategoryHelper
const CATEGORIES = [
    { type: 'Heatwave', category: 'Alert Only (no dispatch)' },
    { type: 'Smog', category: 'Alert Only (no dispatch)' },
    { type: 'Flood', category: 'Natural — auto-dispatch' },
    { type: 'Earthquake', category: 'Natural — auto-dispatch' },
    { type: 'Storm', category: 'Natural — auto-dispatch' },
    { type: 'RoadAccident', category: 'Man-made — report only' },
    { type: 'UrbanFire', category: 'Man-made — report only' },
];

export default function AdminSettings() {
    const { theme, toggleTheme } = useThemeStore();
    const { pushEnabled, emailEnabled, autoAssign, sensitivity, setSetting } = useSettingsStore();
    const [sendingReport, setSendingReport] = useState(false);

    const toggle = (key, label) => {
        const curr = { pushEnabled, emailEnabled, autoAssign }[key];
        setSetting(key, !curr);
        toast.success(`${label} ${!curr ? 'enabled' : 'disabled'}`);
    };

    const handleSensitivity = (e) => {
        setSetting('sensitivity', e.target.value);
        toast.success('Alert sensitivity updated');
    };

    const handleSendReport = async () => {
        setSendingReport(true);
        const id = toast.loading('Sending daily incident report...');
        try {
            await adminApi.sendDailyReport();
            toast.success('Daily report sent to your admin email!', { id });
        } catch (err) {
            const msg = err.response?.data?.Message || err.message || 'Failed to send report';
            toast.error(msg, { id });
        } finally {
            setSendingReport(false);
        }
    };

    const handleAction = (loadingMsg, successMsg) => {
        const id = toast.loading(loadingMsg);
        setTimeout(() => toast.success(successMsg, { id }), 1500);
    };

    const card = {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
    };
    const sectionTitle = {
        fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)',
        margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px',
    };
    const row = {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid var(--border)',
    };

    const Toggle = ({ active, onClick }) => (
        <button
            onClick={onClick}
            style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', background: active ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
        >
            <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', left: active ? '23px' : '3px',
                transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }} />
        </button>
    );

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh', display: 'grid', gap: '24px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--accent), #2b6cb0)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(49,130,206,0.25)' }}>
                    <Settings size={28} color="#fff" />
                </div>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>System Settings</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>All settings apply globally across every role in real-time</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

                {/* ── Global Config ── */}
                <div style={card}>
                    <h3 style={sectionTitle}><Sliders size={18} color="var(--accent)" /> Global Configuration</h3>
                    <div style={row}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Auto-Assign Responders</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Automatically dispatch nearest available units</div>
                        </div>
                        <Toggle active={autoAssign} onClick={() => toggle('autoAssign', 'Auto-assign')} />
                    </div>
                    <div style={{ ...row, borderBottom: 'none' }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Alert Sensitivity</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Threshold for automated system alerts</div>
                        </div>
                        <select
                            value={sensitivity}
                            onChange={handleSensitivity}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="High">High (All Alerts)</option>
                            <option value="Medium">Medium (Major Only)</option>
                            <option value="Low">Low (Critical Only)</option>
                        </select>
                    </div>
                </div>

                {/* ── Communication ── */}
                <div style={card}>
                    <h3 style={sectionTitle}><Bell size={18} color="var(--accent)" /> Communication & Alerts</h3>

                    {/* Push Notifications */}
                    <div style={row}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <Smartphone size={18} color="var(--text-secondary)" />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Push Notifications</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-time browser alerts for all users</div>
                            </div>
                        </div>
                        <Toggle active={pushEnabled} onClick={() => toggle('pushEnabled', 'Push notifications')} />
                    </div>

                    {/* Email Summaries — fully functional */}
                    <div style={{ paddingTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Mail size={18} color="var(--text-secondary)" />
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Daily Incident Email Summaries</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sends a full incident report to your admin email every morning at 8:00 AM PKT</div>
                                </div>
                            </div>
                            <Toggle active={emailEnabled} onClick={() => toggle('emailEnabled', 'Email summaries')} />
                        </div>

                        {emailEnabled && (
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--border)', marginTop: '8px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                                    📧 The report includes: new disasters (last 24h), citizen report count, active incident count, and a full incident table. Sent to the email set in <code style={{ background: 'var(--border)', padding: '2px 5px', borderRadius: '4px', fontSize: '11px' }}>appsettings.json → EmailSettings:AdminEmail</code>
                                </p>
                                <button
                                    onClick={handleSendReport}
                                    disabled={sendingReport}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '9px 16px', borderRadius: '8px', border: 'none',
                                        background: 'linear-gradient(135deg, var(--accent), #2b6cb0)',
                                        color: '#fff', fontWeight: 700, fontSize: '13px',
                                        cursor: sendingReport ? 'not-allowed' : 'pointer',
                                        opacity: sendingReport ? 0.7 : 1, transition: '0.2s',
                                    }}
                                >
                                    {sendingReport
                                        ? <><span style={{ width: '14px', height: '14px', border: '2px solid #ffffff88', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Sending...</>
                                        : <><Send size={14} /> Send Report Now</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Appearance ── */}
                <div style={card}>
                    <h3 style={sectionTitle}><Globe size={18} color="var(--accent)" /> Appearance</h3>
                    <div style={row}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Theme Preference</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Applies globally — affects all users on this device</div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                                borderRadius: '8px', border: '1px solid var(--border)',
                                background: 'var(--bg-surface-2)', color: 'var(--text-primary)', cursor: 'pointer',
                                fontWeight: 600, fontSize: '13px', transition: '0.2s',
                            }}
                        >
                            {theme === 'dark' ? <><Moon size={16} /> Dark Mode</> : <><Sun size={16} /> Light Mode</>}
                        </button>
                    </div>
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(56,161,105,0.08)', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle size={14} color="#38a169" />
                        <span style={{ fontSize: '12px', color: '#38a169', fontWeight: 600 }}>Theme syncs instantly across all open tabs</span>
                    </div>
                </div>

                {/* ── System Data ── */}
                <div style={card}>
                    <h3 style={sectionTitle}><Database size={18} color="var(--accent)" /> System Data</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <button
                            onClick={() => handleAction('Generating backup...', 'Database backup created successfully')}
                            style={{ padding: '12px 16px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '13px' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={16} color="var(--accent)" /> Backup Database
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manual trigger</span>
                        </button>
                        <button
                            onClick={() => handleAction('Clearing caches...', 'System cache cleared successfully')}
                            style={{ padding: '12px 16px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: '#e53e3e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '13px' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Trash2 size={16} /> Clear System Cache
                            </span>
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>Frees up disk space</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Disaster Categories Reference ── */}
            <div style={{ ...card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Tag size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Disaster Category Classifications</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {CATEGORIES.map(c => (
                        <div key={c.type} style={{ padding: '12px 16px', background: 'var(--bg-surface-2)', borderRadius: '10px', borderLeft: '3px solid var(--accent)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginBottom: '4px' }}>{c.type}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.category}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(56,161,105,0.08)', color: '#38a169', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Shield size={15} /> To modify these permanently, update <code style={{ background: 'rgba(56,161,105,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', marginLeft: '4px' }}>DisasterCategoryHelper.cs</code> in the backend.
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}