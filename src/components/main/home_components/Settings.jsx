// function Settings() {
//     return (
//         <div class="settings-container">
//             <h2 class="text-center">Settings</h2>
//             <p class="text-center">This section is under construction. Please check back later for updates.</p>
//         </div>
//     );
// }

// export default Settings;

import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function Settings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [saveStatus, setSaveStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // User Profile State
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Makoni',
    badgeNumber: 'ZRP-2345',
    rank: 'Inspector',
    station: 'Harare Central',
    department: 'Criminal Investigation Department',
    email: 'j.makoni@zrp.gov.zw',
    phone: '+263 77 123 4567',
    alternativePhone: '+263 71 234 5678',
    address: '123 Robert Mugabe Road, Harare',
    dateJoined: '2018-06-15',
    employeeId: 'EMP-2020-4567',
    supervisor: 'Chief Superintendent Chigumba'
  });

  // Account Security State
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: true,
    sessionTimeout: '30',
    loginAlerts: true,
    deviceTracking: true,
    ipWhitelisting: false,
    lastLogin: '2026-03-20 08:45 AM',
    lastIp: '196.45.32.123',
    loginAttempts: 0
  });

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    desktopNotifications: true,
    reportGeneration: true,
    caseAssignments: true,
    systemUpdates: false,
    weeklyDigest: true,
    criticalAlerts: true,
    mentionAlerts: true,
    digestFrequency: 'daily',
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00'
  });

  // System Configuration
  const [system, setSystem] = useState({
    organizationName: 'Zimbabwe Republic Police',
    systemName: 'Crime Management System',
    timezone: 'Africa/Harare',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    language: 'English',
    currency: 'USD',
    fiscalYearStart: '01-01',
    backupTime: '02:00',
    retentionPeriod: '7',
    logLevel: 'info',
    autoArchive: true,
    maintenanceMode: false,
    debugMode: false
  });

  // User Management
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'John Makoni',
      email: 'j.makoni@zrp.gov.zw',
      role: 'Administrator',
      status: 'active',
      lastActive: '2026-03-20 09:30 AM',
      department: 'CID',
      badge: 'ZRP-2345'
    },
    {
      id: 2,
      name: 'Sarah Dube',
      email: 's.dube@zrp.gov.zw',
      role: 'Investigating Officer',
      status: 'active',
      lastActive: '2026-03-20 08:15 AM',
      department: 'General Duties',
      badge: 'ZRP-7890'
    },
    {
      id: 3,
      name: 'Tendai Moyo',
      email: 't.moyo@zrp.gov.zw',
      role: 'Data Analyst',
      status: 'active',
      lastActive: '2026-03-19 16:45 PM',
      department: 'Statistics',
      badge: 'ZRP-1234'
    },
    {
      id: 4,
      name: 'Peter Sibanda',
      email: 'p.sibanda@zrp.gov.zw',
      role: 'Supervisor',
      status: 'inactive',
      lastActive: '2026-03-18 11:20 AM',
      department: 'Operations',
      badge: 'ZRP-5678'
    },
    {
      id: 5,
      name: 'Grace Ndlovu',
      email: 'g.ndlovu@zrp.gov.zw',
      role: 'Records Officer',
      status: 'active',
      lastActive: '2026-03-20 10:00 AM',
      department: 'Records',
      badge: 'ZRP-9012'
    }
  ]);

  // API Configuration
  const [api, setApi] = useState({
    apiEndpoint: 'https://api.zrp.gov.zw/v1',
    apiKey: 'zrp_live_2a5f8e9d3c7b1a4k6m9n0p2q5r8s1t3v',
    apiSecret: '••••••••••••••••••••••••••••••••',
    webhookUrl: 'https://webhooks.zrp.gov.zw/crime-alerts',
    rateLimit: '1000',
    timeout: '30'
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, user: 'John Makoni', action: 'Profile Updated', timestamp: '2026-03-20 09:45 AM', ip: '196.45.32.123', status: 'success' },
    { id: 2, user: 'Sarah Dube', action: 'Password Changed', timestamp: '2026-03-20 08:20 AM', ip: '196.45.32.456', status: 'success' },
    { id: 3, user: 'System', action: 'Backup Completed', timestamp: '2026-03-20 02:00 AM', ip: 'system', status: 'success' },
    { id: 4, user: 'Tendai Moyo', action: 'Failed Login Attempt', timestamp: '2026-03-19 23:15 PM', ip: '197.23.45.67', status: 'failed' },
    { id: 5, user: 'Peter Sibanda', action: 'Report Generated', timestamp: '2026-03-19 16:30 PM', ip: '196.45.32.789', status: 'success' }
  ]);

  // Handle profile updates
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle security updates
  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecurity(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // Handle notification updates
  const handleNotificationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotifications(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // Handle system updates
  const handleSystemChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSystem(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // Save settings
  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    }, 1500);
  };

  // Test API connection
  const testConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      alert('Connection successful! API is responding.');
    }, 2000);
  };

  // Generate new API key
  const generateApiKey = () => {
    if (window.confirm('Are you sure you want to generate a new API key? The old key will be invalidated.')) {
      const newKey = 'zrp_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setApi(prev => ({ ...prev, apiKey: newKey }));
      alert('New API key generated successfully!');
    }
  };

  // Sidebar Navigation Item
  const NavItem = ({ section, icon, label, count }) => (
    <li className="nav-item w-100 mb-1">
      <button 
        className={`nav-link w-100 text-start d-flex align-items-center px-3 py-2 rounded ${activeSection === section ? 'bg-primary text-white' : 'text-dark'}`}
        onClick={() => setActiveSection(section)}
        style={{ border: 'none', background: activeSection === section ? '#0d6efd' : 'transparent' }}
      >
        <i className={`bi bi-${icon} me-3`}></i>
        <span className="flex-grow-1">{label}</span>
        {count && (
          <span className={`badge ${activeSection === section ? 'bg-white text-primary' : 'bg-secondary'} rounded-pill`}>
            {count}
          </span>
        )}
      </button>
    </li>
  );

  // Settings Card Component
  const SettingsCard = ({ title, children, onSave }) => (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        {onSave && (
          <button className="btn btn-primary btn-sm" onClick={onSave}>
            <i className="bi bi-check-circle me-2"></i>
            Save Changes
          </button>
        )}
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );

  // Toggle Switch Component
  const ToggleSwitch = ({ label, name, checked, onChange, description }) => (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div>
        <label className="fw-medium mb-1">{label}</label>
        {description && <p className="small text-muted mb-0">{description}</p>}
      </div>
      <div className="form-check form-switch">
        <input 
          className="form-check-input" 
          type="checkbox" 
          name={name}
          checked={checked}
          onChange={onChange}
          style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
        />
      </div>
    </div>
  );

  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">
        {/* Header */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom">
            <div className='my-0'>
                <h1 className="display-6 fw-bold" style={{ color: '#2c3e50' }}>
                  <i className="bi bi-gear-wide-connected me-3 text-primary"></i>
                  System Settings
                </h1>
                {/* <p className="text-muted">Configure your system preferences and manage users</p> */}
            </div>
            <div className="user-profile py-2 px-0 ">
                <span className="badge bg-primary text-dark rounded-2">Admin User</span>
            </div>
        </header>

        <div className="row mb-2 mt-2">
          <div className="col-12">
            <div className="d-flex justify-content-end align-items-center">
              <div className="d-flex gap-2">
                {saveStatus === 'saving' && (
                  <span className="text-info">
                    <i className="bi bi-arrow-repeat spin me-2"></i>
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-success">
                    <i className="bi bi-check-circle me-2"></i>
                    Settings Saved!
                  </span>
                )}
                <button className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-repeat"></i> Reset
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                  <i className="bi bi-save me-2"></i>
                  Save All
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Settings Navigation Sidebar */}
          <div className="col-md-3 mb-4">
            <div className="card shadow-sm">
              <div className="card-body p-3">
                <ul className="nav nav-pills flex-column">
                  <NavItem section="profile" icon="person-circle" label="Profile Information" />
                  <NavItem section="security" icon="shield-lock" label="Security" />
                  <NavItem section="notifications" icon="bell" label="Notifications" />
                  <NavItem section="system" icon="gear" label="System Configuration" />
                  <NavItem section="users" icon="people" label="User Management" count={users.length} />
                  <NavItem section="api" icon="hdd-stack" label="API & Integrations" />
                  <NavItem section="audit" icon="journal-text" label="Audit Logs" />
                  <NavItem section="backup" icon="database" label="Backup & Recovery" />
                </ul>
              </div>
            </div>

            {/* Quick Status */}
            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <h6 className="mb-3">System Status</h6>
                <div className="d-flex align-items-center mb-2">
                  <span className="badge bg-success me-2">●</span>
                  <small>All systems operational</small>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <span className="badge bg-info me-2">●</span>
                  <small>Last backup: Today 02:00 AM</small>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge bg-warning me-2">●</span>
                  <small>Storage: 67% used</small>
                </div>
                <hr />
                <div className="small text-muted">
                  <i className="bi bi-person-circle me-2"></i>
                  Logged in as: Insp. John Makoni
                </div>
                <div className="small text-muted">
                  <i className="bi bi-clock me-2"></i>
                  Session expires in: 45 min
                </div>
              </div>
            </div>
          </div>

          {/* Settings Content Area */}
          <div className="col-md-9">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <>
                <SettingsCard title="Profile Information" onSave={handleSave}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="lastName"
                        value={profile.lastName}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Badge Number</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="badgeNumber"
                        value={profile.badgeNumber}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Rank</label>
                      <select className="form-select" name="rank" value={profile.rank} onChange={handleProfileChange}>
                        <option>Inspector</option>
                        <option>Chief Inspector</option>
                        <option>Superintendent</option>
                        <option>Chief Superintendent</option>
                        <option>Assistant Commissioner</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Employee ID</label>
                      <input type="text" className="form-control" value={profile.employeeId} readOnly disabled />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Station</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="station"
                        value={profile.station}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Department</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        name="department"
                        value={profile.department}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        name="email"
                        value={profile.email}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        name="phone"
                        value={profile.phone}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Alternative Phone</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        name="alternativePhone"
                        value={profile.alternativePhone}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Address</label>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        name="address"
                        value={profile.address}
                        onChange={handleProfileChange}
                      ></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date Joined</label>
                      <input type="date" className="form-control" value={profile.dateJoined} readOnly disabled />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Supervisor</label>
                      <input type="text" className="form-control" value={profile.supervisor} readOnly disabled />
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard title="Profile Picture">
                  <div className="d-flex align-items-center">
                    <div className="me-4">
                      <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '100px', height: '100px' }}>
                        <i className="bi bi-person-circle text-primary fs-1"></i>
                      </div>
                    </div>
                    <div>
                      <button className="btn btn-outline-primary me-2">
                        <i className="bi bi-upload"></i> Upload Photo
                      </button>
                      <button className="btn btn-outline-danger">
                        <i className="bi bi-trash"></i> Remove
                      </button>
                      <p className="small text-muted mt-2 mb-0">
                        Accepted formats: JPG, PNG. Max size: 2MB
                      </p>
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <SettingsCard title="Security Settings" onSave={handleSave}>
                <h6 className="fw-bold mb-3">Change Password</h6>
                <div className="row g-3 mb-4">
                  <div className="col-12">
                    <label className="form-label">Current Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="currentPassword"
                      value={security.currentPassword}
                      onChange={handleSecurityChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="newPassword"
                      value={security.newPassword}
                      onChange={handleSecurityChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Confirm Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      name="confirmPassword"
                      value={security.confirmPassword}
                      onChange={handleSecurityChange}
                    />
                  </div>
                </div>

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Two-Factor Authentication</h6>
                <ToggleSwitch 
                  label="Enable Two-Factor Authentication"
                  description="Add an extra layer of security to your account"
                  name="twoFactorEnabled"
                  checked={security.twoFactorEnabled}
                  onChange={handleSecurityChange}
                />

                {security.twoFactorEnabled && (
                  <div className="mt-3 p-3 bg-light rounded">
                    <p className="small mb-2">
                      <i className="bi bi-info-circle me-2 text-info"></i>
                      Scan this QR code with your authenticator app
                    </p>
                    <div className="text-center">
                      <div className="bg-white d-inline-block p-3 rounded">
                        <img src="/api/placeholder/150/150" alt="QR Code" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <code className="bg-white p-2 rounded d-block text-center">
                        ZRP-2345-JOHN-MAKONI-2FA-KEY-2026
                      </code>
                    </div>
                  </div>
                )}

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Session Settings</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Session Timeout (minutes)</label>
                    <select className="form-select" name="sessionTimeout" value={security.sessionTimeout} onChange={handleSecurityChange}>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                </div>

                <ToggleSwitch 
                  label="Login Alerts"
                  description="Receive email alerts for new logins"
                  name="loginAlerts"
                  checked={security.loginAlerts}
                  onChange={handleSecurityChange}
                />

                <ToggleSwitch 
                  label="Device Tracking"
                  description="Track and remember devices used to access your account"
                  name="deviceTracking"
                  checked={security.deviceTracking}
                  onChange={handleSecurityChange}
                />

                <ToggleSwitch 
                  label="IP Whitelisting"
                  description="Only allow access from specified IP addresses"
                  name="ipWhitelisting"
                  checked={security.ipWhitelisting}
                  onChange={handleSecurityChange}
                />

                <hr className="my-4" />

                <div className="bg-light p-3 rounded">
                  <h6 className="fw-bold mb-3">Recent Activity</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Last Login:</span>
                    <span className="fw-medium">{security.lastLogin}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Last IP Address:</span>
                    <span className="fw-medium">{security.lastIp}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Failed Login Attempts:</span>
                    <span className="fw-medium">{security.loginAttempts}</span>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="d-flex gap-2">
                  <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Deactivate Account
                  </button>
                  <button className="btn btn-outline-secondary">
                    <i className="bi bi-arrow-counterclockwise me-2"></i>
                    Reset All Security
                  </button>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                  <div className="modal show d-block" tabIndex="-1">
                    <div className="modal-dialog">
                      <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                          <h5 className="modal-title">Confirm Account Deactivation</h5>
                          <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
                        </div>
                        <div className="modal-body">
                          <p>Are you sure you want to deactivate your account? This action cannot be undone.</p>
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="confirmDelete" />
                            <label className="form-check-label" htmlFor="confirmDelete">
                              I understand that this will permanently disable my access
                            </label>
                          </div>
                        </div>
                        <div className="modal-footer">
                          <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                          <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(false)}>
                            Deactivate Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </SettingsCard>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <SettingsCard title="Notification Preferences" onSave={handleSave}>
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3">Alert Types</h6>
                    <ToggleSwitch 
                      label="Email Alerts"
                      name="emailAlerts"
                      checked={notifications.emailAlerts}
                      onChange={handleNotificationChange}
                    />
                    <ToggleSwitch 
                      label="SMS Alerts"
                      name="smsAlerts"
                      checked={notifications.smsAlerts}
                      onChange={handleNotificationChange}
                    />
                    <ToggleSwitch 
                      label="Desktop Notifications"
                      name="desktopNotifications"
                      checked={notifications.desktopNotifications}
                      onChange={handleNotificationChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3">Events</h6>
                    <ToggleSwitch 
                      label="Report Generation"
                      name="reportGeneration"
                      checked={notifications.reportGeneration}
                      onChange={handleNotificationChange}
                    />
                    <ToggleSwitch 
                      label="Case Assignments"
                      name="caseAssignments"
                      checked={notifications.caseAssignments}
                      onChange={handleNotificationChange}
                    />
                    <ToggleSwitch 
                      label="System Updates"
                      name="systemUpdates"
                      checked={notifications.systemUpdates}
                      onChange={handleNotificationChange}
                    />
                  </div>
                </div>

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Digest Settings</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Digest Frequency</label>
                    <select className="form-select" name="digestFrequency" value={notifications.digestFrequency} onChange={handleNotificationChange}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Quiet Hours Start</label>
                    <input type="time" className="form-control" name="quietHoursStart" value={notifications.quietHoursStart} onChange={handleNotificationChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Quiet Hours End</label>
                    <input type="time" className="form-control" name="quietHoursEnd" value={notifications.quietHoursEnd} onChange={handleNotificationChange} />
                  </div>
                </div>

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Critical Alerts</h6>
                <ToggleSwitch 
                  label="Critical Incident Alerts"
                  description="Immediate notifications for high-priority cases"
                  name="criticalAlerts"
                  checked={notifications.criticalAlerts}
                  onChange={handleNotificationChange}
                />
                <ToggleSwitch 
                  label="Mentions & Comments"
                  description="Get notified when someone mentions you"
                  name="mentionAlerts"
                  checked={notifications.mentionAlerts}
                  onChange={handleNotificationChange}
                />
                <ToggleSwitch 
                  label="Weekly Summary"
                  description="Receive a weekly digest of all activities"
                  name="weeklyDigest"
                  checked={notifications.weeklyDigest}
                  onChange={handleNotificationChange}
                />
              </SettingsCard>
            )}

            {/* System Configuration Section */}
            {activeSection === 'system' && (
              <SettingsCard title="System Configuration" onSave={handleSave}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Organization Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="organizationName"
                      value={system.organizationName}
                      onChange={handleSystemChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">System Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="systemName"
                      value={system.systemName}
                      onChange={handleSystemChange}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Timezone</label>
                    <select className="form-select" name="timezone" value={system.timezone} onChange={handleSystemChange}>
                      <option value="Africa/Harare">Africa/Harare</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                      <option value="Africa/Lagos">Africa/Lagos</option>
                      <option value="Africa/Nairobi">Africa/Nairobi</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Date Format</label>
                    <select className="form-select" name="dateFormat" value={system.dateFormat} onChange={handleSystemChange}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Time Format</label>
                    <select className="form-select" name="timeFormat" value={system.timeFormat} onChange={handleSystemChange}>
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour (AM/PM)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Language</label>
                    <select className="form-select" name="language" value={system.language} onChange={handleSystemChange}>
                      <option value="English">English</option>
                      <option value="Shona">Shona</option>
                      <option value="Ndebele">Ndebele</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Currency</label>
                    <select className="form-select" name="currency" value={system.currency} onChange={handleSystemChange}>
                      <option value="USD">USD ($)</option>
                      <option value="ZWL">ZWL (Z$)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Fiscal Year Start</label>
                    <input type="date" className="form-control" name="fiscalYearStart" value={system.fiscalYearStart} onChange={handleSystemChange} />
                  </div>
                </div>

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Maintenance Settings</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Daily Backup Time</label>
                    <input type="time" className="form-control" name="backupTime" value={system.backupTime} onChange={handleSystemChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Data Retention (days)</label>
                    <input type="number" className="form-control" name="retentionPeriod" value={system.retentionPeriod} onChange={handleSystemChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Log Level</label>
                    <select className="form-select" name="logLevel" value={system.logLevel} onChange={handleSystemChange}>
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>

                <ToggleSwitch 
                  label="Auto-Archive Old Cases"
                  description="Automatically archive cases older than retention period"
                  name="autoArchive"
                  checked={system.autoArchive}
                  onChange={handleSystemChange}
                />

                <ToggleSwitch 
                  label="Maintenance Mode"
                  description="Put system in maintenance mode (admin only)"
                  name="maintenanceMode"
                  checked={system.maintenanceMode}
                  onChange={handleSystemChange}
                />

                <ToggleSwitch 
                  label="Debug Mode"
                  description="Enable detailed error logging for troubleshooting"
                  name="debugMode"
                  checked={system.debugMode}
                  onChange={handleSystemChange}
                />
              </SettingsCard>
            )}

            {/* User Management Section */}
            {activeSection === 'users' && (
              <SettingsCard title="User Management">
                <div className="d-flex justify-content-between mb-3">
                  <div className="input-group" style={{ maxWidth: '300px' }}>
                    <span className="input-group-text">
                      <i className="bi bi-search"></i>
                    </span>
                    <input type="text" className="form-control" placeholder="Search users..." />
                  </div>
                  <button className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>
                    Add User
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Badge</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Last Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td className="fw-medium">{user.name}</td>
                          <td>{user.badge}</td>
                          <td>{user.email}</td>
                          <td>{user.role}</td>
                          <td>{user.department}</td>
                          <td>
                            <span className={`badge bg-${user.status === 'active' ? 'success' : 'secondary'}`}>
                              {user.status}
                            </span>
                          </td>
                          <td><small>{user.lastActive}</small></td>
                          <td>
                            <button className="btn btn-sm btn-link">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-link text-danger">
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-muted">Showing 5 of 5 users</small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className="page-item disabled"><a className="page-link" href="#">Previous</a></li>
                      <li className="page-item active"><a className="page-link" href="#">1</a></li>
                      <li className="page-item"><a className="page-link" href="#">2</a></li>
                      <li className="page-item"><a className="page-link" href="#">Next</a></li>
                    </ul>
                  </nav>
                </div>

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Role Management</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="card">
                      <div className="card-body">
                        <h6 className="fw-bold">Administrator</h6>
                        <p className="small text-muted">Full system access</p>
                        <small>3 users</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card">
                      <div className="card-body">
                        <h6 className="fw-bold">Supervisor</h6>
                        <p className="small text-muted">Manage cases and officers</p>
                        <small>5 users</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card">
                      <div className="card-body">
                        <h6 className="fw-bold">Investigator</h6>
                        <p className="small text-muted">Handle cases and reports</p>
                        <small>12 users</small>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* API & Integrations Section */}
            {activeSection === 'api' && (
              <SettingsCard title="API & Integrations" onSave={handleSave}>
                <div className="mb-4">
                  <label className="form-label fw-bold">API Endpoint</label>
                  <input type="text" className="form-control font-monospace" value={api.apiEndpoint} readOnly />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold">API Key</label>
                  <div className="input-group">
                    <input 
                      type={showApiKey ? "text" : "password"} 
                      className="form-control font-monospace" 
                      value={api.apiKey}
                      readOnly
                    />
                    <button className="btn btn-outline-secondary" onClick={() => setShowApiKey(!showApiKey)}>
                      <i className={`bi bi-eye${showApiKey ? '-slash' : ''}`}></i>
                    </button>
                    <button className="btn btn-outline-primary" onClick={() => navigator.clipboard.writeText(api.apiKey)}>
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold">API Secret</label>
                  <div className="input-group">
                    <input type="password" className="form-control font-monospace" value={api.apiSecret} readOnly />
                    <button className="btn btn-outline-primary" onClick={generateApiKey}>
                      <i className="bi bi-arrow-repeat"></i> Regenerate
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold">Webhook URL</label>
                  <input 
                    type="url" 
                    className="form-control" 
                    value={api.webhookUrl}
                    onChange={(e) => setApi({...api, webhookUrl: e.target.value})}
                  />
                  <small className="text-muted">Receive real-time notifications for crime reports</small>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Rate Limit (requests/minute)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={api.rateLimit}
                      onChange={(e) => setApi({...api, rateLimit: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Timeout (seconds)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={api.timeout}
                      onChange={(e) => setApi({...api, timeout: e.target.value})}
                    />
                  </div>
                </div>

                <div className="d-flex gap-2 mb-4">
                  <button className="btn btn-primary" onClick={testConnection} disabled={testingConnection}>
                    {testingConnection ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Testing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plug me-2"></i>
                        Test Connection
                      </>
                    )}
                  </button>
                  <button className="btn btn-outline-secondary">
                    <i className="bi bi-file-text me-2"></i>
                    View API Documentation
                  </button>
                </div>

                <hr />

                <h6 className="fw-bold mb-3">API Usage Statistics</h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="border rounded p-3 text-center">
                      <h5>15,234</h5>
                      <small className="text-muted">Requests Today</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="border rounded p-3 text-center">
                      <h5>98.5%</h5>
                      <small className="text-muted">Success Rate</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="border rounded p-3 text-center">
                      <h5>234ms</h5>
                      <small className="text-muted">Avg Response</small>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="border rounded p-3 text-center">
                      <h5>3</h5>
                      <small className="text-muted">Active Apps</small>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* Audit Logs Section */}
            {activeSection === 'audit' && (
              <SettingsCard title="Audit Logs">
                <div className="d-flex justify-content-between mb-3">
                  <div className="input-group" style={{ maxWidth: '300px' }}>
                    <span className="input-group-text">
                      <i className="bi bi-calendar"></i>
                    </span>
                    <input type="date" className="form-control" />
                  </div>
                  <button className="btn btn-outline-primary">
                    <i className="bi bi-download"></i> Export Logs
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>IP Address</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id}>
                          <td><small>{log.timestamp}</small></td>
                          <td className="fw-medium">{log.user}</td>
                          <td>{log.action}</td>
                          <td><small className="font-monospace">{log.ip}</small></td>
                          <td>
                            <span className={`badge bg-${log.status === 'success' ? 'success' : 'danger'}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-muted">Showing last 50 of 1,234 events</small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className="page-item"><a className="page-link" href="#">Previous</a></li>
                      <li className="page-item active"><a className="page-link" href="#">1</a></li>
                      <li className="page-item"><a className="page-link" href="#">2</a></li>
                      <li className="page-item"><a className="page-link" href="#">3</a></li>
                      <li className="page-item"><a className="page-link" href="#">Next</a></li>
                    </ul>
                  </nav>
                </div>
              </SettingsCard>
            )}

            {/* Backup & Recovery Section */}
            {activeSection === 'backup' && (
              <SettingsCard title="Backup & Recovery">
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-clock-history me-2 text-primary"></i>
                          Last Backup
                        </h6>
                        <div className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>Date:</span>
                            <span className="fw-medium">March 20, 2026 02:00 AM</span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>Size:</span>
                            <span className="fw-medium">2.4 GB</span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>Status:</span>
                            <span className="badge bg-success">Completed</span>
                          </div>
                        </div>
                        <div>
                          <div className="d-flex justify-content-between">
                            <span>Location:</span>
                            <span className="fw-medium">s3://backups/zrp/</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-calendar me-2 text-primary"></i>
                          Next Scheduled
                        </h6>
                        <div className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>Date:</span>
                            <span className="fw-medium">March 21, 2026 02:00 AM</span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>Type:</span>
                            <span className="fw-medium">Full System Backup</span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="d-flex justify-content-between">
                            <span>Retention:</span>
                            <span className="fw-medium">30 days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Backup History</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>2026-03-20 02:00</td>
                        <td>Full</td>
                        <td>2.4 GB</td>
                        <td><span className="badge bg-success">Success</span></td>
                        <td>
                          <button className="btn btn-sm btn-link">
                            <i className="bi bi-download"></i>
                          </button>
                          <button className="btn btn-sm btn-link">
                            <i className="bi bi-arrow-repeat"></i>
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>2026-03-19 02:00</td>
                        <td>Full</td>
                        <td>2.3 GB</td>
                        <td><span className="badge bg-success">Success</span></td>
                        <td>
                          <button className="btn btn-sm btn-link">
                            <i className="bi bi-download"></i>
                          </button>
                          <button className="btn btn-sm btn-link">
                            <i className="bi bi-arrow-repeat"></i>
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>2026-03-18 02:00</td>
                        <td>Incremental</td>
                        <td>456 MB</td>
                        <td><span className="badge bg-success">Success</span></td>
                        <td>
                          <button className="btn btn-sm btn-link">
                            <i className="bi bi-download"></i>
                          </button>
                          <button className="btn btn-sm btn-link">
                            <i className="bi bi-arrow-repeat"></i>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-primary">
                    <i className="bi bi-cloud-arrow-up me-2"></i>
                    Backup Now
                  </button>
                  <button className="btn btn-outline-primary">
                    <i className="bi bi-clock me-2"></i>
                    Schedule Backup
                  </button>
                  <button className="btn btn-outline-danger">
                    <i className="bi bi-arrow-repeat me-2"></i>
                    Restore
                  </button>
                </div>
              </SettingsCard>
            )}
          </div>
        </div>
      </div>

      {/* Add spinning animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Bootstrap Icons */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
    </div>
  );
}

export default Settings;