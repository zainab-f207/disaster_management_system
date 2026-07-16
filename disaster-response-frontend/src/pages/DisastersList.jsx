import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { disasterApi } from '../services/api';
import { SeverityBadge, StatusBadge, DisasterIcon, SourceBadge } from '../components/ui';
import { Search, Filter, Activity, BarChart2 } from 'lucide-react';
import DisasterHistory from './DisasterHistory';

const TYPE_OPTIONS = [
  'All','Flood','Earthquake','Fire','Storm','Heatwave','Landslide',
  'RoadAccident','BuildingCollapse','IndustrialAccident','UrbanFire',
  'GasExplosion','TrainAccident','Stampede','WaterContamination','Other',
];

export default function DisastersList() {
  const [disasters, setDisasters]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sevFilter, setSevFilter]   = useState('All');
  const [activeTab, setActiveTab]   = useState('active');

  useEffect(() => {
    disasterApi.getAll()
      .then(res => setDisasters(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = disasters.filter(d => {
    const matchSearch = !search ||
      d.description?.toLowerCase().includes(search.toLowerCase()) ||
      d.type?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || d.type === typeFilter;
    const matchSev  = sevFilter === 'All' || d.severity === sevFilter;
    return matchSearch && matchType && matchSev;
  });

  return (
    <div style={{
      maxWidth: activeTab === 'history' ? '1200px' : '1100px', margin: '0 auto',
      padding: '88px 24px 60px', minHeight: '100vh', transition: 'max-width 0.3s ease'
    }}>
      <div style={{ marginBottom: '24px', animation: 'fadeInUp 0.4s ease', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '28px',
            fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px',
          }}>
            🌍 Disasters Hub
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Track active emergencies and analyze historical disaster trends across Pakistan.
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-surface-2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === 'active' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'active' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Activity size={16} color={activeTab === 'active' ? '#e53e3e' : 'currentColor'} /> Active List
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === 'history' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <BarChart2 size={16} color={activeTab === 'history' ? '#805ad5' : 'currentColor'} /> Historical Analytics
          </button>
        </div>
      </div>

      {activeTab === 'active' ? (
        <>
          <div style={{
        display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap',
        padding: '16px', background: 'var(--card-bg)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ position: 'relative', flex: 2, minWidth: '200px' }}>
          <Search size={14} style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            placeholder="Search disasters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text-primary)',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            flex: 1, minWidth: '140px',
            padding: '9px 12px', fontSize: '13px',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer',
          }}
        >
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
        </select>

        <select
          value={sevFilter}
          onChange={e => setSevFilter(e.target.value)}
          style={{
            flex: 1, minWidth: '130px',
            padding: '9px 12px', fontSize: '13px',
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer',
          }}
        >
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => (
            <option key={s} value={s}>{s === 'All' ? 'All Severities' : s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            No results found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filtered.map((d, i) => {
            const severityBorder = {
              Critical: '#e53e3e', High: '#dd6b20',
              Medium: '#d69e2e', Low: '#38a169',
            }[d.severity] || '#38a169';

            return (
              <Link
                key={d.id}
                to={`/disasters/${d.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${severityBorder}`,
                  borderRadius: '12px', padding: '16px 18px',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: '14px',
                  animation: `fadeInUp 0.3s ease ${i * 25}ms both`,
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-surface-2)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--card-bg)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: 0 }}>
                    <DisasterIcon type={d.type} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {d.type}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{d.id}</span>
                        <SourceBadge source={d.source} />
                        {d.sourceReference && (
                          <span style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-surface-2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 500,
                          }}>
                            {d.sourceReference}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '13px', color: 'var(--text-secondary)',
                        margin: '0 0 6px', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {d.description}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        🕒 {new Date(d.reportedAt).toLocaleString('en-PK', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                    <SeverityBadge severity={d.severity} />
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
        </>
      ) : (
        <div style={{ animation: 'fadeInUp 0.3s ease' }}>
          <DisasterHistory />
        </div>
      )}
    </div>
  );
}