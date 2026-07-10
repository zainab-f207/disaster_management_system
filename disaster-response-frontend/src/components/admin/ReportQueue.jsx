import { useState, useEffect } from 'react';
import { reportApi, disasterApi } from '../../services/api';
import toast from 'react-hot-toast';
import { SeverityBadge, DisasterIcon } from '../ui';

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export default function ReportQueue() {
  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeReport, setActiveReport] = useState(null); // report currently being reviewed
  const [action, setAction]             = useState('');   // 'new' | 'merge' | 'reject'
  const [disasters, setDisasters]       = useState([]);
  const [severity, setSeverity]         = useState('High');
  const [mergeId, setMergeId]           = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    fetchReports();
    fetchDisasters();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getAll('Pending');
      setReports(res.data || []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchDisasters = async () => {
    try {
      const res = await disasterApi.getAll();
      setDisasters((res.data || []).filter(d =>
        !['Resolved', 'FalseAlarm'].includes(d.status)
      ));
    } catch {}
  };

  const handleCreateDisaster = async () => {
    setSubmitting(true);
    try {
      await reportApi.createDisaster(activeReport.id, {
        severity,
        affectedAreaRadiusKm: 10,
      });
      toast.success('Disaster created! Now verify it to auto-assign a responder.');
      setActiveReport(null);
      setAction('');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create disaster');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeId) { toast.error('Select a disaster to merge into'); return; }
    setSubmitting(true);
    try {
      await reportApi.mergeExisting(activeReport.id, parseInt(mergeId));
      toast.success('Report merged into existing disaster.');
      setActiveReport(null);
      setAction('');
      setMergeId('');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to merge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await reportApi.reject(activeReport.id, rejectReason || 'Rejected by admin');
      toast.success('Report rejected.');
      setActiveReport(null);
      setAction('');
      setRejectReason('');
      fetchReports();
    } catch (err) {
      toast.error('Failed to reject report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && reports.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '50px 20px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
        <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
          No Pending Reports
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
          All citizen reports have been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Pending Reports
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''} waiting for review
          </p>
        </div>
        <button
          onClick={fetchReports}
          style={{
            padding: '7px 14px', fontSize: '12px', fontWeight: 600,
            background: 'var(--accent-subtle)', color: 'var(--accent)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px', cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {reports.map((report, i) => (
            <div
              key={report.id}
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${activeReport?.id === report.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '16px',
                animation: `fadeInUp 0.3s ease ${i * 40}ms both`,
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DisasterIcon type={report.type} size={22} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {report.type} — Report #{report.id}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      By {report.reportedByName} •{' '}
                      {new Date(report.createdAt).toLocaleString('en-PK', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                  background: 'rgba(214,158,46,0.1)', color: '#d69e2e',
                  borderRadius: '10px',
                }}>
                  PENDING
                </span>
              </div>

              <p style={{
                fontSize: '13px', color: 'var(--text-secondary)',
                lineHeight: 1.5, marginBottom: '12px',
              }}>
                {report.description}
              </p>

              {report.imageUrl && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    fontSize: '11px', color: 'var(--text-muted)',
                    marginBottom: '6px', fontWeight: 600,
                  }}>
                    📷 Photo Evidence:
                  </div>
                  <img
                    src={report.imageUrl}
                    alt="Report evidence"
                    style={{
                      width: '100%', maxHeight: '200px',
                      objectFit: 'cover', borderRadius: '10px',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(report.imageUrl, '_blank')}
                    title="Click to open full size"
                  />
                </div>
              )}

              <div style={{
                fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px',
              }}>
                📍 {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
                {report.locationName && ` — ${report.locationName}`}
              </div>

              {activeReport?.id !== report.id ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <ActionBtn color="#38a169" onClick={() => { setActiveReport(report); setAction('new'); }}>
                    ✅ New Disaster
                  </ActionBtn>
                  <ActionBtn color="#4299e1" onClick={() => { setActiveReport(report); setAction('merge'); }}>
                    🔗 Merge Existing
                  </ActionBtn>
                  <ActionBtn color="#e53e3e" onClick={() => { setActiveReport(report); setAction('reject'); }}>
                    ❌ Reject
                  </ActionBtn>
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '14px',
                  animation: 'fadeInDown 0.2s ease',
                }}>
                  {action === 'new' && (
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                        Create a new disaster from this report:
                      </p>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Severity Level
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {SEVERITY_OPTIONS.map(s => (
                          <button
                            key={s}
                            onClick={() => setSeverity(s)}
                            type="button"
                            style={{
                              padding: '6px 14px', borderRadius: '20px',
                              border: `1.5px solid ${severity === s ? severityColor(s) : 'var(--border)'}`,
                              background: severity === s ? `${severityColor(s)}15` : 'transparent',
                              color: severity === s ? severityColor(s) : 'var(--text-muted)',
                              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <ConfirmBtn loading={submitting} color="#38a169" onClick={handleCreateDisaster}>
                          Create Disaster
                        </ConfirmBtn>
                        <CancelBtn onClick={() => { setActiveReport(null); setAction(''); }} />
                      </div>
                    </div>
                  )}

                  {/* Action: Merge into existing */}
                  {action === 'merge' && (
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                        Merge into an existing active disaster:
                      </p>
                      <select
                        value={mergeId}
                        onChange={e => setMergeId(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px', marginBottom: '14px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px', color: 'var(--text-primary)',
                          fontSize: '13px', outline: 'none',
                        }}
                      >
                        <option value="">-- Select a disaster --</option>
                        {disasters.map(d => (
                          <option key={d.id} value={d.id}>
                            #{d.id} — {d.type} ({d.severity}) — {d.status}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <ConfirmBtn loading={submitting} color="#4299e1" onClick={handleMerge}>
                          Merge Report
                        </ConfirmBtn>
                        <CancelBtn onClick={() => { setActiveReport(null); setAction(''); setMergeId(''); }} />
                      </div>
                    </div>
                  )}

                  {/* Action: Reject */}
                  {action === 'reject' && (
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
                        Reject this report (fake/duplicate):
                      </p>
                      <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px', marginBottom: '14px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px', color: 'var(--text-primary)',
                          fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <ConfirmBtn loading={submitting} color="#e53e3e" onClick={handleReject}>
                          Confirm Reject
                        </ConfirmBtn>
                        <CancelBtn onClick={() => { setActiveReport(null); setAction(''); setRejectReason(''); }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, color, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: '6px 14px', fontSize: '12px', fontWeight: 600,
        background: `${color}12`, color, border: `1px solid ${color}40`,
        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}25`}
      onMouseLeave={e => e.currentTarget.style.background = `${color}12`}
    >
      {children}
    </button>
  );
}

function ConfirmBtn({ children, color, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      type="button"
      style={{
        padding: '8px 18px', fontSize: '13px', fontWeight: 700,
        background: color, color: '#fff', border: 'none',
        borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? '⏳ ...' : children}
    </button>
  );
}

function CancelBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: '8px 18px', fontSize: '13px', fontWeight: 600,
        background: 'transparent', color: 'var(--text-muted)',
        border: '1px solid var(--border)',
        borderRadius: '8px', cursor: 'pointer',
      }}
    >
      Cancel
    </button>
  );
}

function severityColor(s) {
  return { Critical: '#e53e3e', High: '#dd6b20', Medium: '#d69e2e', Low: '#38a169' }[s] || '#38a169';
}