/**
 * src/components/main/Login.jsx  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *  • Replaced raw axios.post('http://127.0.0.1:8000/zrp/login/', ...)
 *    with authService.login() — correct endpoint + token persistence handled there.
 *  • Added loading state and user-facing error message.
 *  • Uses react-router-dom's useNavigate instead of window.location.href.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';

export default function Login() {
  const navigate = useNavigate();

  const [loginCredentials, setLoginCredentials] = useState({
    zrp_badge_number: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(loginCredentials.zrp_badge_number, loginCredentials.password);
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

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1b3a6b 100%)' }}
    >
      <div
        className="card shadow-lg border-0 rounded-4 p-4"
        style={{ width: '100%', maxWidth: '420px' }}
      >
        {/* Logo / Header */}
        <div className="text-center mb-4">
          <img src="/logo.jpg" alt="ZimCrimeWatch" height={64} className="mb-3" />
          <h4 className="fw-bold">ZIM CRIME WATCH</h4>
          <p className="text-muted small">ZRP Officer Portal</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        {/* Badge Number */}
        <div className="mb-3">
          <label className="form-label fw-semibold">ZRP Badge Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. 1234"
            value={loginCredentials.zrp_badge_number}
            onChange={(e) =>
              setLoginCredentials({ ...loginCredentials, zrp_badge_number: e.target.value })
            }
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="form-label fw-semibold">Password</label>
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Enter your password"
              value={loginCredentials.password}
              onChange={(e) =>
                setLoginCredentials({ ...loginCredentials, password: e.target.value })
              }
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
        </div>

        {/* Remember Me / Forgot */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="rememberMe" />
            <label className="form-check-label" htmlFor="rememberMe">
              Remember me
            </label>
          </div>
          <button type="button" className="btn btn-link text-decoration-none p-0 small">
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
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Signing in…
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Sign In
            </>
          )}
        </button>
      </div>
    </div>
  );
}
