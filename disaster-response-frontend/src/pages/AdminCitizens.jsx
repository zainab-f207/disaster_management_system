import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Users, Search, RefreshCw, Ban, FileText, Star } from 'lucide-react';

export default function AdminCitizens() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchCitizens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?role=Citizen');
      setCitizens(res.data || []);
    } catch {
      try {
        const res = await api.get('/users/citizens');
        setCitizens(res.data || []);
      } catch { toast.error('Failed to load citizens'); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCitizens(); }, [fetchCitizens]);

  const viewReports = async (citizen) => {
    setSelected(citizen);
    setLoadingReports(true);
    try {
      const res = await api.get(`/reports?userId=${citizen.id}`);
      setReports(res.data?.items || res.data || []);
    } catch { setReports([]); }
    finally { setLoadingReports(false); }
  };

  const toggleSuspend = async (c) => {
    try {
      await api.patch(`/users/${c.id}`, { isActive: !c.isActive });
      toast.success(`Account ${c.isActive ? 'suspended' : 'reinstated'}`);
      fetchCitizens();
      if (selected?.id === c.id) setSelected(p => ({ ...p, isActive: !p.isActive }));
    } catch { toast.error('Failed to update account status'); }
  };

  const filtered = citizens.filter(c =>
    (c.fullName || c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#553c9a,#805ad5)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(128,90,213,0.3)' }}>
            <Users size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Citizen Management</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{citizens.length} registered citizens</p>
          </div>
        </div>
        <button onClick={fetchCitizens} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Citizens list */}
        <div>
          <div style={{ ...card, padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', flex: 1 }} />
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: '70px', borderRadius: '12px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '70vh', overflowY: 'auto' }}>
              {filtered.map(c => (
                <div key={c.id} onClick={() => viewReports(c)} style={{ ...card, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: c.isActive !== false ? 1 : 0.6, border: selected?.id === c.id ? '1px solid var(--accent)' : '1px solid var(--border)', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                  onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#553c9a,#805ad5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                      {(c.fullName || c.name || 'C')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.fullName || c.name || 'Unknown'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {c.trustScore !== undefined && (
                      <span style={{ fontSize: '11px', color: '#d69e2e', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                        <Star size={11} fill="#d69e2e" /> {c.trustScore}%
                      </span>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 600, color: c.isActive !== false ? '#38a169' : '#e53e3e' }}>
                      {c.isActive !== false ? '● Active' : '○ Suspended'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); toggleSuspend(c); }}
                      style={{ padding: '5px 10px', borderRadius: '7px', background: c.isActive !== false ? 'rgba(229,62,62,0.1)' : 'rgba(39,174,96,0.1)', border: `1px solid ${c.isActive !== false ? '#e53e3e' : '#27ae60'}`, color: c.isActive !== false ? '#e53e3e' : '#27ae60', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                      <Ban size={11} style={{ display: 'inline', marginRight: '3px' }} />
                      {c.isActive !== false ? 'Suspend' : 'Reinstate'}
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ ...card, padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No citizens found.</div>
              )}
            </div>
          )}
        </div>

        {/* Selected citizen reports */}
        {selected && (
          <div>
            <div style={{ ...card, padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{selected.fullName || selected.name}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selected.email}</div>
                  {selected.trustScore !== undefined && (
                    <div style={{ fontSize: '12px', color: '#d69e2e', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={12} fill="#d69e2e" /> Trust Score: {selected.trustScore}%
                    </div>
                  )}
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px' }}>×</button>
              </div>
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} /> Report History ({reports.length})
            </div>

            {loadingReports ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {[1,2].map(i => <div key={i} style={{ height: '60px', borderRadius: '12px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
              </div>
            ) : reports.length === 0 ? (
              <div style={{ ...card, padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No reports submitted by this citizen.</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
                {reports.map((r, i) => {
                  const sc = { Pending: '#d69e2e', Verified: '#38a169', Rejected: '#e53e3e', Resolved: '#3182ce' }[r.status] || '#718096';
                  return (
                    <div key={i} style={{ ...card, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{r.type || 'Report'}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: sc, background: `${sc}18`, padding: '2px 7px', borderRadius: '5px' }}>{r.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.locationName || 'Location not specified'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{r.reportedAt ? new Date(r.reportedAt).toLocaleDateString('en-PK') : ''}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
