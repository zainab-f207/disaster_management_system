import { useState, useEffect } from 'react';
import { Clock, MapPin, Building } from 'lucide-react';

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.Sqrt(1 - a));
}

const AVG_SPEED = {
    Rescue1122: 60,
    FireBrigade: 55,
    Police: 70,
    EdhiFoundation: 50,
    ChhipaWelfare: 50,
    default: 45,
};

export default function ResponseTimeEstimate({ disasterId, disasterLat, disasterLon }) {
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [estimate, setEstimate] = useState(null);

    useEffect(() => {
        if (disasterId) fetchAssignment();
    }, [disasterId]);

    const fetchAssignment = async () => {
        try {
            const { default: api } = await import('../../services/api');
            const res = await api.get(`/assignments/disaster/${disasterId}`);
            const active = (res.data || []).find(a =>
                ['Assigned', 'EnRoute'].includes(a.status)
            );
            if (active) {
                setAssignment(active);
                const dist = calculateDistance(active, disasterLat, disasterLon);
                const speed = AVG_SPEED[active.organizationName?.includes('Rescue') ? 'Rescue1122'
                    : active.organizationName?.includes('Police') ? 'Police'
                        : active.organizationName?.includes('Edhi') ? 'EdhiFoundation'
                            : 'default'] || 45;
                const etaMinutes = Math.round((dist / speed) * 60);
                setEstimate({ distanceKm: dist.toFixed(1), etaMinutes, speed });
            }
        } catch { }
        finally { setLoading(false); }
    };

    const calculateDistance = (assign, disLat, disLon) => {
        const orgLat = assign.organizationLat || disLat + (Math.random() * 0.2 - 0.1);
        const orgLon = assign.organizationLon || disLon + (Math.random() * 0.2 - 0.1);
        const dLat = (disLat - orgLat) * Math.PI / 180;
        const dLon = (disLon - orgLon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(orgLat * Math.PI / 180) * Math.cos(disLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    if (loading || !assignment || !estimate) return null;

    const etaColor = estimate.etaMinutes <= 5 ? '#38a169' :
        estimate.etaMinutes <= 15 ? '#d69e2e' : '#e53e3e';

    return (
        <div style={{
            padding: '14px 16px',
            background: `${etaColor}08`,
            border: `1px solid ${etaColor}30`,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center',
            gap: '14px', flexWrap: 'wrap',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color={etaColor} />
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: etaColor, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                        ~{estimate.etaMinutes} min
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        Estimated Arrival
                    </div>
                </div>
            </div>

            <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="var(--text-muted)" />
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {estimate.distanceKm} km
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Distance</div>
                </div>
            </div>

            <div style={{ width: '1px', height: '36px', background: 'var(--border)' }} />


            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="var(--text-muted)" />
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {assignment.organizationName}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {assignment.status === 'EnRoute' ? '🚗 En Route' : '📋 Assigned'}
                    </div>
                </div>
            </div>

            <div style={{
                marginLeft: 'auto', fontSize: '11px',
                color: 'var(--text-muted)', fontStyle: 'italic',
            }}>
                Estimate only. Actual time may vary.
            </div>
        </div>
    );
}