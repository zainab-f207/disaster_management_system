import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { UserCheck, Search, RefreshCw, Power, Eye, MapPin } from 'lucide-react';

export default function AdminResponders() {
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchResponders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/responders');
      setResponders(res.data || []);
    } catch {
      // fallback: try generic users endpoint
      try {
        const res = await api.get('/users?role=Responder');
        setResponders(res.data || []);
      } catch { toast.error('Failed to load responders'); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchResponders(); }, [fetchResponders]);

  const toggleActive = async (r) => {
    try {
      await api.patch(`/users/${r.id}`, { isActive: !r.isActive });
      toast.success(`Responder ${r.isActive ? 'deactivated' : 'activated'}`);
      fetchResponders();
    } catch { toast.error('Failed to update responder status'); }
  };

  const filtered = responders.filter(r => {
    const matchSearch = (r.fullName || r.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'active' ? r.isActive : !r.isActive);
    return matchSearch && matchFilter;
  });

  const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' };
  const input = { padding: '9px 12px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#1a365d,#e53e3e)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(229,62,62,0.3)' }}>
            <UserCheck size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Responder Management</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{responders.length} responders in system</p>
          </div>
        </div>
        <button onClick={fetchResponders} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', flex: 1 }} />
        </div>
        {['all', 'active', 'inactive'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`, background: filter === f ? 'var(--accent-subtle)' : 'transparent', color: filter === f ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: '80px', borderRadius: '16px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filtered.map(r => (
            <div key={r.id} style={{ ...card, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', opacity: r.isActive !== false ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#145c33,#27ae60)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
                  {(r.fullName || r.name || 'R')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                    {r.fullName || r.name || 'Unknown'}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>✉ {r.email}</span>
                    {r.organizationName && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}><MapPin size={10} style={{ display: 'inline' }} /> {r.organizationName}</span>}
                    <span style={{ fontSize: '11px', fontWeight: 600, color: r.isActive !== false ? '#38a169' : '#e53e3e' }}>
                      {r.isActive !== false ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => toggleActive(r)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: r.isActive !== false ? 'rgba(229,62,62,0.1)' : 'rgba(39,174,96,0.1)', border: `1px solid ${r.isActive !== false ? '#e53e3e' : '#27ae60'}`, color: r.isActive !== false ? '#e53e3e' : '#27ae60', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <Power size={12} /> {r.isActive !== false ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <UserCheck size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
              <div>No responders found.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
