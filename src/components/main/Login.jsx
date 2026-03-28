/**
 * src/components/main/Login.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ZRP Officer Portal login page.
 *
 * Fixes applied:
 *  1. Forgot Password — opens a modal, calls POST /api/public/auth/forgot-password/
 *     and displays the returned reset token (prototype behaviour).
 *  2. Reset Password  — second modal opened after receiving the token, calls
 *     POST /api/public/auth/reset-password/ with badge, token, and new password.
 *  3. All error states are shown inline in each modal, never in the main form.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import api from '../../services/api';

export default function Login() {
  const navigate = useNavigate();

  // ── Main login form state ───────────────────────────────────────────────
  const [credentials, setCredentials] = useState({
    zrp_badge_number: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  // ── Forgot password modal state ─────────────────────────────────────────
  const [showForgotModal, setShowForgotModal]   = useState(false);
  const [forgotBadge, setForgotBadge]           = useState('');
  const [forgotLoading, setForgotLoading]       = useState(false);
  const [forgotError, setForgotError]           = useState('');
  const [resetToken, setResetToken]             = useState('');   // token returned by backend

  // ── Reset password modal state ──────────────────────────────────────────
  // Opens automatically after a reset token is received
  const [showResetModal, setShowResetModal]   = useState(false);
  const [resetBadge, setResetBadge]           = useState('');    // pre-filled from forgot step
  const [resetTokenInput, setResetTokenInput] = useState('');    // user can edit if needed
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading]       = useState(false);
  const [resetError, setResetError]           = useState('');
  const [resetSuccess, setResetSuccess]       = useState('');

  // ── Generic field updater ────────────────────────────────────────────────
  const set = (field) => (e) =>
    setCredentials(prev => ({ ...prev, [field]: e.target.value }));

  // ── Main login handler ───────────────────────────────────────────────────
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

  // Allow Enter key on both main-form inputs
  const onKeyDown = (e) => { if (e.key === 'Enter') handleLogin(); };

  // ── Forgot password handler ──────────────────────────────────────────────
  const handleForgotPassword = async () => {
    setForgotError('');
    if (!forgotBadge.trim()) {
      setForgotError('Please enter your ZRP badge number.');
      return;
    }
    setForgotLoading(true);
    try {
      // POST to backend — returns { message, reset_token, badge_number }
      const res = await api.post('/public/auth/forgot-password/', {
        zrp_badge_number: forgotBadge.trim(),
      });

      const token = res.data?.reset_token;
      if (!token) {
        // Backend returned a generic message — badge number may not exist
        setForgotError(
          res.data?.message ||
          'If this badge number is registered, a reset link has been generated.'
        );
        return;
      }

      // Store token + badge so the reset modal is pre-filled
      setResetToken(token);
      setResetBadge(forgotBadge.trim());
      setResetTokenInput(token);   // pre-fill so the user doesn't have to copy-paste

      // Close forgot modal, open reset modal
      setShowForgotModal(false);
      setShowResetModal(true);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Could not send reset token. Please try again.';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Reset password handler ───────────────────────────────────────────────
  const handleResetPassword = async () => {
    setResetError('');
    setResetSuccess('');

    // Client-side validation before hitting the server
    if (!resetBadge.trim()) { setResetError('Badge number is required.'); return; }
    if (!resetTokenInput.trim()) { setResetError('Reset token is required.'); return; }
    if (!newPassword)           { setResetError('New password is required.'); return; }
    if (newPassword.length < 8) { setResetError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    try {
      await api.post('/public/auth/reset-password/', {
        zrp_badge_number: resetBadge.trim(),
        token:            resetTokenInput.trim(),
        new_password:     newPassword,
        confirm_password: confirmPassword,
      });

      setResetSuccess('Password reset successfully! You can now log in with your new password.');

      // Auto-close the modal after 2 seconds and pre-fill the badge in the login form
      setTimeout(() => {
        setShowResetModal(false);
        setCredentials(prev => ({ ...prev, zrp_badge_number: resetBadge }));
        // Clean up reset state
        setNewPassword('');
        setConfirmPassword('');
        setResetTokenInput('');
        setResetSuccess('');
      }, 2000);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.confirm_password?.[0] ||
        'Password reset failed. The token may be expired or invalid.';
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Shared modal overlay style ────────────────────────────────────────────
  const modalOverlayStyle = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Main login page ───────────────────────────────────────────── */}
      <div className="login-page">
        <div className="login-card card shadow-lg">

          {/* Formal header */}
          <div className="login-card-header">
            <img src="/logo.jpg" alt="ZimCrimeWatch" />
            <h4>ZIM CRIME WATCH</h4>
            <p>Zimbabwe Republic Police — Officer Portal</p>
          </div>

          {/* Form body */}
          <div className="login-card-body">
            {/* Classification notice */}
            <div
              className="alert mb-4 py-2 d-flex align-items-center gap-2"
              style={{
                background: 'rgba(21,101,192,0.07)',
                borderColor: 'rgba(21,101,192,0.25)',
                borderLeftWidth: '4px',
                color: '#1e2d3d',
              }}
              role="note"
            >
              <i className="bi bi-shield-lock-fill text-primary"></i>
              <small className="fw-semibold">
                Restricted access. Authorised ZRP personnel only.
              </small>
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
              <label className="form-label" htmlFor="badgeNumber">ZRP Badge Number</label>
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
              <label className="form-label" htmlFor="password">Password</label>
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
              {/* Forgot password button — opens the modal */}
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none"
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  setForgotBadge(credentials.zrp_badge_number); // pre-fill if already typed
                  setForgotError('');
                  setShowForgotModal(true);
                }}
              >
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

            <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.72rem' }}>
              ZimCrimeWatch v1.0 &nbsp;·&nbsp; ZRP Internal System
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FORGOT PASSWORD MODAL
          Step 1: User enters badge number → backend returns reset token
      ══════════════════════════════════════════════════════════════════ */}
      {showForgotModal && (
        <div style={modalOverlayStyle} onClick={() => setShowForgotModal(false)}>
          <div
            className="card shadow-lg"
            style={{ width: '100%', maxWidth: 420, borderRadius: 12 }}
            onClick={e => e.stopPropagation()} // prevent overlay click from closing
          >
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e2d3d 0%, #1565C0 100%)',
              borderRadius: '12px 12px 0 0',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h5 className="text-white mb-1" style={{ fontSize: '1rem' }}>
                  <i className="bi bi-key-fill me-2"></i>Forgot Password
                </h5>
                <p className="text-white mb-0" style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                  Enter your badge number to get a reset token
                </p>
              </div>
              <button
                className="btn-close btn-close-white"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close"
              />
            </div>

            {/* Modal body */}
            <div className="card-body p-4">
              {forgotError && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {forgotError}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label" htmlFor="forgotBadge">ZRP Badge Number</label>
                <div className="input-group">
                  <span className="input-group-text" style={{ background: '#f8f9fa', borderRight: 'none' }}>
                    <i className="bi bi-person-badge text-muted"></i>
                  </span>
                  <input
                    id="forgotBadge"
                    type="text"
                    className="form-control"
                    style={{ borderLeft: 'none' }}
                    placeholder="e.g. 1234"
                    value={forgotBadge}
                    onChange={e => setForgotBadge(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleForgotPassword(); }}
                    autoFocus
                  />
                </div>
              </div>

              <p className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-info-circle me-1"></i>
                A reset token will be generated for your account.
                In production this would be emailed to you.
              </p>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary flex-fill"
                  onClick={() => setShowForgotModal(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary flex-fill"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Sending…</>
                  ) : (
                    <><i className="bi bi-send me-2" />Get Reset Token</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RESET PASSWORD MODAL
          Step 2: User enters token + new password → backend resets it
      ══════════════════════════════════════════════════════════════════ */}
      {showResetModal && (
        <div style={modalOverlayStyle} onClick={() => { if (!resetLoading) setShowResetModal(false); }}>
          <div
            className="card shadow-lg"
            style={{ width: '100%', maxWidth: 460, borderRadius: 12 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e8449 0%, #1565C0 100%)',
              borderRadius: '12px 12px 0 0',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h5 className="text-white mb-1" style={{ fontSize: '1rem' }}>
                  <i className="bi bi-shield-lock-fill me-2"></i>Reset Password
                </h5>
                <p className="text-white mb-0" style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                  Enter your reset token and choose a new password
                </p>
              </div>
              {/* Only allow closing if not in the middle of resetting */}
              {!resetLoading && !resetSuccess && (
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowResetModal(false)}
                  aria-label="Close"
                />
              )}
            </div>

            {/* Modal body */}
            <div className="card-body p-4">
              {/* Success state */}
              {resetSuccess && (
                <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-check-circle-fill fs-5"></i>
                  <span style={{ fontSize: '0.85rem' }}>{resetSuccess}</span>
                </div>
              )}

              {/* Error state */}
              {resetError && (
                <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {resetError}
                </div>
              )}

              {!resetSuccess && (
                <>
                  {/* Badge number (pre-filled, editable in case of error) */}
                  <div className="mb-3">
                    <label className="form-label" htmlFor="resetBadge">ZRP Badge Number</label>
                    <input
                      id="resetBadge"
                      type="text"
                      className="form-control"
                      value={resetBadge}
                      onChange={e => setResetBadge(e.target.value)}
                    />
                  </div>

                  {/* Reset token — pre-filled from step 1 */}
                  <div className="mb-3">
                    <label className="form-label" htmlFor="resetToken">
                      Reset Token
                      <span className="badge bg-success ms-2" style={{ fontSize: '0.65rem' }}>
                        Pre-filled
                      </span>
                    </label>
                    <div className="input-group">
                      <input
                        id="resetToken"
                        type="text"
                        className="form-control font-monospace"
                        style={{ fontSize: '0.78rem' }}
                        value={resetTokenInput}
                        onChange={e => setResetTokenInput(e.target.value)}
                      />
                      {/* Copy token to clipboard */}
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigator.clipboard.writeText(resetTokenInput)}
                        title="Copy token"
                      >
                        <i className="bi bi-clipboard"></i>
                      </button>
                    </div>
                    <small className="text-muted">This token expires in ~20 minutes.</small>
                  </div>

                  {/* New password */}
                  <div className="mb-3">
                    <label className="form-label" htmlFor="newPwd">New Password</label>
                    <input
                      id="newPwd"
                      type="password"
                      className="form-control"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>

                  {/* Confirm password */}
                  <div className="mb-4">
                    <label className="form-label" htmlFor="confirmPwd">Confirm New Password</label>
                    <input
                      id="confirmPwd"
                      type="password"
                      className="form-control"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleResetPassword(); }}
                    />
                    {/* Live mismatch warning */}
                    {confirmPassword && newPassword !== confirmPassword && (
                      <small className="text-danger">
                        <i className="bi bi-x-circle me-1"></i>Passwords do not match
                      </small>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-secondary flex-fill"
                      onClick={() => setShowResetModal(false)}
                      disabled={resetLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-success flex-fill"
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                    >
                      {resetLoading ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Resetting…</>
                      ) : (
                        <><i className="bi bi-check-lg me-2" />Reset Password</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}