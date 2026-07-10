import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store';
import api from '../../services/api';
import LocationPicker from '../forms/LocationPicker';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';

const ALL_TYPES = [
    {
        group: '🌿 Natural', color: '#38a169', types: [
            { value: 'Flood', emoji: '🌊', label: 'Flood' },
            { value: 'Earthquake', emoji: '🌍', label: 'Earthquake' },
            { value: 'Storm', emoji: '⛈️', label: 'Storm' },
            { value: 'Landslide', emoji: '⛰️', label: 'Landslide' },
            { value: 'Heatwave', emoji: '🌡️', label: 'Heatwave' },
            { value: 'Smog', emoji: '🌫️', label: 'Smog / AQI' },
            { value: 'ColdWave', emoji: '❄️', label: 'Cold Wave' },
        ]
    },
    {
        group: '🏭 Man-Made', color: '#dd6b20', types: [
            { value: 'RoadAccident', emoji: '🚗', label: 'Road Accident' },
            { value: 'UrbanFire', emoji: '🔥', label: 'Urban Fire' },
            { value: 'BuildingCollapse', emoji: '🏚️', label: 'Building Collapse' },
            { value: 'GasExplosion', emoji: '💥', label: 'Gas Explosion' },
            { value: 'IndustrialAccident', emoji: '🏭', label: 'Industrial Accident' },
            { value: 'TrainAccident', emoji: '🚂', label: 'Train Accident' },
            { value: 'Stampede', emoji: '👥', label: 'Stampede' },
            { value: 'WaterContamination', emoji: '💧', label: 'Water Contamination' },
            { value: 'PowerGridFailure', emoji: '🔌', label: 'Power Grid Failure' },
        ]
    },
    {
        group: '⚠️ Other', color: '#9f7aea', types: [
            { value: 'Other', emoji: '⚠️', label: 'Other' },
        ]
    },
];

const ADMIN_SOURCES = [
    'Emergency Control Room Call',
    'NDMA Official Announcement',
    'PDMA District Report',
    'Rescue 1122 Confirmation',
    'Pakistan Railways Official',
    'News Agency Confirmed',
    'Government Press Release',
    'Field Officer Report',
];

export default function CreateDisasterForm({ onCreated }) {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [severity, setSeverity] = useState('High');
    const [source, setSource] = useState(ADMIN_SOURCES[0]);
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState({ latitude: null, longitude: null, locationName: '' });
    const [radius, setRadius] = useState('');
    const [descError, setDescError] = useState('');
    const [locError, setLocError] = useState('');
    const [typeError, setTypeError] = useState('');

    const handleSubmit = async () => {
        let valid = true;
        if (!selectedType) { setTypeError('Select disaster type'); valid = false; }
        else setTypeError('');
        if (!location.latitude) { setLocError('Select a location'); valid = false; }
        else setLocError('');
        if (description.trim().length < 15) { setDescError('At least 15 characters'); valid = false; }
        else setDescError('');
        if (!valid) return;

        setLoading(true);
        try {
            const res = await api.post('/disasters', {
                type: selectedType,
                severity,
                latitude: location.latitude,
                longitude: location.longitude,
                locationName: location.locationName,
                description: `[${source}] ${description}`,
                affectedAreaRadiusKm: radius ? parseFloat(radius) : null,
            });

            toast.success(`✅ Disaster created and verified immediately! ${['Heatwave', 'Smog', 'ColdWave', 'WaterContamination', 'PowerGridFailure'].includes(selectedType)
                    ? 'Alert sent to citizens.' : 'Responders auto-assigned.'
                }`);

            setSelectedType(null); setDescription(''); setSeverity('High');
            setLocation({ latitude: null, longitude: null, locationName: '' }); setRadius('');
            onCreated?.(res.data);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create disaster');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Shield size={16} color="var(--accent)" />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Create Official Disaster
                    </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    As admin, disasters you create are <strong style={{ color: 'var(--accent)' }}>immediately verified</strong> and responders dispatched — no review needed.
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                    Disaster Type {typeError && <span style={{ color: '#e53e3e', fontWeight: 400 }}> — {typeError}</span>}
                </label>
                {ALL_TYPES.map(g => (
                    <div key={g.group} style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: g.color, marginBottom: '6px', textTransform: 'uppercase' }}>
                            {g.group}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {g.types.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => { setSelectedType(t.value); setTypeError(''); }}
                                    style={{
                                        padding: '7px 14px',
                                        background: selectedType === t.value ? `${g.color}18` : 'var(--bg-surface-2)',
                                        border: `2px solid ${selectedType === t.value ? g.color : 'var(--border)'}`,
                                        borderRadius: '8px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        fontSize: '12px', fontWeight: selectedType === t.value ? 700 : 500,
                                        color: selectedType === t.value ? g.color : 'var(--text-secondary)',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <span>{t.emoji}</span> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Severity Level
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['Low', 'Medium', 'High', 'Critical'].map(s => {
                        const c = { Low: '#38a169', Medium: '#d69e2e', High: '#dd6b20', Critical: '#e53e3e' }[s];
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSeverity(s)}
                                style={{
                                    flex: 1, padding: '9px',
                                    background: severity === s ? `${c}15` : 'transparent',
                                    border: `2px solid ${severity === s ? c : 'var(--border)'}`,
                                    borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: 700, color: severity === s ? c : 'var(--text-muted)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {s}
                            </button>
                        );
                    })}
                </div>
            </div>

            <LocationPicker onLocationSelect={setLocation} error={locError} />

            <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '7px' }}>
                    Information Source
                </label>
                <select
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    style={{
                        width: '100%', padding: '10px 12px',
                        background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)',
                        borderRadius: '10px', color: 'var(--text-primary)',
                        fontSize: '13px', outline: 'none', cursor: 'pointer',
                    }}
                >
                    {ADMIN_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '7px' }}>
                    Official Description <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <textarea
                    value={description}
                    onChange={e => { setDescription(e.target.value); setDescError(''); }}
                    placeholder="Official description of the disaster — what happened, severity, areas affected, people impacted..."
                    rows={4}
                    style={{
                        width: '100%', padding: '11px 14px',
                        background: 'var(--bg-surface-2)',
                        border: `1.5px solid ${descError ? '#e53e3e' : 'var(--border)'}`,
                        borderRadius: '10px', color: 'var(--text-primary)',
                        fontSize: '13px', resize: 'vertical', outline: 'none',
                        lineHeight: 1.6, boxSizing: 'border-box',
                        fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = descError ? '#e53e3e' : 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = descError ? '#e53e3e' : 'var(--border)'}
                />
                {descError && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px' }}>⚠ {descError}</p>}
            </div>

            <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '7px' }}>
                    Affected Area Radius (km) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — optional</span>
                </label>
                <input
                    type="number" min="0.1" max="500" step="0.5"
                    value={radius}
                    onChange={e => setRadius(e.target.value)}
                    placeholder="e.g. 5"
                    style={{
                        width: '100%', padding: '10px 12px',
                        background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)',
                        borderRadius: '10px', color: 'var(--text-primary)',
                        fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                    }}
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                    width: '100%', padding: '14px',
                    background: loading
                        ? 'var(--border)'
                        : 'linear-gradient(135deg, #145c33, #27ae60)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    fontSize: '15px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(33,150,83,0.3)',
                    fontFamily: 'var(--font-display)',
                }}
            >
                {loading ? '⏳ Creating...' : '🛡️ Create Verified Disaster'}
            </button>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                This will be immediately verified and responders dispatched.
                Alert sent to all connected citizens.
            </p>
        </div>
    );
}