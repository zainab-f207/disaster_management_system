import { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle } from 'lucide-react';

export default function CompletionModal({ assignment, onConfirm, onCancel, loading }) {
  const [notes, setNotes]       = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [notesError, setNotesError] = useState('');
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);
  const isMobile  = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoBase64(e.target.result);
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (notes.trim().length < 10) {
      setNotesError('Please describe what was done (at least 10 characters).');
      return;
    }
    setNotesError('');
    onConfirm({ completionNotes: notes, completionPhotoBase64: photoBase64 });
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          width: '100%', maxWidth: '480px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'scaleIn 0.25s ease',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '20px',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '20px',
              fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px',
            }}>
              ✅ Mark Assignment Complete
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Submit proof of completion for Disaster #{assignment.disasterId}
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
              borderRadius: '8px', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{
          padding: '12px 14px', marginBottom: '20px',
          background: 'rgba(39,174,96,0.08)',
          border: '1px solid rgba(39,174,96,0.2)',
          borderRadius: '10px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
            🚒 {assignment.organizationName}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Assignment #{assignment.id} · Disaster #{assignment.disasterId}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block', fontSize: '13px', fontWeight: 700,
            color: 'var(--text-secondary)', marginBottom: '8px',
          }}>
            Step 1 — What did your team do? <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesError(''); }}
            placeholder="Describe the actions taken: rescued 3 people, fire extinguished, road cleared, medical aid provided..."
            rows={4}
            style={{
              width: '100%', padding: '11px 14px',
              background: 'var(--bg-surface-2)',
              border: `1.5px solid ${notesError ? '#e53e3e' : 'var(--border)'}`,
              borderRadius: '10px', color: 'var(--text-primary)',
              fontSize: '13px', resize: 'vertical', outline: 'none',
              lineHeight: 1.6, boxSizing: 'border-box',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = notesError ? '#e53e3e' : 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = notesError ? '#e53e3e' : 'var(--border)'}
          />
          {notesError && (
            <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px' }}>
              ⚠ {notesError}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block', fontSize: '13px', fontWeight: 700,
            color: 'var(--text-secondary)', marginBottom: '4px',
          }}>
            Step 2 — Photo Proof
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (recommended)</span>
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            A photo of the completed work helps admin verify the response.
          </p>

          {!photoPreview ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {isMobile && (
                <label style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '18px 12px',
                  background: 'var(--bg-surface-2)',
                  border: '2px dashed var(--border)',
                  borderRadius: '12px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '12px', fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Camera size={22} />
                  Take Photo
                  <input
                    ref={cameraRef}
                    type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files?.[0])}
                  />
                </label>
              )}

              <label style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '6px', padding: '18px 12px',
                background: 'var(--bg-surface-2)',
                border: '2px dashed var(--border)',
                borderRadius: '12px', cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '12px', fontWeight: 600,
                color: 'var(--text-secondary)',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Upload size={22} />
                Upload Photo
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
                  JPG, PNG under 5MB
                </span>
                <input
                  ref={fileRef}
                  type="file" accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                src={photoPreview}
                alt="Completion proof"
                style={{
                  width: '100%', maxHeight: '220px',
                  objectFit: 'cover', borderRadius: '12px',
                  border: '2px solid var(--accent)',
                }}
              />
              <button
                type="button"
                onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}
                style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  width: '28px', height: '28px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
              <div style={{
                position: 'absolute', bottom: '8px', left: '8px',
                background: 'rgba(39,174,96,0.9)', color: '#fff',
                padding: '3px 10px', borderRadius: '8px',
                fontSize: '11px', fontWeight: 700,
              }}>
                ✅ Photo ready
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px',
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '12px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 2, padding: '12px',
              background: loading
                ? 'var(--border)'
                : 'linear-gradient(135deg, #145c33, #27ae60)',
              color: '#fff', border: 'none',
              borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 800,
              fontFamily: 'var(--font-display)',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(33,150,83,0.3)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
            }}
          >
            {loading ? (
              '⏳ Submitting...'
            ) : (
              <>
                <CheckCircle size={16} />
                Submit Completion Proof
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}