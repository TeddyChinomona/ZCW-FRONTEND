import axios from 'axios';
import { useState } from 'react';
import Logo from '/logo.jpg'


function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginCredentials, setloginCredentials] = useState({
    zrp_badge_number: '',
    password: ''
  })
  
  const Login_request = () =>{
    axios.post('http://localhost:8000/api/public/auth/login/', loginCredentials)
    .then(response => {
      console.log(response.data);
    })
    .catch(error => {
      console.error('Login failed:', error);
    });
  }
  return (
    <div className="login">
      <div className="container d-flex justify-content-center align-items-center login-inside">
        <div className="row">
          {/* Left column or panel */}
          <div className="col-3 left-panel rounded-start-2">
            <div className='mb-4'>
              <div className="text-center mb-4">
                <img src={Logo} alt="ZRP Logo" className="rounded-circle login-img" />
                <h2 className="fw-bold">Zimbabwe Republic Police</h2>
                <p className="opacity-75">Crime Management System</p>
              </div>

              <div className='d-flex my-4 justify-content-center align-items-center'>
                <h5 className="mb-3">Secure Access</h5>
              </div>

              <div className="d-flex justify-content-center align-items-center">
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <i className="bi bi-shield-lock-fill me-2"></i>
                    256-bit Encryption
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-fingerprint me-2"></i>
                    Multi-factor Authentication
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-clock-history me-2"></i>
                    Session Monitoring
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-journal-check me-2"></i>
                    Audit Trail Logging
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right panel/column */}
          <div className="col-9 right-panel rounded-end-2">
            <>
              <div className="text-center mb-4">
                <h3 className="fw-bold text-dark">Welcome Back</h3>
                <p className="text-muted">Sign in to access the system</p>
              </div>

              {/* Login Method Tabs */}
              <ul className="nav nav-pills gap-2 nav-justified mb-4">
                <li className="nav-item">
                  <button
                    className='nav-link bg-primary text-dark'
                  >
                    <i className="bi bi-key"></i>
                    Password
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className='nav-link bg-primary text-dark'
                  >
                    <i className="bi bi-fingerprint"></i>
                    Biometric
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className='nav-link bg-primary text-dark'
                  >
                    <i className="bi bi-credit-card"></i>
                    Smart Card
                  </button>
                </li>
              </ul>

              <form>
                {/* Badge Number Field */}
                <div className="mb-3">
                  <label className="form-label fw-medium">
                    <i className="bi bi-person-badge me-2"></i>
                    Badge Number
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">ZRP-</span>
                    <input
                      type="text"
                      className="form-control"
                      name="zrp_badge_number"
                      placeholder="Enter your badge number"
                      onChange={(e) => setloginCredentials({...loginCredentials, zrp_badge_number: e.target.value})}
                      required
                    />
                  </div>
                  <small className="text-muted">Format: ZRP-XXXX</small>
                </div>

                {/* Conditional Fields based on Login Method */}
                <div className="mb-3">
                  <label className="form-label fw-medium">
                    <i className="bi bi-lock me-2"></i>
                    Password
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      name="password"
                      placeholder="Enter your password"
                      onChange={(e) => setloginCredentials({...loginCredentials, password: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye' : 'bi-eye-slash'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="rememberMe"
                    />
                    <label className="form-check-label" htmlFor="rememberMe">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none p-0"
                  >
                    Forgot Password?
                  </button>
                </div>
                

                {/* Login Button */}
                <button
                  type="button"
                  className="btn btn-primary w-100 py-2 mb-3"
                  onClick={() => {
                    console.log('Attempting login with credentials:', loginCredentials);
                    axios.post('http://localhost:8000/api/public/auth/login/', loginCredentials)
                      .then(response => {
                        console.log('Login successful:', response.data);
                        localStorage.setItem('token', response.data.access);
                        localStorage.setItem('refresh', response.data.refresh);
                        window.location.href = '/home';
                      })
                      .catch(error => {
                        console.error('Login failed:', error);
                      });
                  }}
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Sign In
                </button>

                {/* Alternative Login Methods */}
                
                {/* <div className="text-center">
                  <div className="mb-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-lg py-3 px-5"
                    >
                      <i className="bi bi-fingerprint fs-1 d-block mb-2"></i>
                      Scan Fingerprint
                    </button>
                  </div>
                  <p className="text-muted small">
                    Place your finger on the scanner to authenticate
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="mb-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-lg py-3 px-5"
                    >
                      <i className="bi bi-credit-card fs-1 d-block mb-2"></i>
                      Insert Smart Card
                    </button>
                  </div>
                  <p className="text-muted small">
                    Insert your smart card into the reader
                  </p>
                </div> */}
              </form>
            </>
            
            <div className="row mt-4 g-3">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <i className="bi bi-shield-lock text-primary fs-4 mb-2"></i>
                    <h6 className="fw-bold mb-1">Secure Access</h6>
                    <small className="text-muted">Military-grade encryption</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <i className="bi bi-clock-history text-primary fs-4 mb-2"></i>
                    <h6 className="fw-bold mb-1">Session Timeout</h6>
                    <small className="text-muted">Auto-logout after 30 mins</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <i className="bi bi-journal-text text-primary fs-4 mb-2"></i>
                    <h6 className="fw-bold mb-1">Audit Trail</h6>
                    <small className="text-muted">All actions are logged</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="text-center mt-4">
              <div className="alert alert-warning py-2 mb-0" style={{ fontSize: '0.9rem' }}>
                <i className="bi bi-exclamation-triangle me-2"></i>
                This system is for authorized personnel only. All access is monitored.
              </div>
            </div>

            {/* System Status */}
            <div className="mt-3 d-flex justify-content-between align-items-center small text-muted">
              <span>
                <i className="bi bi-shield-check text-success me-1"></i>
                System Secure
              </span>
              <span>
                <i className="bi bi-clock me-1"></i>
                Last Audit: Today 02:00
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;