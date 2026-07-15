import { Link, useLocation } from 'react-router-dom';

import { useState, useEffect, useCallback } from 'react';

const DESCRIPTION_TEMPLATES = {
    Flood: (loc, src) => `A significant flood event has been confirmed${loc ? ` in ${loc}` : ''}. Rising water levels are causing disruption to residential and agricultural areas. This has been verified via ${src}. Evacuation of low-lying areas is underway and emergency services are on site.`,
    Earthquake: (loc, src) => `An earthquake has been reported${loc ? ` near ${loc}` : ''}. Preliminary assessment indicates structural damage to buildings in the affected area. Confirmed through ${src}. Search and rescue teams have been deployed and aftershock monitoring is active.`,
    Storm: (loc, src) => `A severe storm has struck${loc ? ` the ${loc} area` : ''}. High winds and heavy rainfall are causing widespread disruption. Confirmed by ${src}. Citizens are advised to stay indoors and avoid travel until conditions improve.`,
    Landslide: (loc, src) => `A landslide has been reported${loc ? ` in ${loc}` : ''}, blocking roads and posing a risk to nearby structures. Verified through ${src}. Affected routes are closed and heavy machinery has been dispatched for clearance.`,
    Heatwave: (loc, src) => `An extreme heatwave is affecting${loc ? ` ${loc}` : ' the region'}. Temperatures are critically above seasonal norms. Confirmed per ${src}. Cooling centres have been established and vulnerable populations are urged to seek shelter.`,
    Smog: (loc, src) => `Hazardous smog levels have been recorded${loc ? ` in ${loc}` : ''}. Air Quality Index has exceeded safe thresholds. Reported by ${src}. Citizens with respiratory conditions are advised to stay indoors and wear masks if outdoors.`,
    ColdWave: (loc, src) => `A severe cold wave is impacting${loc ? ` ${loc}` : ' the region'}. Sub-zero temperatures have been recorded, endangering vulnerable populations. Verified via ${src}. Emergency shelters have been activated.`,
    RoadAccident: (loc, src) => `A major road accident has occurred${loc ? ` on/near ${loc}` : ''}. Multiple vehicles involved with casualties reported. Confirmed through ${src}. Emergency medical teams and traffic management are at the scene.`,
    UrbanFire: (loc, src) => `A major fire has broken out${loc ? ` in ${loc}` : ''}. The blaze is spreading and posing risk to adjacent structures. Confirmed by ${src}. Fire brigades are on site and affected residents have been evacuated.`,
    BuildingCollapse: (loc, src) => `A building collapse has been reported${loc ? ` in ${loc}` : ''}. There are people trapped under rubble. Verified through ${src}. Rescue teams with equipment are at the scene and area has been cordoned off.`,
    GasExplosion: (loc, src) => `A gas explosion has occurred${loc ? ` in ${loc}` : ''}. The blast has caused structural damage and injuries. Confirmed by ${src}. Area has been evacuated, gas supply cut off, and emergency teams are responding.`,
    IndustrialAccident: (loc, src) => `An industrial accident has been reported${loc ? ` at/near ${loc}` : ''}. Hazardous materials may be involved. Verified via ${src}. Safety perimeter established and specialised response teams are on site.`,
    TrainAccident: (loc, src) => `A train accident has been reported${loc ? ` near ${loc}` : ''}. Casualties have been confirmed. Verified through Pakistan Railways Official and ${src}. Emergency services are at the scene and the rail corridor is closed.`,
    Stampede: (loc, src) => `A human stampede has occurred${loc ? ` in ${loc}` : ''}. Multiple casualties have been reported. Confirmed by ${src}. Emergency medical teams are responding and crowd control measures are in effect.`,
    WaterContamination: (loc, src) => `Water supply contamination has been detected${loc ? ` in ${loc}` : ''}. The water is unsafe for human consumption. Verified through ${src}. Alternative water supplies are being arranged and testing is underway.`,
    PowerGridFailure: (loc, src) => `A major power grid failure has been reported${loc ? ` affecting ${loc}` : ''}. Large areas are without electricity. Confirmed per ${src}. Restoration teams are working and backup generators are being deployed at critical facilities.`,
    Other: (loc, src) => `An emergency incident has been reported${loc ? ` in/near ${loc}` : ''}. Details are being confirmed. Verified through ${src}. Relevant authorities have been notified and the situation is being assessed.`,
};


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

// Maps display label -> backend DisasterSource enum value
export const ADMIN_SOURCES = [
    { label: 'Pakistan Meteorological Department (PMD)', value: 'WeatherApi' },
    { label: 'USGS Earthquake API',                    value: 'EarthquakeApi' },
    { label: 'OpenWeather API',                        value: 'WeatherApi' },
    { label: 'Air Quality Index (IQAir/AQI)',           value: 'AirQualityApi' },
    { label: 'Citizen Reports Feed',                   value: 'CitizenReport' },
    { label: 'Responder Reports Feed',                 value: 'ResponderReport' },
    { label: 'NDMA Bulletin',                          value: 'OfficialAgency' },
    { label: 'PDMA Alert',                             value: 'OfficialAgency' },
    { label: 'Rescue 1122 Confirmation',               value: 'AdminReport' },
    { label: 'Police Dispatch Notification',           value: 'AdminReport' },
];

export default function CreateDisasterForm({ onCreated }) {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [severity, setSeverity] = useState('High');
    const [source, setSource] = useState(ADMIN_SOURCES[0].value);
    const [sourceLabel, setSourceLabel] = useState(ADMIN_SOURCES[0].label);
    const [sourceKey, setSourceKey] = useState(`${ADMIN_SOURCES[0].value}|${ADMIN_SOURCES[0].label}`);
    const [description, setDescription] = useState('');
    const [descAutoFilled, setDescAutoFilled] = useState(false);
    const [location, setLocation] = useState({ latitude: null, longitude: null, locationName: '' });
    const [radius, setRadius] = useState('');
    const [descError, setDescError] = useState('');
    const [locError, setLocError] = useState('');
    const [typeError, setTypeError] = useState('');

    const { search } = useLocation();

    // Pre-fill fields from URL query parameters (useful for automated warning alerts)
    useEffect(() => {
        const params = new URLSearchParams(search);
        const typeParam = params.get('type');
        const severityParam = params.get('severity');
        const sourceParam = params.get('source');
        const locNameParam = params.get('locationName');
        const latParam = params.get('latitude');
        const lngParam = params.get('longitude');
        const descParam = params.get('description');

        if (typeParam) {
            setSelectedType(typeParam);
        }
        if (severityParam) {
            setSeverity(severityParam);
        }
        if (sourceParam) {
            // Try to find a matching source by label or value
            const match = ADMIN_SOURCES.find(
                s => s.label === sourceParam || s.value === sourceParam
            );
            if (match) {
                setSource(match.value);
                setSourceLabel(match.label);
                setSourceKey(`${match.value}|${match.label}`);
            } else {
                setSource(sourceParam);
                setSourceLabel(sourceParam);
                setSourceKey(`${sourceParam}|${sourceParam}`);
            }
        }
        if (locNameParam || latParam || lngParam) {
            setLocation({
                latitude: latParam ? parseFloat(latParam) : null,
                longitude: lngParam ? parseFloat(lngParam) : null,
                locationName: locNameParam || ''
            });
        }
        if (descParam) {
            setDescription(descParam);
            setDescAutoFilled(false);
        } else if (typeParam) {
            // If type was prefilled but no explicit description, auto-fill it
            setDescAutoFilled(true);
        }
    }, [search]);

    const generateDescription = useCallback((type, src, loc) => {
        if (!type) return '';
        const template = DESCRIPTION_TEMPLATES[type] ?? DESCRIPTION_TEMPLATES.Other;
        const srcLabel = typeof src === 'string'
            ? (ADMIN_SOURCES.find(s => s.value === src)?.label || src)
            : (src?.label || ADMIN_SOURCES[0].label);
        return template(loc || '', srcLabel);
    }, []);

    // Auto-fill description when type, source, or location changes — only if still auto-generated/auto-filled
    useEffect(() => {
        if (selectedType && descAutoFilled) {
            const generated = generateDescription(selectedType, source, location.locationName);
            setDescription(generated);
            setDescError('');
        }
    }, [selectedType, source, location.locationName, generateDescription, descAutoFilled]);

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
                description,
                source,                              // enum value e.g. 'WeatherApi'
                sourceReference: sourceLabel,        // human-readable label
                affectedAreaRadiusKm: radius ? parseFloat(radius) : null,
            });

            toast.success(`✅ Disaster created and verified immediately! ${['Heatwave', 'Smog', 'ColdWave', 'WaterContamination', 'PowerGridFailure'].includes(selectedType)
                    ? 'Alert sent to citizens.' : 'Responders auto-assigned.'
                }`);

            setSelectedType(null); setDescription(''); setSeverity('High');
            setLocation({ latitude: null, longitude: null, locationName: '' }); setRadius('');
            setDescAutoFilled(false);
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
                    value={sourceKey}
                    onChange={e => {
                        const selected = ADMIN_SOURCES.find(s => s.value + '|' + s.label === e.target.value);
                        if (selected) {
                            setSource(selected.value);
                            setSourceLabel(selected.label);
                            setSourceKey(e.target.value);
                        }
                    }}
                    style={{
                        width: '100%', padding: '10px 12px',
                        background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)',
                        borderRadius: '10px', color: 'var(--text-primary)',
                        fontSize: '13px', outline: 'none', cursor: 'pointer',
                    }}
                >
                    {ADMIN_SOURCES.map(s => (
                        <option key={s.label} value={s.value + '|' + s.label}>
                            {s.label}
                        </option>
                    ))}
                </select>
                <div style={{ marginTop: '4px' }}>
                  <Link to="/admin/sources" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>Need help picking a source? →</Link>
                </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Official Description <span style={{ color: '#e53e3e' }}>*</span>
                    </label>
                    {selectedType && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {descAutoFilled && (
                                <span style={{ fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ✨ Auto-filled
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    const gen = generateDescription(selectedType, source, location.locationName);
                                    setDescription(gen);
                                    setDescAutoFilled(true);
                                    setDescError('');
                                }}
                                style={{
                                    fontSize: '11px', padding: '3px 10px',
                                    background: 'var(--accent-subtle)', border: '1px solid var(--accent)',
                                    borderRadius: '6px', color: 'var(--accent)', cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                🔄 Regenerate
                            </button>
                        </div>
                    )}
                </div>
                <textarea
                    value={description}
                    onChange={e => { setDescription(e.target.value); setDescAutoFilled(false); setDescError(''); }}
                    placeholder={selectedType ? 'Description will be auto-filled once you select a type, source and location…' : 'Select a disaster type above to auto-fill a description'}
                    rows={5}
                    style={{
                        width: '100%', padding: '11px 14px',
                        background: descAutoFilled ? 'var(--accent-subtle)' : 'var(--bg-surface-2)',
                        border: `1.5px solid ${descError ? '#e53e3e' : descAutoFilled ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '10px', color: 'var(--text-primary)',
                        fontSize: '13px', resize: 'vertical', outline: 'none',
                        lineHeight: 1.6, boxSizing: 'border-box',
                        fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = descError ? '#e53e3e' : 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = descError ? '#e53e3e' : descAutoFilled ? 'var(--accent)' : 'var(--border)'}
                />
                {descError && <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px' }}>⚠ {descError}</p>}
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                    ✏️ You can edit this text freely — it's just a starting template.
                </p>
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