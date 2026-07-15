import CreateDisasterForm from '../components/admin/CreateDisasterForm';
import { Shield } from 'lucide-react';

export default function CreateOfficialIncident() {
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '80px 24px',
    background: 'var(--bg-elevated)',
    borderRadius: '20px',
    boxShadow: 'var(--shadow-lg)',
    backdropFilter: 'blur(12px)',
    animation: 'fadeIn 0.5s ease',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <Shield size={28} color="var(--accent)" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Create Official Incident
        </h1>
      </div>
      <CreateDisasterForm />
    </div>
  );
}
