/**
 * src/components/main/Login.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ZRP Officer Portal login page.
 *
 * Changes from previous version:
 *  • Uses .login-page, .login-card, .login-card-header, .login-card-body CSS
 *    classes defined in index.css instead of inline style props, so the login
 *    page is visually consistent with the rest of the design system.
 *  • Added ZRP crest/tagline strip in the card header.
 *  • Submit on Enter key works for both fields.
 *  • "Forgot Password?" retains its link style.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';

export default function Login() {
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    zrp_badge_number: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  /* Update a single credential field */
  const set = (field) => (e) =>
    setCredentials(prev => ({ ...prev, [field]: e.target.value }));

  const handleLogin = async () => {
    setError('');
    if (!credentials.zrp_badge_number.trim() || !credentials.password) {
      setError('Please enter your badge number and password.');
      return;
    }
    setLoading(true);
    try {
      await login(credentials.zrp_badge_number.trim(), credentials.password);
      navigate('/home');
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Login failed. Please check your credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  /* Allow Enter key on both inputs */
  const onKeyDown = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <div className="login-page">
      <div className="login-card card shadow-lg">

        {/* ── Formal header ───────────────────────────────────────────── */}
        <div className="login-card-header">
          <img src="/logo.jpg" alt="ZimCrimeWatch" />
          <h4>ZIM CRIME WATCH</h4>
          <p>Zimbabwe Republic Police — Officer Portal</p>
        </div>

        {/* ── Form body ───────────────────────────────────────────────── */}
        <div className="login-card-body">

          {/* Classification notice */}
          <div
            className="alert mb-4 py-2 d-flex align-items-center gap-2"
            style={{ background: 'rgba(21,101,192,0.07)', borderColor: 'rgba(21,101,192,0.25)', borderLeftWidth: '4px', color: '#1e2d3d' }}
            role="note"
          >
            <i className="bi bi-shield-lock-fill text-primary"></i>
            <small className="fw-semibold">Restricted access. Authorised ZRP personnel only.</small>
          </div>

          {/* Error alert */}
          {error && (
            <div className="alert alert-danger py-2 mb-3" role="alert" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          {/* Badge number */}
          <div className="mb-3">
            <label className="form-label" htmlFor="badgeNumber">
              ZRP Badge Number
            </label>
            <div className="input-group">
              <span className="input-group-text" style={{ background: '#f8f9fa', borderRight: 'none' }}>
                <i className="bi bi-person-badge text-muted"></i>
              </span>
              <input
                id="badgeNumber"
                type="text"
                className="form-control"
                style={{ borderLeft: 'none' }}
                placeholder="e.g. 1234"
                value={credentials.zrp_badge_number}
                onChange={set('zrp_badge_number')}
                onKeyDown={onKeyDown}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-group">
              <span className="input-group-text" style={{ background: '#f8f9fa', borderRight: 'none' }}>
                <i className="bi bi-lock text-muted"></i>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ borderLeft: 'none', borderRight: 'none' }}
                placeholder="Enter your password"
                value={credentials.password}
                onChange={set('password')}
                onKeyDown={onKeyDown}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                style={{ borderLeft: 'none' }}
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Remember me / Forgot password */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="rememberMe" />
              <label className="form-check-label" htmlFor="rememberMe" style={{ fontSize: '0.8rem' }}>
                Remember me
              </label>
            </div>
            <button type="button" className="btn btn-link p-0 text-decoration-none" style={{ fontSize: '0.8rem' }}>
              Forgot Password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="button"
            className="btn btn-primary w-100 py-2"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Signing in…
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Sign In
              </>
            )}
          </button>

          {/* Footer note */}
          <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.72rem' }}>
            ZimCrimeWatch v1.0 &nbsp;·&nbsp; ZRP Internal System
          </p>
        </div>

      </div>
    </div>
  );
}