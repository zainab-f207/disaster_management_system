import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Building2, Plus, Edit3, Power, MapPin, Search, RefreshCw, X, Save } from 'lucide-react';

const EMPTY_ORG = {
  name: '', type: 'Rescue', coverageArea: '', contactNumber: '', email: '', isActive: true,
};

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [form, setForm] = useState(EMPTY_ORG);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations');
      setOrgs(res.data || []);
    } catch { toast.error('Failed to load organizations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => { setEditOrg(null); setForm(EMPTY_ORG); setShowModal(true); };
  const openEdit = (org) => {
    setEditOrg(org);
    setForm({ name: org.name, type: org.type, coverageArea: org.coverageArea || '', contactNumber: org.contactNumber || '', email: org.email || '', isActive: org.isActive ?? true });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Organization name required'); return; }
    setSaving(true);
    try {
      if (editOrg) {
        await api.put(`/organizations/${editOrg.id}`, form);
        toast.success('Organization updated');
      } else {
        await api.post('/organizations', form);
        toast.success('Organization added');
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const toggleActive = async (org) => {
    try {
      await api.patch(`/organizations/${org.id}`, { isActive: !org.isActive });
      toast.success(`Organization ${org.isActive ? 'disabled' : 'enabled'}`);
      fetch();
    } catch { toast.error('Failed to update status'); }
  };

  const filtered = orgs.filter(o => o.name?.toLowerCase().includes(search.toLowerCase()));

  const typeColor = { Rescue: '#e53e3e', Medical: '#3182ce', Police: '#2d3748', Fire: '#dd6b20', NGO: '#805ad5', Military: '#2f855a', Other: '#718096' };

  const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' };
  const input = { width: '100%', padding: '10px 12px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#1a365d,#3182ce)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(49,130,206,0.3)' }}>
            <Building2 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Organization Management</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{orgs.length} organizations registered</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg,#145c33,#27ae60)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 12px rgba(39,174,96,0.3)' }}>
            <Plus size={14} /> Add Organization
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ ...card, padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Search size={16} color="var(--text-muted)" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..." style={{ ...input, border: 'none', background: 'transparent', padding: '0', flex: 1 }} />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '90px', borderRadius: '16px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {filtered.map(org => {
            const tc = typeColor[org.type] || '#718096';
            return (
              <div key={org.id} style={{ ...card, padding: '18px 22px', borderLeft: `5px solid ${tc}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', opacity: org.isActive ? 1 : 0.6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{org.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: `${tc}18`, color: tc, padding: '2px 8px', borderRadius: '6px' }}>{org.type}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: org.isActive ? '#38a169' : '#e53e3e' }}>{org.isActive ? '● Active' : '○ Inactive'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {org.coverageArea && <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} /> {org.coverageArea}</span>}
                    {org.contactNumber && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📞 {org.contactNumber}</span>}
                    {org.email && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>✉ {org.email}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(org)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}>
                    <Edit3 size={12} /> Edit
                  </button>
                  <button onClick={() => toggleActive(org)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: org.isActive ? 'rgba(229,62,62,0.1)' : 'rgba(39,174,96,0.1)', border: `1px solid ${org.isActive ? '#e53e3e' : '#27ae60'}`, color: org.isActive ? '#e53e3e' : '#27ae60', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                    <Power size={12} /> {org.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ ...card, padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Building2 size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
              <div>No organizations found.</div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ ...card, width: '100%', maxWidth: '520px', padding: '28px', animation: 'fadeInUp 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {editOrg ? 'Edit Organization' : 'Add Organization'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gap: '14px' }}>
              {[
                { label: 'Organization Name *', key: 'name', placeholder: 'e.g. Rescue 1122 Lahore' },
                { label: 'Coverage Area', key: 'coverageArea', placeholder: 'e.g. Lahore District' },
                { label: 'Contact Number', key: 'contactNumber', placeholder: '1122' },
                { label: 'Email', key: 'email', placeholder: 'contact@org.pk' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={input} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={input}>
                  {['Rescue', 'Medical', 'Police', 'Fire', 'NGO', 'Military', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#145c33,#27ae60)', border: 'none', borderRadius: '10px', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
