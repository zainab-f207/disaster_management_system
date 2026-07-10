import { useState, useRef } from 'react';
import { Camera, Upload, X, Image } from 'lucide-react';

export default function ImageUpload({ onImageSelected }) {
  const [preview, setPreview]   = useState(null);
  const [fileName, setFileName] = useState('');
  const fileRef                 = useRef(null);
  const cameraRef               = useRef(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

    setFileName(file.name);

    // Convert to base64 for preview + sending
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      onImageSelected(file, e.target.result); // pass both file and base64
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setPreview(null);
    setFileName('');
    onImageSelected(null, null);
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{
        display: 'block', fontSize: '13px', fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: '7px',
      }}>
        📷 Photo Evidence <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional but helpful)</span>
      </label>

      {!preview ? (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isMobile && (
            <label style={{
              flex: 1, minWidth: '130px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '6px',
              padding: '20px 16px',
              background: 'var(--bg-surface-2)',
              border: '2px dashed var(--border)',
              borderRadius: '12px', cursor: 'pointer',
              transition: 'all 0.2s', fontSize: '13px',
              color: 'var(--text-secondary)', fontWeight: 600,
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
              <Camera size={24} />
              Take Photo
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment" // use back camera
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
            </label>
          )}

          <label style={{
            flex: 1, minWidth: '130px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '6px',
            padding: '20px 16px',
            background: 'var(--bg-surface-2)',
            border: '2px dashed var(--border)',
            borderRadius: '12px', cursor: 'pointer',
            transition: 'all 0.2s', fontSize: '13px',
            color: 'var(--text-secondary)', fontWeight: 600,
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
            <Upload size={24} />
            Upload Photo
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
              JPG, PNG under 5MB
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <img
            src={preview}
            alt="Evidence preview"
            style={{
              width: '100%', maxHeight: '200px',
              objectFit: 'cover',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          />
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute', top: '8px', right: '8px',
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', borderRadius: '50%',
              width: '28px', height: '28px',
              cursor: 'pointer', fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
          <div style={{
            marginTop: '6px', fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            📁 {fileName}
          </div>
        </div>
      )}
    </div>
  );
}