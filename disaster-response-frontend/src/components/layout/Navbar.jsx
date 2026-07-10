import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useThemeStore, useAuthStore } from '../../store';
import {
  Sun, Moon, Menu, X, Shield, AlertTriangle,
  LogOut, User, ChevronDown, Radio
} from 'lucide-react';

import NotificationPanel from './NotificationPanel';

export default function Navbar({ isConnected }) {
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  const primaryDashboardLink =
    user?.role === 'Admin' ? { to: '/admin', label: 'Dashboard' } :
      user?.role === 'Responder' ? { to: '/responder', label: 'Dashboard' } :
        user?.role === 'Citizen' ? { to: '/citizen', label: 'Dashboard' } :
          { to: '/', label: 'Dashboard' };

  const navLinks = [
    primaryDashboardLink,
    { to: '/disasters', label: 'Disasters' },
    { to: '/map', label: 'Live Map' },
    { to: '/safety-check', label: '❤️ Safety Check' },
    { to: '/preparedness', label: 'Be Prepared' },
    { to: '/ai-assistant', label: '🤖 AI Help' },
    ...(isAuthenticated ? [{ to: '/report', label: '📩 Report' }] : []),
    ...(user?.role === 'Responder' ? [{ to: '/responder', label: 'My Assignments' }] : []),
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: 'var(--navbar-bg)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{
        maxWidth: '1400px', margin: '0 auto',
        padding: '0 24px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, var(--pk-green-600), var(--pk-green-400))',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(39,174,96,0.4)',
          }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700, fontSize: '15px',
              color: 'var(--text-primary)', lineHeight: 1,
            }}>
              Pakistan DRS
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Disaster Response System
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} className="desktop-nav">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive(link.to) ? 600 : 500,
                color: isActive(link.to) ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive(link.to) ? 'var(--accent-subtle)' : 'transparent',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                if (!isActive(link.to)) {
                  e.target.style.background = 'var(--bg-surface-2)';
                  e.target.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive(link.to)) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/sos"
            style={{
              padding: '7px 14px',
              background: 'linear-gradient(135deg, #c41a1a, #e53e3e)',
              color: '#fff', textDecoration: 'none',
              borderRadius: '10px', fontSize: '13px', fontWeight: 800,
              boxShadow: '0 4px 12px rgba(229,62,62,0.35)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.02em',
              animation: 'pulse-dot 3s infinite',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            🚨 SOS
          </Link>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '20px',
            background: isConnected ? 'rgba(39,174,96,0.1)' : 'rgba(229,62,62,0.1)',
            border: `1px solid ${isConnected ? 'rgba(39,174,96,0.3)' : 'rgba(229,62,62,0.3)'}`,
          }}>
            <Radio size={10} color={isConnected ? '#27ae60' : '#e53e3e'}
              style={{ animation: isConnected ? 'pulse-dot 2s infinite' : 'none' }} />
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: isConnected ? '#27ae60' : '#e53e3e',
            }}>
              {isConnected ? 'LIVE' : 'OFF'}
            </span>
          </div>

          <NotificationPanel />

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              width: '38px', height: '38px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 12px',
                  background: 'var(--accent-subtle)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px', cursor: 'pointer',
                  color: 'var(--accent)', fontSize: '13px', fontWeight: 600,
                }}
              >
                <User size={14} />
                {user?.fullName?.split(' ')[0]}
                <ChevronDown size={12} />
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '180px', overflow: 'hidden',
                  animation: 'fadeInDown 0.2s ease',
                  zIndex: 100,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {user?.fullName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {user?.role}
                    </div>
                  </div>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    style={{
                      width: '100%', padding: '10px 16px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', fontSize: '13px',
                      color: 'var(--critical)', textAlign: 'left',
                    }}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" style={{
              padding: '7px 16px',
              background: 'linear-gradient(135deg, var(--pk-green-600), var(--pk-green-400))',
              color: '#fff', textDecoration: 'none',
              borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              boxShadow: '0 4px 12px rgba(33,150,83,0.3)',
              transition: 'all var(--transition-fast)',
            }}>
              Sign In
            </Link>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="mobile-menu-btn"
            style={{
              background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
              borderRadius: '10px', width: '38px', height: '38px',
              display: 'none', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-primary)',
            }}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
