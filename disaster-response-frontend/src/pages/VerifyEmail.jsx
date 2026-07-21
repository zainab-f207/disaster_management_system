import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorMessage';

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');
    const calledRef = useRef(false);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        const email = params.get('email');
        const token = params.get('token');
        if (!email || !token) {
            setStatus('error');
            setMessage('This verification link is missing information.');
            return;
        }
        api.post('/auth/confirm-email', { email, token })
            .then(res => { setStatus('success'); setMessage(res.data?.message || 'Email verified!'); })
            .catch(err => { setStatus('error'); setMessage(extractErrorMessage(err, 'This link is invalid or has expired.')); });
    }, [params]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            {status === 'loading' && (
                <>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Verifying your email...</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--text-primary)', marginBottom: '10px' }}>Email Verified!</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>{message}</p>
                    <Link to="/login" style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#145c33,#27ae60)', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>
                        Go to Sign In →
                    </Link>
                </>
            )}
            {status === 'error' && (
                <>
                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#e53e3e', marginBottom: '10px' }}>Verification Failed</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{message}</p>
                </>
            )}
        </div>
    );
}