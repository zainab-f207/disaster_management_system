import { useState, useEffect } from 'react';
import { disasterApi, orgApi } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { DisasterIcon, SeverityBadge, StatusBadge } from '../ui';

// Reverse geocode to get area name
async function getAreaName(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.neighbourhood || a.suburb || a.road,
      a.city || a.town || a.village,
      a.state,
    ].filter(Boolean);
    return parts.slice(0, 2).join(', ');
  } catch {
    return `${lat?.toFixed(3)}, ${lon?.toFixed(3)}`;
  }
}

export default function AssignmentOverride() {
  const [disasters,      setDisasters]      = useState([]);
  const [organizations,  setOrganizations]  = useState([]);
  const [assignments,    setAssignments]    = useState({});
  const [areaNames,      setAreaNames]      = useState({});
  const [loading,        setLoading]        = useState(true);
  const [overriding,     setOverriding]     = useState(null);
  const [newOrgId,       setNewOrgId]       = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [disRes, orgRes] = await Promise.all([
        disasterApi.getAll(),
        orgApi.getAll(),
      ]);

      const active = (disRes.data || []).filter(d =>
        ['Verified', 'ResponseInProgress'].includes(d.status)
      );
      setDisasters(active);
      setOrganizations(orgRes.data || []);

      // Fetch assignments + area names in parallel
      const assignMap = {};
      const areaMap   = {};

      await Promise.all(active.map(async d => {
        try {
          const res = await api.get(`/assignments/disaster/${d.id}`);
          assignMap[d.id] = res.data || [];
        } catch { assignMap[d.id] = []; }

        // Get readable area name for each disaster
        if (d.latitude && d.longitude) {
          areaMap[d.id] = await getAreaName(d.latitude, d.longitude);
        }
      }));

      setAssignments(assignMap);
      setAreaNames(areaMap);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (assignmentId) => {
    const orgId = newOrgId[assignmentId];
    if (!orgId) { toast.error('Select an organization first'); return; }
    setOverriding(assignmentId);
    try {
      await api.put(`/assignments/${assignmentId}/override`, {
        newOrganizationId: parseInt(orgId),
      });
      toast.success('Assignment overridden ✅');
      setNewOrgId(prev => ({ ...prev, [assignmentId]: '' }));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Override failed');
    } finally {
      setOverriding(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '12px' }} />
      ))}
    </div>
  );

  if (disasters.length === 0) return (
    <div style={{
      textAlign: 'center', padding: '48px',
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚒</div>
      <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '16px' }}>
        No Active Assignments
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
        Verify a disaster first to trigger auto-assignment.
      </p>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Responder Assignments
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          View who is assigned where — override if needed
        </p>
      </div>

      <div style={{ display: 'grid', gap: '14px' }}>
        {disasters.map(d => {
          const area        = areaNames[d.id] || 'Fetching area...';
          const disAssigns  = assignments[d.id] || [];
          const sevColor    = { Critical:'#e53e3e', High:'#dd6b20', Medium:'#d69e2e', Low:'#38a169' }[d.severity] || '#38a169';

          return (
            <div key={d.id} style={{
              background: 'var(--card-bg)',
              border: `1px solid var(--border)`,
              borderTop: `3px solid ${sevColor}`,
              borderRadius: '14px', overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {/* Disaster header — full details */}
              <div style={{
                padding: '14px 18px',
                background: 'var(--bg-surface-2)',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <DisasterIcon type={d.type} size={24} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        #{d.id} — {d.type}
                      </div>
                      {/* Area name — key fix */}
                      <div style={{
                        fontSize: '12px', color: 'var(--accent)',
                        fontWeight: 600, marginTop: '2px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        📍 {area}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <SeverityBadge severity={d.severity} />
                    <StatusBadge status={d.status} />
                  </div>
                </div>

                {/* Description snippet */}
                <p style={{
                  fontSize: '12px', color: 'var(--text-secondary)',
                  marginTop: '8px', lineHeight: 1.5,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {d.description}
                </p>
              </div>

              {/* Assignments */}
              <div style={{ padding: '14px 18px' }}>
                {disAssigns.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 0' }}>
                    No assignments yet.
                  </p>
                ) : (
                  disAssigns.map(assign => {
                    const assignStatusColor = {
                      Assigned:'#a0aec0', EnRoute:'#4299e1',
                      OnSite:'#d69e2e', Completed:'#38a169',
                    }[assign.status] || '#a0aec0';

                    return (
                      <div key={assign.id} style={{
                        padding: '12px 14px', marginBottom: '8px',
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                      }}>
                        {/* Current assignment */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              🚒 {assign.organizationName}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                                background: `${assignStatusColor}15`, color: assignStatusColor,
                                borderRadius: '8px',
                              }}>
                                {assign.status}
                              </span>
                              <span style={{
                                fontSize: '10px', fontWeight: 600, padding: '2px 8px',
                                background: assign.method === 'Auto' ? 'rgba(39,174,96,0.1)' : 'rgba(66,153,225,0.1)',
                                color: assign.method === 'Auto' ? '#38a169' : '#4299e1',
                                borderRadius: '8px',
                              }}>
                                {assign.method === 'Auto' ? '🤖 Auto' : '👤 Manual'}
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                            {new Date(assign.assignedAt).toLocaleString('en-PK', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </div>
                        </div>

                        {/* Override controls */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <select
                            value={newOrgId[assign.id] || ''}
                            onChange={e => setNewOrgId(prev => ({ ...prev, [assign.id]: e.target.value }))}
                            style={{
                              flex: 1, minWidth: '160px',
                              padding: '7px 10px', fontSize: '12px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              color: 'var(--text-primary)', outline: 'none',
                            }}
                          >
                            <option value="">— Override org —</option>
                            {organizations.map(org => (
                              <option key={org.id} value={org.id}>
                                {org.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleOverride(assign.id)}
                            disabled={overriding === assign.id || !newOrgId[assign.id]}
                            style={{
                              padding: '7px 16px', fontSize: '12px', fontWeight: 700,
                              background: !newOrgId[assign.id] ? 'var(--border)' : '#4299e1',
                              color: '#fff', border: 'none', borderRadius: '8px',
                              cursor: (!newOrgId[assign.id] || overriding === assign.id) ? 'not-allowed' : 'pointer',
                              opacity: overriding === assign.id ? 0.7 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {overriding === assign.id ? '⏳...' : '🔄 Override'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}