import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, LogIn, UserPlus, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Greenhouse Operator');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let res;
      if (tab === 'login') {
        res = await loginUser(email, password);
      } else {
        res = await registerUser({ name, email, password, role });
      }

      if (res.success && res.token) {
        localStorage.setItem('greenhouse_auth_token', res.token);
        localStorage.setItem('greenhouse_user', JSON.stringify(res.user));
        if (onAuthSuccess) onAuthSuccess(res.user);
        onClose();
      } else {
        throw new Error(res.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const ROLES = [
    { value: 'Greenhouse Operator', label: 'Operator', desc: 'Manage actuators & alerts' },
    { value: 'Administrator', label: 'Admin', desc: 'Full cloud gateway access' },
    { value: 'Agronomist', label: 'Agronomist', desc: 'Crop health & AI analytics' },
    { value: 'Researcher', label: 'Researcher', desc: 'Historical data logs' },
  ];

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="auth-modal-header">
          <div className="auth-header-left">
            <div className="auth-icon-badge">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="auth-modal-title">
                {tab === 'login' ? 'Sign In to Greenhouse Hub' : 'Create Operator Account'}
              </h2>
              <p className="auth-modal-subtitle">
                {tab === 'login'
                  ? 'Access remote actuator controls, dual AI scouting & telemetry'
                  : 'Register a new authenticated greenhouse profile'}
              </p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-group">
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            <UserPlus size={14} />
            <span>Register Account</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-modal-form">
          {error && (
            <div className="auth-error-alert">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {tab === 'register' && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-name">
                Full Name
              </label>
              <div className="auth-input-wrapper">
                <UserIcon size={16} className="auth-input-icon" />
                <input
                  id="auth-name"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Dr. Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="auth-email"
                type="email"
                className="auth-input"
                placeholder="operator@greenhouse.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>
              {tab === 'login' && (
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Encrypted Session
                </span>
              )}
            </div>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {tab === 'register' && (
            <div className="auth-field">
              <label className="auth-label">
                Select Greenhouse System Role
              </label>
              <div className="auth-roles-grid">
                {ROLES.map((r) => (
                  <div
                    key={r.value}
                    className={`auth-role-card ${role === r.value ? 'selected' : ''}`}
                    onClick={() => setRole(r.value)}
                  >
                    <div className="auth-role-header">
                      <span className="auth-role-name">{r.label}</span>
                      {role === r.value && <CheckCircle2 size={13} color="#16a34a" />}
                    </div>
                    <span className="auth-role-desc">{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="auth-modal-actions">
            <button
              type="button"
              className="btn btn-secondary auth-cancel-btn"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Authenticating...</span>
                </>
              ) : tab === 'login' ? (
                <>
                  <LogIn size={15} />
                  <span>Sign In to Hub</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security badge footer */}
        <div className="auth-modal-security-note">
          <Sparkles size={13} color="#16a34a" />
          <span>Smart Greenhouse Automation System • Encrypted JWT Authentication</span>
        </div>
      </div>
    </div>
  );
}
