import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi, orgApi } from '../services/api';
import { useAuthStore } from '../store';
import { FormInput, FormSelect, SubmitButton } from '../components/forms/FormInput';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useEffect } from 'react';
import FormAlert from '../components/ui/FormAlert';
import { extractErrorMessage } from '../utils/errorMessage';

const ROLES = [
  {
    value: 'Citizen',
    emoji: '👤',
    label: 'Citizen',
    desc: 'Report accidents, disasters, and emergencies in your area',
  },
  {
    value: 'Responder',
    emoji: '🚒',
    label: 'Responder',
    desc: 'Field worker for Rescue 1122, Edhi, PDMA, or other organizations',
  },
];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Citizen');
  const [organizations, setOrganizations] = useState([]);
  const [formError, setFormError] = useState('');

  const queryParams = new URLSearchParams(window.location.search);
  const emailParam = queryParams.get('email') || '';

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: { role: 'Citizen', email: emailParam },
  });

  useEffect(() => {
    orgApi.getAll().then(res => setOrganizations(res.data || [])).catch(() => { });
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        role: selectedRole,
        responderOrganizationId:
          selectedRole === 'Responder' ? parseInt(data.orgId) : null,
      };

      const res = await authApi.register(payload);
      toast.success(`Account created for ${data.fullName?.split(' ')[0]}! Please login. 🎉`);
      navigate('/login');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to create account.');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px 40px',
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(circle at 80% 50%, rgba(33,150,83,0.06) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '460px',
        animation: 'scaleIn 0.35s ease',
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div style={{
              width: '56px', height: '56px', margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #145c33, #27ae60)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(33,150,83,0.3)',
            }}>
              <Shield size={26} color="#fff" />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '22px',
              fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px',
            }}>
              Create Account
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Join Pakistan's disaster response network
            </p>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: '9px',
            }}>
              I am a...
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {ROLES.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  style={{
                    padding: '12px',
                    background: selectedRole === role.value
                      ? 'rgba(39,174,96,0.10)' : 'var(--bg-surface-2)',
                    border: `2px solid ${selectedRole === role.value
                      ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '12px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '5px' }}>{role.emoji}</div>
                  <div style={{
                    fontSize: '13px', fontWeight: 700,
                    color: selectedRole === role.value ? 'var(--accent)' : 'var(--text-primary)',
                  }}>
                    {role.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                    {role.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <FormAlert type="error" message={formError} onClose={() => setFormError('')} />

          <form onSubmit={handleSubmit(onSubmit)}>
            <FormInput
              label="Full Name"
              icon="👤"
              placeholder="Muhammad Ali"
              register={register('fullName', {
                required: 'Full name is required',
                minLength: { value: 3, message: 'At least 3 characters' },
              })}
              error={errors.fullName}
            />

            <FormInput
              label="Email Address"
              type="email"
              icon="✉️"
              placeholder="you@example.com"
              register={register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
              })}
              error={errors.email}
            />

            <FormInput
              label="Phone Number"
              type="tel"
              icon="📱"
              placeholder="03001234567"
              register={register('phoneNumber', {
                required: 'Phone number is required',
                pattern: { value: /^03\d{9}$/, message: 'Enter a valid Pakistani number (03XXXXXXXXX)' },
              })}
              error={errors.phoneNumber}
            />

            <div style={{ position: 'relative' }}>
              <FormInput
                label="Password"
                type={showPass ? 'text' : 'password'}
                icon="🔒"
                placeholder="Min 6 chars, 1 uppercase, 1 number, 1 symbol"
                register={register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                  pattern: {
                    value: /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/,
                    message: 'Must have uppercase, number & special character',
                  },
                })}
                error={errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '13px', top: '38px',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {selectedRole === 'Responder' && (
              <FormSelect
                label="Your Organization"
                register={register('orgId', {
                  required: selectedRole === 'Responder'
                    ? 'Please select your organization' : false,
                })}
                error={errors.orgId}
                hint="Select the organization you work for"
              >
                <option value="">-- Select organization --</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </FormSelect>
            )}

            <div style={{ marginBottom: '22px' }} />
            <SubmitButton loading={loading}>
              Create Account →
            </SubmitButton>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
            </span>
            <Link to="/login" style={{
              fontSize: '13px', fontWeight: 600,
              color: 'var(--accent)', textDecoration: 'none',
            }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}