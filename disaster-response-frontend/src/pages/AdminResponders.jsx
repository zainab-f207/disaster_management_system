import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { UserCheck, Search, RefreshCw, Power, Eye, MapPin } from 'lucide-react';
import { orgApi } from '../services/api';
import { Mail, Plus, Trash2 } from 'lucide-react';

export default function AdminResponders() {
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [organizations, setOrganizations] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', phoneNumber: '', organizationId: '' });
  const [inviting, setInviting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
  useEffect(() => {
    orgApi.getAll().then(res => setOrganizations(res.data || [])).catch(() => { });
  }, []);

  const handleInvite = async () => {
    const { fullName, email, phoneNumber, organizationId } = inviteForm;
    if (!fullName.trim() || !email.trim() || !organizationId) {
      toast.error('Full name, email, and organization are required.');
      return;
    }
    setInviting(true);
    try {
      await api.post('/ResponderInvites', { fullName, email, phoneNumber, responderOrganizationId: parseInt(organizationId) });
      toast.success('Invitation sent!');
      setShowInvite(false);
      setInviteForm({ fullName: '', email: '', phoneNumber: '', organizationId: '' });
      fetchResponders();
    } catch (err) {
      toast.error(err.response?.data?.[0] || err.response?.data?.Error || 'Failed to send invite');
    } finally { setInviting(false); }
  };

  const handleResend = async (id) => {
    try {
      await api.post(`/ResponderInvites/${id}/resend`);
      toast.success('Invitation resent!');
    } catch { toast.error('Failed to resend invite'); }
  };

  const toggleActive = async (r) => {
    try {
      await api.patch(`/users/${r.id}`, { isActive: !r.isActive });
      toast.success(`Responder ${r.isActive ? 'deactivated' : 'activated'}`);
      fetchResponders();
    } catch { toast.error('Failed to update responder status'); }
  };

  const deleteResponder = async (r) => {
    try {
      await api.delete(`/users/${r.id}`);
      toast.success(`${r.fullName || r.name || 'Responder'}'s account deleted.`);
      setResponders(prev => prev.filter(u => u.id !== r.id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account.');
    } finally { setConfirmDelete(null); }
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
        <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg,#145c33,#27ae60)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
          <Plus size={14} /> Invite Responder
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
          {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '80px', borderRadius: '16px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
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
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {r.isPending ? (
                  <>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#d69e2e', background: 'rgba(214,158,46,0.1)', padding: '4px 10px', borderRadius: '8px' }}>⏳ Pending Invite</span>
                    <button onClick={() => handleResend(r.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(66,153,225,0.1)', border: '1px solid #4299e1', color: '#4299e1', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                      <Mail size={12} /> Resend Invite
                    </button>
                  </>
                ) : (
                  <button onClick={() => toggleActive(r)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '9px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, border: 'none', transition: 'all 0.15s', background: r.isActive !== false ? 'linear-gradient(135deg,#c0392b,#e53e3e)' : 'linear-gradient(135deg,#145c33,#27ae60)', color: '#fff', boxShadow: r.isActive !== false ? '0 3px 10px rgba(229,62,62,0.35)' : '0 3px 10px rgba(39,174,96,0.35)' }}>
                    <Power size={12} /> {r.isActive !== false ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                <button onClick={() => setConfirmDelete(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(229,62,62,0.08)', border: '1px solid #e53e3e', color: '#e53e3e', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <Trash2 size={12} /> Delete
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
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '28px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' }}>Invite a Responder</h2>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <input placeholder="Full name" value={inviteForm.fullName} onChange={e => setInviteForm(p => ({ ...p, fullName: e.target.value }))} style={{ padding: '10px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <input placeholder="Email address" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <input placeholder="Phone (03XXXXXXXXX)" value={inviteForm.phoneNumber} onChange={e => setInviteForm(p => ({ ...p, phoneNumber: e.target.value }))} style={{ padding: '10px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <select value={inviteForm.organizationId} onChange={e => setInviteForm(p => ({ ...p, organizationId: e.target.value }))} style={{ padding: '10px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px' }}>
                <option value="">-- Select organization --</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowInvite(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleInvite} disabled={inviting} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#145c33,#27ae60)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                {inviting ? 'Sending...' : '✉️ Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1.5px solid #e53e3e', borderRadius: '18px', width: '100%', maxWidth: '400px', padding: '30px 28px', boxShadow: '0 20px 60px rgba(229,62,62,0.2)', animation: 'scaleIn 0.2s ease' }}>
            <div style={{ fontSize: '44px', textAlign: 'center', marginBottom: '14px' }}>🗑️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: '#e53e3e', textAlign: 'center', margin: '0 0 10px' }}>Delete Responder Account?</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.6 }}>
              Permanently delete <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.fullName || confirmDelete.name}</strong>'s account? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>Cancel</button>
              <button onClick={() => deleteResponder(confirmDelete)} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#c0392b,#e53e3e)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 14px rgba(229,62,62,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Trash2 size={13} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
