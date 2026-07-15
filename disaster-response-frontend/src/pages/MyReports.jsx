import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import api from '../services/api';
import { FileText, RefreshCw, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

const STATUS_CONFIG = {
  Pending:  { color: '#d69e2e', emoji: '⏳', label: 'Pending Review' },
  Verified: { color: '#38a169', emoji: '✅', label: 'Verified' },
  Rejected: { color: '#e53e3e', emoji: '❌', label: 'Rejected' },
  Resolved: { color: '#3182ce', emoji: '🎉', label: 'Resolved' },
};

export default function MyReports() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/my');
      setReports(res.data?.items || res.data || []);
    } catch {
      try {
        const res = await api.get(`/reports?userId=${user?.id}`);
        setReports(res.data?.items || res.data || []);
      } catch { setReports([]); }
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const card = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' };

  const typeEmojis = { Flood: '🌊', Earthquake: '🌍', Storm: '⛈️', Heatwave: '🌡️', UrbanFire: '🔥', Other: '⚠️', RoadAccident: '🚗', BuildingCollapse: '🏚️' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '88px 24px 60px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg,#2d3748,#4a5568)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>My Reports</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Track the status of your submitted disaster reports</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchReports} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to="/report" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg,#145c33,#27ae60)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
            + New Report
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'Pending', 'Verified', 'Rejected', 'Resolved'].map(f => {
          const cfg = STATUS_CONFIG[f];
          const count = f === 'all' ? reports.length : reports.filter(r => r.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '10px', border: `1.5px solid ${filter === f ? (cfg?.color || 'var(--accent)') : 'var(--border)'}`, background: filter === f ? `${cfg?.color || 'var(--accent)'}18` : 'transparent', color: filter === f ? (cfg?.color || 'var(--accent)') : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {cfg?.emoji || '📋'} {f === 'all' ? 'All' : cfg?.label} <span style={{ fontSize: '11px', background: 'var(--bg-surface-2)', padding: '1px 6px', borderRadius: '10px' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '100px', borderRadius: '16px', background: 'var(--bg-surface-2)', animation: 'skeleton-pulse 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>No {filter === 'all' ? '' : filter} reports</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {filter === 'all' ? "You haven't submitted any reports yet." : `No ${filter.toLowerCase()} reports found.`}
          </p>
          <Link to="/report" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '10px 20px', background: 'linear-gradient(135deg,#145c33,#27ae60)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
            📩 Submit a Report
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {filtered.map((r, i) => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.Pending;
            const date = r.reportedAt ? new Date(r.reportedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
            return (
              <div key={r.id ?? i} style={{ ...card, padding: '18px 22px', borderLeft: `5px solid ${cfg.color}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '20px' }}>{typeEmojis[r.type] || '⚠️'}</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{r.type || 'Disaster Report'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, background: `${cfg.color}18`, color: cfg.color, padding: '2px 8px', borderRadius: '6px' }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      📍 {r.locationName || 'Location not specified'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {date}
                    </div>
                  </div>
                  {r.disasterId && (
                    <Link to={`/disasters/${r.disasterId}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'var(--accent-subtle)', border: '1px solid var(--accent)', color: 'var(--accent)', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
                      <Eye size={12} /> View Disaster
                    </Link>
                  )}
                </div>

                {/* Expanded detail */}
                {selected?.id === r.id && (
                  <div style={{ marginTop: '14px', padding: '14px', background: 'var(--bg-surface-2)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong>Description:</strong><br />
                    {r.description || 'No description provided.'}
                    {r.adminNote && (
                      <div style={{ marginTop: '10px', padding: '10px', background: `${cfg.color}10`, borderRadius: '8px', borderLeft: `3px solid ${cfg.color}` }}>
                        <strong style={{ color: cfg.color }}>Admin Note:</strong> {r.adminNote}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
