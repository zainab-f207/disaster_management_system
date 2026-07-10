import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { reportApi } from '../services/api';
import toast from 'react-hot-toast';

const DISASTER_TYPES = [
  { value: 'RoadAccident',     emoji: '🚗', label: 'Road Accident',     call: '1122' },
  { value: 'UrbanFire',        emoji: '🔥', label: 'Fire',              call: '16'   },
  { value: 'BuildingCollapse', emoji: '🏚️', label: 'Building Collapse', call: '1122' },
  { value: 'GasExplosion',     emoji: '💥', label: 'Gas Explosion',     call: '1122' },
  { value: 'Flood',            emoji: '🌊', label: 'Flood',             call: '1122' },
  { value: 'Earthquake',       emoji: '🌍', label: 'Earthquake',        call: '1122' },
  { value: 'Stampede',         emoji: '👥', label: 'Stampede',          call: '15'   },
  { value: 'IndustrialAccident', emoji: '🏭', label: 'Industrial',      call: '1122' },
  { value: 'Other',            emoji: '⚠️', label: 'Other Emergency',   call: '1122' },
];

const STEPS = ['type', 'location', 'photo', 'sending', 'done'];

export default function SOSPage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate                  = useNavigate();
  const [step, setStep]           = useState('type');
  const [selectedType, setSelectedType] = useState(null);
  const [location, setLocation]   = useState(null);
  const [gettingGPS, setGettingGPS] = useState(false);
  const [photo, setPhoto]         = useState(null);
  const [sending, setSending]     = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const fileRef                   = useRef(null);
  const cameraRef                 = useRef(null);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (step === 'location') autoGetGPS();
  }, [step]);

  useEffect(() => {
    if (step === 'done' && countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, countdown]);

  const autoGetGPS = () => {
    setGettingGPS(true);
    if (!navigator.geolocation) {
      setGettingGPS(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode quickly
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
          );
          const data = await res.json();
          const a = data.address || {};
          const name = [a.neighbourhood||a.suburb||a.road, a.city||a.town||a.village, a.state]
            .filter(Boolean).slice(0,2).join(', ');
          setLocation({ latitude, longitude, name: name || 'Current Location' });
        } catch {
          setLocation({ latitude, longitude, name: 'Current Location' });
        }
        setGettingGPS(false);
      },
      () => { setGettingGPS(false); },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handlePhoto = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!selectedType || !location) return;
    setSending(true);
    setStep('sending');

    try {
      const typeInfo = DISASTER_TYPES.find(d => d.value === selectedType);
      const res = await reportApi.submit({
        type:         selectedType,
        latitude:     location.latitude,
        longitude:    location.longitude,
        locationName: location.name,
        description:  `🚨 SOS — ${typeInfo?.label || selectedType} reported via One-Click SOS at ${location.name}. Location automatically captured. Immediate assistance required.`,
        imageBase64:  photo || null,
        imageUrl:     null,
      });
      setSubmittedId(res.data?.id);
      setStep('done');
    } catch (err) {
      toast.error('Failed to send SOS. Please call 1122 directly!');
      setSending(false);
      setStep('type');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1a0000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '8px' }}>
          Sign in to use SOS
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' }}>
          You need an account to send emergency reports.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => navigate('/login')} style={{
            padding: '12px 28px', background: '#e53e3e', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '14px',
            fontWeight: 700, cursor: 'pointer',
          }}>
            Sign In
          </button>
          <a href="tel:1122" style={{
            padding: '12px 28px', background: 'rgba(255,255,255,0.1)',
            color: '#fff', borderRadius: '12px', fontSize: '14px',
            fontWeight: 700, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            📞 Call 1122
          </a>
        </div>
      </div>
    );
  }

  const selectedTypeInfo = DISASTER_TYPES.find(d => d.value === selectedType);

  return (
    <div style={{
      minHeight: '100vh',
      background: step === 'done'
        ? 'linear-gradient(135deg, #0a2e1a, #145c33)'
        : step === 'sending'
        ? 'linear-gradient(135deg, #1a0505, #7a0000)'
        : 'linear-gradient(135deg, #0a0a0a, #1a0505)',
      display: 'flex', flexDirection: 'column',
      padding: '80px 20px 40px',
      alignItems: 'center',
      transition: 'background 0.5s ease',
    }}>

      {step === 'type' && (
        <div style={{ width: '100%', maxWidth: '500px', animation: 'fadeInUp 0.4s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              fontSize: '64px', marginBottom: '12px',
              animation: 'pulse-dot 2s infinite',
            }}>
              🚨
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '28px',
              fontWeight: 900, color: '#fff', marginBottom: '6px',
            }}>
              Emergency SOS
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
              Select the type of emergency
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
            marginBottom: '24px',
          }}>
            {DISASTER_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => { setSelectedType(type.value); setStep('location'); }}
                style={{
                  padding: '16px 8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '6px',
                  transition: 'all 0.15s', color: '#fff',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(229,62,62,0.2)';
                  e.currentTarget.style.borderColor = '#e53e3e';
                  e.currentTarget.style.transform = 'scale(1.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span style={{ fontSize: '28px' }}>{type.emoji}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', padding: '14px',
            display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', gridColumn: '1/-1', marginBottom: '4px' }}>
              Or call directly:
            </p>
            {[
              { name: 'Rescue 1122', num: '1122', emoji: '🚒' },
              { name: 'Police',      num: '15',   emoji: '👮' },
              { name: 'Edhi',        num: '115',  emoji: '🚑' },
              { name: 'NDMA',        num: '1135', emoji: '🛡️' },
            ].map(c => (
              <a key={c.num} href={`tel:${c.num}`} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.07)',
                textDecoration: 'none', color: '#fff',
                fontSize: '13px', fontWeight: 700,
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              >
                <span>{c.emoji}</span>
                <div>
                  <div style={{ fontSize: '15px' }}>{c.num}</div>
                  <div style={{ fontSize: '10px', opacity: 0.6 }}>{c.name}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {step === 'location' && (
        <div style={{ width: '100%', maxWidth: '460px', animation: 'fadeInUp 0.3s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ fontSize: '48px' }}>{selectedTypeInfo?.emoji}</span>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '22px',
              fontWeight: 800, color: '#fff', marginTop: '10px', marginBottom: '6px',
            }}>
              Getting Your Location
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              {gettingGPS ? '📡 Detecting GPS coordinates...' : 'Location captured'}
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${location ? 'rgba(39,174,96,0.5)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: '14px', padding: '18px',
            textAlign: 'center', marginBottom: '20px',
          }}>
            {gettingGPS ? (
              <div>
                <div style={{ fontSize: '36px', animation: 'spin-slow 2s linear infinite', marginBottom: '8px' }}>
                  📡
                </div>
                <p style={{ color: '#fff', fontSize: '14px' }}>Getting your GPS location...</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>
                  Please allow location access if prompted
                </p>
              </div>
            ) : location ? (
              <div>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                <p style={{ color: '#6fcf97', fontSize: '14px', fontWeight: 700 }}>
                  {location.name}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>
                  {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📍</div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  Could not get GPS location
                </p>
                <button
                  onClick={autoGetGPS}
                  style={{
                    marginTop: '10px', padding: '8px 20px',
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setStep('type')}
              style={{
                flex: 1, padding: '13px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('photo')}
              disabled={!location}
              style={{
                flex: 2, padding: '13px',
                background: location ? '#e53e3e' : 'rgba(255,255,255,0.1)',
                color: '#fff', border: 'none',
                borderRadius: '12px', cursor: location ? 'pointer' : 'not-allowed',
                fontSize: '14px', fontWeight: 800,
                fontFamily: 'var(--font-display)',
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 'photo' && (
        <div style={{ width: '100%', maxWidth: '460px', animation: 'fadeInUp 0.3s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '48px' }}>{selectedTypeInfo?.emoji}</span>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '22px',
              fontWeight: 800, color: '#fff', marginTop: '10px', marginBottom: '4px',
            }}>
              Add Photo (Optional)
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              A photo helps responders understand the situation faster
            </p>
          </div>

          {!photo ? (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {isMobile && (
                <label style={{
                  flex: 1, padding: '20px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px dashed rgba(255,255,255,0.25)',
                  borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '8px',
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                }}>
                  <span style={{ fontSize: '28px' }}>📷</span>
                  Take Photo
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files?.[0])} />
                </label>
              )}
              <label style={{
                flex: 1, padding: '20px 12px',
                background: 'rgba(255,255,255,0.08)',
                border: '2px dashed rgba(255,255,255,0.25)',
                borderRadius: '12px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px',
                color: '#fff', fontSize: '13px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '28px' }}>📁</span>
                Upload Photo
                <input ref={fileRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={e => handlePhoto(e.target.files?.[0])} />
              </label>
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <img src={photo} alt="Evidence"
                style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px' }} />
              <button onClick={() => setPhoto(null)} style={{
                position: 'absolute', top: '8px', right: '8px',
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', borderRadius: '50%', width: '28px', height: '28px',
                cursor: 'pointer', fontSize: '14px',
              }}>✕</button>
            </div>
          )}

          <div style={{
            padding: '12px 14px', marginBottom: '20px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.8)',
          }}>
            📍 {location?.name} · {selectedTypeInfo?.emoji} {selectedTypeInfo?.label}
          </div>

          <button
            onClick={handleSend}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #c41a1a, #e53e3e)',
              color: '#fff', border: 'none',
              borderRadius: '14px', fontSize: '16px',
              fontWeight: 900, cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 6px 24px rgba(229,62,62,0.4)',
              animation: 'pulse-dot 2s infinite',
              marginBottom: '10px',
            }}
          >
            🚨 SEND SOS NOW
          </button>
          <button
            onClick={() => setStep('location')}
            style={{
              width: '100%', padding: '11px',
              background: 'transparent', color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', cursor: 'pointer', fontSize: '13px',
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {step === 'sending' && (
        <div style={{ textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
          <div style={{
            width: '80px', height: '80px', margin: '0 auto 20px',
            borderRadius: '50%', border: '3px solid #e53e3e',
            borderTopColor: 'transparent',
            animation: 'spin-slow 0.8s linear infinite',
          }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            Sending SOS...
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
            Alerting admin and responders
          </p>
        </div>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', maxWidth: '440px', animation: 'scaleIn 0.4s ease' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px', animation: 'float 2s ease-in-out infinite' }}>
            ✅
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>
            SOS Sent!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Your emergency report has been sent to admin.
            Rescue teams will be dispatched after verification.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '14px', padding: '16px',
            marginBottom: '20px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '12px' }}>
              ☎️ Also call for faster response:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { name: `Rescue 1122`, num: selectedTypeInfo?.call || '1122', emoji: '🚒', primary: true },
                { name: 'Edhi Foundation', num: '115', emoji: '🚑', primary: false },
              ].map(c => (
                <a key={c.num} href={`tel:${c.num}`} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px', borderRadius: '10px',
                  background: c.primary ? 'rgba(229,62,62,0.3)' : 'rgba(255,255,255,0.1)',
                  border: c.primary ? '1px solid rgba(229,62,62,0.5)' : '1px solid rgba(255,255,255,0.15)',
                  textDecoration: 'none', color: '#fff',
                  fontSize: '14px', fontWeight: 800,
                }}>
                  <span style={{ fontSize: '20px' }}>{c.emoji}</span>
                  <div>
                    <div>{c.num}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>{c.name}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', padding: '13px',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 700,
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}