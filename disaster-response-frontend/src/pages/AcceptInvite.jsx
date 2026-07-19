import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff } from 'lucide-react';
import FormAlert from '../components/ui/FormAlert';
import { extractErrorMessage } from '../utils/errorMessage';

export default function AcceptInvite() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const email = params.get('email') || '';
    const token = params.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setFormError('Passwords do not match.'); return; }
        if (!/(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)) {
            setFormError('Password must include an uppercase letter, a number, and a special character.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/ResponderInvites/accept', { email, token, password });
            setDone(true);
            toast.success('Account activated!');
        } catch (err) {
            setFormError(extractErrorMessage(err, 'This invitation link is invalid or has expired.'));
        } finally {
            setLoading(false);
        }
    };

    if (!email || !token) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <FormAlert type="error" message="This invitation link is missing information. Please use the link from your email exactly as sent." />
            </div>
        );
    }

    if (done) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-primary)', marginBottom: '10px' }}>Account Activated!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>You can now sign in with your new password.</p>
                <Link to="/login" style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#145c33,#27ae60)', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>
                    Go to Sign In →
                </Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '420px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', background: 'linear-gradient(135deg,#145c33,#27ae60)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={26} color="#fff" />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Activate Your Account</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{email}</p>
                </div>

                <FormAlert type="error" message={formError} onClose={() => setFormError('')} />

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Choose a Password</label>
                        <input
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Min 6 chars, uppercase, number, symbol"
                            style={{ width: '100%', padding: '11px 40px 11px 14px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '7px' }}>Confirm Password</label>
                        <input
                            type={showPass ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            style={{ width: '100%', padding: '11px 14px', background: 'var(--bg-surface-2)', border: '1.5px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? 'var(--border)' : 'linear-gradient(135deg,#145c33,#27ae60)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                        {loading ? 'Activating...' : 'Activate Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}