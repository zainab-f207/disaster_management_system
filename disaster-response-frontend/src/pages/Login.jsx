import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import api from '../services/api';
import { useAuthStore } from '../store';
import { FormInput, SubmitButton } from '../components/forms/FormInput';
import { Shield, Eye, EyeOff } from 'lucide-react';
import FormAlert from '../components/ui/FormAlert';
import { extractErrorMessage } from '../utils/errorMessage';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [lastEmail, setLastEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setFormError('');
    setNeedsVerification(false);
    setLastEmail(data.email);
    try {
      const res = await authApi.login(data);
      login(res.data, res.data.token);
      toast.success(`Welcome back, ${res.data.fullName?.split(' ')[0]}! 👋`);

      if (res.data.role === 'Admin') navigate('/admin');
      else if (res.data.role === 'Responder') navigate('/responder');
      else navigate('/');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Invalid email or password.');
      setFormError(msg);
      if (msg.toLowerCase().includes('verify')) setNeedsVerification(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!lastEmail) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: lastEmail });
      toast.success('Verification email sent — check your inbox.');
    } catch {
      toast.error('Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(33,150,83,0.06) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(33,150,83,0.04) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
        animation: 'scaleIn 0.35s ease',
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
             <img src="/logo.svg" alt="Nigehbaan Logo" style={{
              width: '74px', height: '74px', margin: '0 auto 14px',
              filter: 'drop-shadow(0 8px 16px rgba(33,150,83,0.3))',
              animation: 'float 3s ease-in-out infinite',
            }} />
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px', fontWeight: 800,
              color: 'var(--text-primary)', marginBottom: '4px',
            }}>
              Sign In
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Nigehbaan — Pakistan's Guardian Network
            </p>
          </div>

          <FormAlert type="error" message={formError} onClose={() => setFormError('')} />

          {needsVerification && (
            <div style={{ marginTop: '-10px', marginBottom: '18px', textAlign: 'center' }}>
              <button
                onClick={handleResend}
                disabled={resending}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  fontSize: '13px', fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
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

            <div style={{ position: 'relative' }}>
              <FormInput
                label="Password"
                type={showPass ? 'text' : 'password'}
                icon="🔒"
                placeholder="Your password"
                register={register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' },
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
                  padding: '2px',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ marginBottom: '22px' }} />
            <SubmitButton loading={loading}>
              Sign In →
            </SubmitButton>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              New to the system?{' '}
            </span>
            <Link to="/register" style={{
              fontSize: '13px', fontWeight: 600,
              color: 'var(--accent)', textDecoration: 'none',
            }}>
              Create account
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <Link to="/" style={{
              fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none',
            }}>
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}