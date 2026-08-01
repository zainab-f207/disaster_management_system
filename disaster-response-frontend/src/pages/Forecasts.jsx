import { useState, useEffect } from 'react';
import { advisoryApi } from '../services/api';
import { SeverityBadge, DisasterIcon } from '../components/ui';
import { Calendar, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Forecasts() {
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const auth = JSON.parse(localStorage.getItem('auth-data') || '{}');
    if (!auth?.state?.token) {
        toast.error("Please login to view forecasts");
        setLoading(false);
        return;
    }

    advisoryApi.getAll()
      .then(res => setAdvisories(res.data || []))
      .catch(err => {
        console.error("Failed to load forecasts:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="responsive-page" style={{
      maxWidth: '1100px', margin: '0 auto',
      padding: '88px 24px 60px', minHeight: '100vh',
    }}>
      <div style={{ marginBottom: '32px', animation: 'fadeInUp 0.4s ease' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '28px',
          fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px',
        }}>
          🌦️ Preparedness Forecasts
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
          Stay ahead of potential risks. Early warnings and AI-driven forecasts for your safety.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : advisories.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌤️</div>
          <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            No Active Forecasts
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
            There are currently no early warnings or preparedness advisories in effect.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {advisories.map((advisory, i) => {
            const severityBorder = {
              Critical: '#e53e3e', High: '#dd6b20',
              Medium: '#d69e2e', Low: '#38a169',
            }[advisory.severity] || '#38a169';

            return (
              <div key={advisory.id} style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${severityBorder}`,
                borderRadius: '12px', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '12px',
                animation: `fadeInUp 0.3s ease ${i * 50}ms both`,
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      background: 'var(--bg-surface-2)', padding: '10px',
                      borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <DisasterIcon type={advisory.type} size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {advisory.type} Risk Expected
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {advisory.city}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {new Date(advisory.forecastFor).toLocaleDateString('en-PK', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <SeverityBadge severity={advisory.severity} />
                </div>
                
                <div style={{ 
                  background: 'var(--bg-surface-2)', padding: '12px 16px', 
                  borderRadius: '8px', borderLeft: '3px solid var(--text-muted)',
                  fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5,
                  display: 'flex', gap: '12px', alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={18} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    {advisory.message}
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
