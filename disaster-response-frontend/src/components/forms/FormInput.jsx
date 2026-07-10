
export function FormInput({
  label, name, type = 'text', register, error,
  placeholder, icon, hint
}) {
  return (
    <div style={{ marginBottom: '18px' }}>
      {label && (
        <label style={{
          display: 'block', fontSize: '13px',
          fontWeight: 600, color: 'var(--text-secondary)',
          marginBottom: '7px',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: '13px',
            top: '50%', transform: 'translateY(-50%)',
            fontSize: '16px', pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          {...register}
          style={{
            width: '100%',
            padding: icon ? '11px 14px 11px 40px' : '11px 14px',
            background: 'var(--bg-surface-2)',
            border: `1.5px solid ${error ? '#e53e3e' : 'var(--border)'}`,
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = error ? '#e53e3e' : 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = error ? '#e53e3e' : 'var(--border)'}
        />
      </div>
      {error && (
        <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px' }}>
          ⚠ {error.message}
        </p>
      )}
      {hint && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '5px' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormSelect({ label, name, register, error, children, hint }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      {label && (
        <label style={{
          display: 'block', fontSize: '13px',
          fontWeight: 600, color: 'var(--text-secondary)',
          marginBottom: '7px',
        }}>
          {label}
        </label>
      )}
      <select
        {...register}
        style={{
          width: '100%', padding: '11px 14px',
          background: 'var(--bg-surface-2)',
          border: `1.5px solid ${error ? '#e53e3e' : 'var(--border)'}`,
          borderRadius: '10px',
          color: 'var(--text-primary)',
          fontSize: '14px', outline: 'none',
          cursor: 'pointer', boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? '#e53e3e' : 'var(--border)'}
      >
        {children}
      </select>
      {error && (
        <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '5px' }}>
          ⚠ {error.message}
        </p>
      )}
      {hint && !error && (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '5px' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%', padding: '13px',
        background: loading
          ? 'var(--border)'
          : 'linear-gradient(135deg, #145c33, #27ae60)',
        color: '#fff', border: 'none',
        borderRadius: '12px', fontSize: '15px',
        fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : '0 4px 16px rgba(33,150,83,0.35)',
        transition: 'all 0.2s',
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.02em',
      }}
    >
      {loading ? '⏳ Please wait...' : children}
    </button>
  );
}