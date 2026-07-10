import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { reportApi } from '../services/api';
import api from '../services/api';
import { useAuthStore } from '../store';
import LocationPicker from '../components/forms/LocationPicker';
import ImageUpload from '../components/forms/ImageUpload';
import { FormInput, SubmitButton } from '../components/forms/FormInput';
import IncidentVerification from '../components/dashboard/IncidentVerification';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const DISASTER_GROUPS = [
  {
    label: '🌿 Natural Emergency',
    color: '#38a169',
    hint: 'Physical disasters you are witnessing right now',
    types: [
      { value: 'Flood', emoji: '🌊', label: 'Flood', desc: 'Water flooding streets or homes' },
      { value: 'Earthquake', emoji: '🌍', label: 'Earthquake', desc: 'Ground shaking, building damage' },
      { value: 'Storm', emoji: '⛈️', label: 'Storm', desc: 'Severe wind, fallen trees, damage' },
      { value: 'Landslide', emoji: '⛰️', label: 'Landslide', desc: 'Mudslide or rock fall blocking road' },
      { value: 'Lightning', emoji: '⚡', label: 'Lightning', desc: 'Lightning strike causing injury or fire' },
    ],
  },
  {
    label: '🏭 Man-Made Emergency',
    color: '#dd6b20',
    hint: 'Accidents and incidents caused by human activities',
    types: [
      { value: 'RoadAccident', emoji: '🚗', label: 'Road Accident', desc: 'Vehicle crash with injuries' },
      { value: 'UrbanFire', emoji: '🔥', label: 'Urban Fire', desc: 'Building, shop, or vehicle fire' },
      { value: 'BuildingCollapse', emoji: '🏚️', label: 'Building Collapse', desc: 'Structure has collapsed or is collapsing' },
      { value: 'GasExplosion', emoji: '💥', label: 'Gas Explosion', desc: 'Gas cylinder or pipeline explosion' },
      { value: 'IndustrialAccident', emoji: '🏭', label: 'Industrial Accident', desc: 'Factory fire, chemical spill' },
      { value: 'TrainAccident', emoji: '🚂', label: 'Train Accident', desc: 'Train derailment or collision' },
      { value: 'Stampede', emoji: '👥', label: 'Stampede', desc: 'Crowd crush at gathering' },
      { value: 'WaterContamination', emoji: '💧', label: 'Water Contamination', desc: 'Contaminated water supply causing illness' },
    ],
  },
  {
    label: '⚡ Other Emergency',
    color: '#9f7aea',
    hint: 'Any other emergency not listed above',
    types: [
      { value: 'Other', emoji: '⚠️', label: 'Other Emergency', desc: 'Something else that needs immediate help' },
    ],
  },
];

export default function SubmitReport() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [location, setLocation] = useState({ latitude: null, longitude: null, locationName: '' });
  const [locationError, setLocationError] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [nearbyDisaster, setNearbyDisaster] = useState(null);
  const [duplicateChecked, setDuplicateChecked] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm();

  const checkForDuplicates = useCallback(async (type, lat, lon) => {
    if (!type || !lat || !lon) return;
    setCheckingDuplicate(true);
    try {
      const res = await api.get('/geocoding/nearby-disasters', {
        params: { type, latitude: lat, longitude: lon, radiusKm: 3 }
      });
      setNearbyDisaster(res.data?.disaster || null);
    } catch {
      setNearbyDisaster(null);
    } finally {
      setCheckingDuplicate(false);
      setDuplicateChecked(true);
    }
  }, []);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setNearbyDisaster(null);
    setDuplicateChecked(false);
    if (location.latitude) {
      checkForDuplicates(type, location.latitude, location.longitude);
    }
  };

  const handleLocationSelect = (loc) => {
    setLocation(loc);
    setLocationError('');
    setNearbyDisaster(null);
    setDuplicateChecked(false);
    if (selectedType && loc.latitude) {
      checkForDuplicates(selectedType, loc.latitude, loc.longitude);
    }
  };

  const onSubmit = async (data) => {
    if (!selectedType) { toast.error('Please select the type of emergency.'); return; }
    if (!location.latitude) { setLocationError('Please select a location.'); return; }
    setLocationError('');
    setLoading(true);

    try {
      const res = await reportApi.submit({
        type: selectedType,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.locationName || '',
        description: data.description,
        imageUrl: null,
        imageBase64: imageBase64 || null,
      });

      setSubmittedReport(res.data);
      setSubmitted(true);
      toast.success('Report submitted! Admin will review and dispatch help. 🚒');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Sign in to report
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          You need to be logged in to submit an emergency report.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/sos" style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #c41a1a, #e53e3e)',
            color: '#fff', borderRadius: '12px',
            textDecoration: 'none', fontSize: '14px', fontWeight: 800,
          }}>
            🚨 Use SOS Instead
          </Link>
          <Link to="/login" style={{
            padding: '12px 24px',
            background: 'var(--accent-subtle)', color: 'var(--accent)',
            border: '1px solid var(--border-strong)',
            borderRadius: '12px', textDecoration: 'none',
            fontSize: '14px', fontWeight: 700,
          }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '80px 24px 40px',
        animation: 'fadeInUp 0.4s ease',
      }}>
        <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px', animation: 'float 2s ease-in-out infinite' }}>
            ✅
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '26px',
            fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px',
          }}>
            Report Submitted!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
            Your emergency report is now being reviewed by our admin team.
            Once verified, the nearest <strong>{
              {
                RoadAccident: 'Rescue 1122', UrbanFire: 'Fire Brigade',
                GasExplosion: 'Rescue 1122 & Gas Company',
                Flood: 'PDMA & Rescue 1122',
                Earthquake: 'Rescue 1122 & NDMA'
              }[selectedType] || 'Rescue 1122'
            }</strong> will be dispatched.
          </p>

          <div style={{
            padding: '16px 18px', marginBottom: '20px',
            background: 'rgba(229,62,62,0.06)',
            border: '1px solid rgba(229,62,62,0.2)',
            borderRadius: '14px', textAlign: 'left',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#e53e3e', marginBottom: '10px' }}>
              ☎️ Also call directly for faster response:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
              {[
                { n: 'Rescue 1122', num: '1122', emoji: '🚒' },
                { n: 'Edhi Foundation', num: '115', emoji: '🚑' },
                { n: 'Police', num: '15', emoji: '👮' },
                { n: 'NDMA Helpline', num: '1135', emoji: '🛡️' },
              ].map(c => (
                <a key={c.num} href={`tel:${c.num}`} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px',
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px', textDecoration: 'none',
                  fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={{ fontSize: '18px' }}>{c.emoji}</span>
                  <div>
                    <div style={{ fontSize: '15px' }}>{c.num}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.n}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {submittedReport && (
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Help other nearby citizens confirm this incident:
              </p>
              <IncidentVerification report={submittedReport} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setSubmitted(false); setSelectedType(null);
                setLocation({}); setImageBase64(null);
                setNearbyDisaster(null); setDuplicateChecked(false);
              }}
              style={{
                flex: 1, minWidth: '140px', padding: '11px',
                background: 'var(--bg-surface-2)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: '12px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
            >
              Report Another
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                flex: 1, minWidth: '140px', padding: '11px',
                background: 'linear-gradient(135deg, #145c33, #27ae60)',
                color: '#fff', border: 'none', borderRadius: '12px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              }}
            >
              View Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '88px 24px 60px' }}>
      <div style={{ marginBottom: '24px', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '26px',
            fontWeight: 800, color: 'var(--text-primary)',
          }}>
            🚨 Report an Emergency
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Your report goes to the admin team who verifies and dispatches
          the nearest organization within minutes.
        </p>

        <div style={{
          marginTop: '12px', padding: '10px 14px',
          background: 'rgba(229,62,62,0.06)',
          border: '1px solid rgba(229,62,62,0.2)',
          borderRadius: '10px',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '13px', color: '#e53e3e', fontWeight: 600 }}>
            🚨 Life-threatening right now?
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="tel:1122" style={{
              padding: '6px 14px', background: '#e53e3e', color: '#fff',
              borderRadius: '8px', textDecoration: 'none',
              fontSize: '13px', fontWeight: 800,
            }}>
              Call 1122
            </a>
            <Link to="/sos" style={{
              padding: '6px 14px', background: 'rgba(229,62,62,0.1)', color: '#e53e3e',
              border: '1px solid rgba(229,62,62,0.3)',
              borderRadius: '8px', textDecoration: 'none',
              fontSize: '13px', fontWeight: 700,
            }}>
              Use SOS →
            </Link>
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '28px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* STEP 1: Emergency type */}
          <div style={{ marginBottom: '26px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-secondary)', marginBottom: '12px',
            }}>
              Step 1 — What type of emergency are you reporting?
              {!selectedType && <span style={{ color: '#e53e3e' }}> *</span>}
            </label>

            {DISASTER_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
                  color: group.color, marginBottom: '4px', textTransform: 'uppercase',
                }}>
                  {group.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {group.hint}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
                  gap: '8px',
                }}>
                  {group.types.map(type => {
                    const isSelected = selectedType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeSelect(type.value)}
                        style={{
                          padding: '10px 10px',
                          background: isSelected ? `${group.color}18` : 'var(--bg-surface-2)',
                          border: `2px solid ${isSelected ? group.color : 'var(--border)'}`,
                          borderRadius: '10px', cursor: 'pointer',
                          textAlign: 'left', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = group.color;
                            e.currentTarget.style.background = `${group.color}10`;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.background = 'var(--bg-surface-2)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '16px' }}>{type.emoji}</span>
                          <span style={{
                            fontSize: '12px', fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? group.color : 'var(--text-primary)',
                          }}>
                            {type.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                          {type.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!selectedType && (
              <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }}>
                ⚠ Please select the type of emergency
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 24px' }} />

          <div style={{ marginBottom: '4px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-secondary)', marginBottom: '12px',
            }}>
              Step 2 — Where is this happening?
            </label>
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              error={locationError}
            />
          </div>

          {checkingDuplicate && (
            <div style={{
              padding: '10px 14px', marginBottom: '14px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '10px', fontSize: '13px',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: '2px solid var(--accent)',
                borderTopColor: 'transparent',
                animation: 'spin-slow 0.8s linear infinite',
              }} />
              Checking for nearby active disasters...
            </div>
          )}

          {!checkingDuplicate && duplicateChecked && nearbyDisaster && (
            <div style={{
              padding: '14px 16px', marginBottom: '14px',
              background: 'rgba(214,158,46,0.08)',
              border: '1px solid rgba(214,158,46,0.3)',
              borderRadius: '12px',
              animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <AlertTriangle size={18} color="#d69e2e" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#d69e2e', marginBottom: '3px' }}>
                    Similar disaster already active nearby!
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Disaster #{nearbyDisaster.id} — {nearbyDisaster.type} is already being responded to near this location.
                    You can still submit your report to confirm the incident, or check the existing disaster.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  to={`/disasters/${nearbyDisaster.id}`}
                  style={{
                    padding: '7px 14px', fontSize: '12px', fontWeight: 700,
                    background: 'rgba(214,158,46,0.15)', color: '#d69e2e',
                    border: '1px solid rgba(214,158,46,0.4)',
                    borderRadius: '8px', textDecoration: 'none',
                  }}
                >
                  View Existing Disaster →
                </Link>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  or continue to submit confirmation report below
                </span>
              </div>
            </div>
          )}

          {!checkingDuplicate && duplicateChecked && !nearbyDisaster && selectedType && location.latitude && (
            <div style={{
              padding: '10px 14px', marginBottom: '14px',
              background: 'rgba(56,161,105,0.08)',
              border: '1px solid rgba(56,161,105,0.2)',
              borderRadius: '10px', fontSize: '12px',
              color: '#38a169', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px',
              animation: 'fadeIn 0.3s ease',
            }}>
              <CheckCircle size={14} />
              No active disasters found nearby. This appears to be a new incident.
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0 24px' }} />

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-secondary)', marginBottom: '7px',
            }}>
              Step 3 — Describe what you see
              <span style={{ color: '#e53e3e' }}> *</span>
            </label>
            <textarea
              placeholder="Describe clearly: number of people injured, severity, what is on fire, whether anyone is trapped, road name, nearest landmark..."
              rows={4}
              {...register('description', {
                required: 'Please describe the emergency',
                minLength: { value: 20, message: 'At least 20 characters' },
                maxLength: { value: 500, message: 'Maximum 500 characters' },
              })}
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--bg-surface-2)',
                border: `1.5px solid ${errors.description ? '#e53e3e' : 'var(--border)'}`,
                borderRadius: '10px', color: 'var(--text-primary)',
                fontSize: '14px', resize: 'vertical', outline: 'none',
                lineHeight: 1.6, boxSizing: 'border-box',
                fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = errors.description ? '#e53e3e' : 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = errors.description ? '#e53e3e' : 'var(--border)'}
            />
            {errors.description && (
              <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px' }}>
                ⚠ {errors.description.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-secondary)', marginBottom: '7px',
            }}>
              Step 4 — Photo Evidence
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (optional but very helpful)</span>
            </label>
            <ImageUpload onImageSelected={(file, base64) => setImageBase64(base64)} />
          </div>

          <div style={{
            padding: '12px 14px', marginBottom: '22px',
            background: 'rgba(229,62,62,0.06)',
            border: '1px solid rgba(229,62,62,0.2)',
            borderRadius: '10px', fontSize: '12px',
            color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            ⚠️ <strong>Life-threatening right now?</strong>{' '}
            Call <strong style={{ color: '#e53e3e' }}>1122</strong> (Rescue) or{' '}
            <strong style={{ color: '#e53e3e' }}>115</strong> (Edhi) directly.
            This report system is fastest when combined with a direct call.
          </div>

          <SubmitButton loading={loading}>
            🚨 Submit Emergency Report
          </SubmitButton>
        </form>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}