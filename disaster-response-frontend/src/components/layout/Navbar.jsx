import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useThemeStore, useAuthStore } from '../../store';
import {
  Sun, Moon, Menu, X, Shield, LogOut, User, ChevronDown, Radio
} from 'lucide-react';

import NotificationPanel from './NotificationPanel';

export default function Navbar({ isConnected }) {
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  const roleLinks = {
    Admin: [
      { to: '/admin', label: '📊 Dashboard' },
      { to: '/create-official-incident', label: '🛡️ Create Incident' },
      { to: '/admin/sources', label: '📡 Monitoring' },
      { to: '/admin/organizations', label: '🏢 Organizations' },
      { to: '/admin/responders', label: '👮 Responders' },
      { to: '/admin/citizens', label: '👤 Citizens' },
      { to: '/admin/analytics', label: '📈 Analytics' },
    ],
    Responder: [
      { to: '/responder', label: 'My Assignments' },
      { to: '/map', label: 'Live Map' },
    ],
    Citizen: [
      { to: '/', label: 'Home' },
      { to: '/report', label: '📩 Report' },
      { to: '/my-reports', label: '📄 My Reports' },
      { to: '/nearby', label: '🏥 Nearby' },
      { to: '/contacts', label: '📞 Contacts' },
      { to: '/safety-check', label: '❤️ Safety' },
      { to: '/preparedness', label: 'Be Prepared' },
      { to: '/ai-assistant', label: '🤖 AI Help' },
    ],
  };

  const publicLinks = [
    { to: '/disasters', label: '🗂️ Disasters' },
    { to: '/map', label: '🗺️ Map' },
    { to: '/contacts', label: '📞 Contacts' },
    { to: '/preparedness', label: '📋 Preparedness' },
  ];
  const navLinks = user?.role ? (roleLinks[user.role] || roleLinks.Citizen) : publicLinks;

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
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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

        {/* Center nav links — desktop */}
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
                  e.currentTarget.style.background = 'var(--bg-surface-2)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive(link.to)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* SOS button — Citizen only */}
          {user?.role === 'Citizen' && (
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
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              🚨 SOS
            </Link>
          )}

          {/* Live indicator */}
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

          {/* Theme toggle */}
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

          {/* User menu */}
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

          {/* Mobile hamburger */}
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

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--navbar-bg)',
          backdropFilter: 'blur(20px)',
          padding: '12px 24px 16px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive(link.to) ? 700 : 500,
                color: isActive(link.to) ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive(link.to) ? 'var(--accent-subtle)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === 'Citizen' && (
            <Link
              to="/sos"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '10px 14px', borderRadius: '8px', textDecoration: 'none',
                fontSize: '14px', fontWeight: 800,
                color: '#e53e3e', background: 'rgba(229,62,62,0.08)',
              }}
            >
              🚨 SOS
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
