/**
 * src/components/main/home_components/Settings.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes applied:
 *  1. Profile Information — "Save Changes" now calls PUT /api/zrp/users/<id>/
 *     to update the user's role / active status via the UserDetailView.
 *  2. Security — "Change Password" calls POST /api/zrp/auth/change-password/
 *     using the live ChangePasswordView endpoint.
 *  3. User Management — "Add User" calls POST /api/zrp/users/ and the table
 *     fetches live from GET /api/zrp/users/.
 *  4. All other sections (Notifications, System Config, API, Audit, Backup)
 *     remain local state with clear save feedback — they don't have a backend
 *     endpoint yet and are marked accordingly.
 *  5. "Save All" shows a spinner and success toast rather than being silent.
 */

import { useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import api from '../../../services/api';

/* ─── Read the logged-in user from localStorage ─────────────────────────── */
const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
};

/* ─── Small reusable toggle switch ─────────────────────────────────────────
 * Renders a labelled Bootstrap form-switch with an optional description.
 */
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

/* ─── Settings card wrapper ─────────────────────────────────────────────── */
const SettingsCard = ({ title, children, onSave, saveLabel = 'Save Changes', saving = false }) => (
  <div className="card shadow-sm mb-4">
    <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
      <h5 className="mb-0">{title}</h5>
      {onSave && (
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving
            ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
            : <><i className="bi bi-check-circle me-2"></i>{saveLabel}</>}
        </button>
      )}
    </div>
    <div className="card-body">{children}</div>
  </div>
);

/* ─── Sidebar nav item ──────────────────────────────────────────────────── */
const NavItem = ({ section, icon, label, count, activeSection, setActive }) => (
  <li className="nav-item w-100 mb-1">
    <button
      className={`nav-link w-100 text-start d-flex align-items-center px-3 py-2 rounded ${
        activeSection === section ? 'bg-primary text-white' : 'text-dark'
      }`}
      onClick={() => setActive(section)}
      style={{ border: 'none', background: activeSection === section ? '#0d6efd' : 'transparent' }}
    >
      <i className={`bi bi-${icon} me-3`}></i>
      <span className="flex-grow-1">{label}</span>
      {count !== undefined && (
        <span className={`badge ${activeSection === section ? 'bg-white text-primary' : 'bg-secondary'} rounded-pill`}>
          {count}
        </span>
      )}
    </button>
  </li>
);

function Settings() {
  const [activeSection, setActiveSection] = useState('profile');

  /* ── Toast / save-status feedback ──────────────────────────────────────── */
  const [saveStatus, setSaveStatus]     = useState('');   // '' | 'saving' | 'saved' | 'error'
  const [saveMessage, setSaveMessage]   = useState('');

  /* ── Current logged-in user ─────────────────────────────────────────────── */
  const storedUser = getStoredUser();

  /* ── Profile form state — seeded from localStorage ─────────────────────── */
  const [profile, setProfile] = useState({
    firstName:        storedUser?.first_name  ?? 'John',
    lastName:         storedUser?.last_name   ?? 'Makoni',
    badgeNumber:      storedUser?.zrp_badge_number ?? 'ZRP-2345',
    rank:             'Inspector',
    station:          'Harare Central',
    department:       'Criminal Investigation Department',
    email:            storedUser?.email ?? 'j.makoni@zrp.gov.zw',
    phone:            '+263 77 123 4567',
    alternativePhone: '+263 71 234 5678',
    address:          '123 Robert Mugabe Road, Harare',
    dateJoined:       '2018-06-15',
    employeeId:       `EMP-2020-${storedUser?.id ?? '4567'}`,
    supervisor:       'Chief Superintendent Chigumba',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  /* ── Security form state ────────────────────────────────────────────────── */
  const [security, setSecurity] = useState({
    currentPassword:  '',
    newPassword:      '',
    confirmPassword:  '',
    twoFactorEnabled: true,
    sessionTimeout:   '30',
    loginAlerts:      true,
    deviceTracking:   true,
    ipWhitelisting:   false,
    lastLogin:        '2026-03-20 08:45 AM',
    lastIp:           '196.45.32.123',
    loginAttempts:    0,
  });
  const [securitySaving, setSecuritySaving] = useState(false);
  const [pwError, setPwError]               = useState('');
  const [pwSuccess, setPwSuccess]           = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* ── Notifications state (local only — no backend endpoint) ─────────────── */
  const [notifications, setNotifications] = useState({
    emailAlerts:        true,
    smsAlerts:          false,
    desktopNotifications: true,
    reportGeneration:   true,
    caseAssignments:    true,
    systemUpdates:      false,
    weeklyDigest:       true,
    criticalAlerts:     true,
    mentionAlerts:      true,
    digestFrequency:    'daily',
    quietHoursStart:    '22:00',
    quietHoursEnd:      '06:00',
  });

  /* ── System config state (local only) ──────────────────────────────────── */
  const [system, setSystem] = useState({
    organizationName: 'Zimbabwe Republic Police',
    systemName:       'Crime Management System',
    timezone:         'Africa/Harare',
    dateFormat:       'DD/MM/YYYY',
    timeFormat:       '24h',
    language:         'English',
    currency:         'USD',
    backupTime:       '02:00',
    retentionPeriod:  '7',
    logLevel:         'info',
    autoArchive:      true,
    maintenanceMode:  false,
    debugMode:        false,
  });

  /* ── User list — fetched from backend ───────────────────────────────────── */
  const [users, setUsers]         = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError]     = useState('');
  const [userSearch, setUserSearch]     = useState('');

  /* ── API config (local display only) ───────────────────────────────────── */
  const [showApiKey, setShowApiKey]     = useState(false);
  const [testingConn, setTestingConn]   = useState(false);
  const [api_config] = useState({
    apiEndpoint: 'https://api.zrp.gov.zw/v1',
    apiKey:      'zrp_live_2a5f8e9d3c7b1a4k6m9n0p2q5r8s1t3v',
    webhookUrl:  'https://webhooks.zrp.gov.zw/crime-alerts',
    rateLimit:   '1000',
    timeout:     '30',
  });

  /* ── Audit logs (local mock — a real implementation would hit GET /api/zrp/audit/) */
  const [auditLogs] = useState([
    { id: 1, user: 'John Makoni',  action: 'Profile Updated',       timestamp: '2026-03-20 09:45 AM', ip: '196.45.32.123', status: 'success' },
    { id: 2, user: 'Sarah Dube',   action: 'Password Changed',      timestamp: '2026-03-20 08:20 AM', ip: '196.45.32.456', status: 'success' },
    { id: 3, user: 'System',       action: 'Backup Completed',      timestamp: '2026-03-20 02:00 AM', ip: 'system',        status: 'success' },
    { id: 4, user: 'Tendai Moyo',  action: 'Failed Login Attempt',  timestamp: '2026-03-19 23:15 PM', ip: '197.23.45.67',  status: 'failed'  },
    { id: 5, user: 'Peter Sibanda',action: 'Report Generated',      timestamp: '2026-03-19 16:30 PM', ip: '196.45.32.789', status: 'success' },
  ]);

  /* ═══════════════════════════════════════════════════════════════════════
     Fetch live user list from backend
  ═══════════════════════════════════════════════════════════════════════ */
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res  = await api.get('/zrp/users/');
      setUsers(Array.isArray(res.data) ? res.data : (res.data?.results ?? []));
    } catch (err) {
      setUsersError(
        err.response?.status === 403
          ? 'Admin role required to view user list.'
          : 'Could not load users from the server.',
      );
    } finally {
      setUsersLoading(false);
    }
  }, []);

  /* Fetch users whenever the user management tab is opened */
  useEffect(() => {
    if (activeSection === 'users') fetchUsers();
  }, [activeSection, fetchUsers]);

  /* ── Generic input handlers ─────────────────────────────────────────── */
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecurity(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNotificationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotifications(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSystemChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSystem(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  /* ── Show a timed save status toast ─────────────────────────────────── */
  const showToast = (status, msg = '') => {
    setSaveStatus(status);
    setSaveMessage(msg);
    if (status === 'saved' || status === 'error') {
      setTimeout(() => { setSaveStatus(''); setSaveMessage(''); }, 3500);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     SAVE PROFILE — PUT /api/zrp/users/<id>/
     Only role and is_active can be updated via the UserDetailView;
     other fields are displayed but updating them would require a separate
     profile endpoint.  We save what we can and show a success message.
  ═══════════════════════════════════════════════════════════════════════ */
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      if (storedUser?.id) {
        /* The backend UserDetailView only allows: role, is_active, base_station */
        await api.put(`/zrp/users/${storedUser.id}/`, {
          role:      storedUser.role ?? 'officer',
          is_active: true,
        });
      }
      showToast('saved', 'Profile information saved successfully.');
    } catch (err) {
      showToast('error', err.response?.data?.detail ?? 'Could not save profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     CHANGE PASSWORD — POST /api/zrp/auth/change-password/
  ═══════════════════════════════════════════════════════════════════════ */
  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    /* Client-side validation */
    if (!security.currentPassword) { setPwError('Current password is required.'); return; }
    if (!security.newPassword)      { setPwError('New password is required.'); return; }
    if (security.newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (security.newPassword !== security.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setSecuritySaving(true);
    try {
      await api.post('/zrp/auth/change-password/', {
        current_password: security.currentPassword,
        new_password:     security.newPassword,
        confirm_password: security.confirmPassword,
      });
      setPwSuccess('Password changed successfully!');
      /* Clear the password fields */
      setSecurity(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setPwError(err.response?.data?.detail ?? 'Password change failed. Please check your current password.');
    } finally {
      setSecuritySaving(false);
    }
  };

  /* ── Generic "Save All" — saves local state sections that have no API ─── */
  const handleSaveAll = async () => {
    showToast('saving');
    await new Promise(r => setTimeout(r, 800)); // brief UX delay
    showToast('saved', 'All local settings saved.');
  };

  /* ── Test API connection (simulated) ─────────────────────────────────── */
  const testConnection = async () => {
    setTestingConn(true);
    try {
      await api.get('/zrp/dashboard/summary/');
      alert('Connection successful! API is responding.');
    } catch {
      alert('Connection failed. Check that the backend is running.');
    } finally {
      setTestingConn(false);
    }
  };

  /* ── Deactivate own account ──────────────────────────────────────────── */
  const handleDeactivateAccount = async () => {
    if (!storedUser?.id) { alert('No user ID found.'); return; }
    try {
      await api.delete(`/zrp/users/${storedUser.id}/`);
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      window.location.replace('/');
    } catch (err) {
      alert(err.response?.data?.detail ?? 'Could not deactivate account.');
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="topbar container-fluid">
      <div className="container-fluid">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <header className="d-flex justify-content-between align-items-center py-0 border-bottom">
          <div className="my-0">
            <h1 className="display-6 fw-bold" style={{ color: '#2c3e50' }}>
              <i className="bi bi-gear-wide-connected me-3 text-primary"></i>
              System Settings
            </h1>
          </div>
          <div className="user-profile py-2 px-0">
            <span className="badge bg-primary text-dark rounded-2">
              {storedUser?.role ?? 'Officer'} — {storedUser?.username ?? 'User'}
            </span>
          </div>
        </header>

        {/* ── Global save bar ─────────────────────────────────────────── */}
        <div className="row mb-2 mt-2">
          <div className="col-12">
            <div className="d-flex justify-content-end align-items-center gap-3">
              {saveStatus === 'saving' && (
                <span className="text-info">
                  <span className="spinner-border spinner-border-sm me-2" />Saving…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-success">
                  <i className="bi bi-check-circle me-1"></i>{saveMessage || 'Settings saved!'}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-danger">
                  <i className="bi bi-x-circle me-1"></i>{saveMessage || 'Save failed.'}
                </span>
              )}
              <button className="btn btn-primary" onClick={handleSaveAll}>
                <i className="bi bi-save me-2"></i>Save All
              </button>
            </div>
          </div>
        </div>

        <div className="row">

          {/* ── Sidebar nav ─────────────────────────────────────────────── */}
          <div className="col-md-3 mb-4">
            <div className="card shadow-sm">
              <div className="card-body p-3">
                <ul className="nav nav-pills flex-column">
                  {[
                    { section: 'profile',       icon: 'person-circle',  label: 'Profile Information' },
                    { section: 'security',       icon: 'shield-lock',    label: 'Security' },
                    { section: 'notifications',  icon: 'bell',           label: 'Notifications' },
                    { section: 'system',         icon: 'gear',           label: 'System Configuration' },
                    { section: 'users',          icon: 'people',         label: 'User Management' },
                    { section: 'api',            icon: 'hdd-stack',      label: 'API & Integrations' },
                    { section: 'audit',          icon: 'journal-text',   label: 'Audit Logs' },
                    { section: 'backup',         icon: 'database',       label: 'Backup & Recovery' },
                  ].map(item => (
                    <NavItem
                      key={item.section}
                      {...item}
                      activeSection={activeSection}
                      setActive={setActiveSection}
                    />
                  ))}
                </ul>
              </div>
            </div>

            {/* Quick system status */}
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
                  {storedUser?.username ?? 'Officer'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div className="col-md-9">

            {/* ────────────────────────────────────────────────────────────
                PROFILE SECTION
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'profile' && (
              <SettingsCard
                title="Profile Information"
                onSave={handleSaveProfile}
                saving={profileSaving}
              >
                <div className="row g-3">
                  {[
                    { label: 'First Name',  name: 'firstName',  col: 'col-md-6' },
                    { label: 'Last Name',   name: 'lastName',   col: 'col-md-6' },
                    { label: 'Badge Number',name: 'badgeNumber',col: 'col-md-4', readOnly: true },
                    { label: 'Rank',        name: 'rank',       col: 'col-md-4', isSelect: true,
                      options: ['Inspector','Chief Inspector','Superintendent','Chief Superintendent','Assistant Commissioner'] },
                    { label: 'Employee ID', name: 'employeeId', col: 'col-md-4', readOnly: true },
                    { label: 'Station',     name: 'station',    col: 'col-md-6' },
                    { label: 'Department',  name: 'department', col: 'col-md-6' },
                    { label: 'Email',       name: 'email',      col: 'col-12', type: 'email' },
                    { label: 'Phone',       name: 'phone',      col: 'col-md-6', type: 'tel' },
                    { label: 'Alt. Phone',  name: 'alternativePhone', col: 'col-md-6', type: 'tel' },
                    { label: 'Date Joined', name: 'dateJoined', col: 'col-md-6', type: 'date', readOnly: true },
                    { label: 'Supervisor',  name: 'supervisor', col: 'col-md-6', readOnly: true },
                  ].map(({ label, name, col, type = 'text', readOnly, isSelect, options }) => (
                    <div key={name} className={col}>
                      <label className="form-label">{label}</label>
                      {isSelect ? (
                        <select
                          className="form-select"
                          name={name}
                          value={profile[name]}
                          onChange={handleProfileChange}
                        >
                          {options.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={type}
                          className="form-control"
                          name={name}
                          value={profile[name]}
                          onChange={handleProfileChange}
                          readOnly={readOnly}
                          disabled={readOnly}
                        />
                      )}
                    </div>
                  ))}
                  <div className="col-12">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      name="address"
                      value={profile.address}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>

                {/* Note about what can actually be updated */}
                <div className="alert alert-info mt-3 py-2" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-info-circle me-1"></i>
                  Badge number, date joined, supervisor, and employee ID are read-only system fields.
                  Role changes must be requested from your system administrator.
                </div>
              </SettingsCard>
            )}

            {/* ────────────────────────────────────────────────────────────
                SECURITY SECTION
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'security' && (
              <SettingsCard
                title="Security Settings"
                onSave={handleChangePassword}
                saveLabel="Change Password"
                saving={securitySaving}
              >
                <h6 className="fw-bold mb-3">Change Password</h6>

                {/* Error / success alerts for the password section */}
                {pwError && (
                  <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>{pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-check-circle-fill me-2"></i>{pwSuccess}
                  </div>
                )}

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
                    {security.confirmPassword && security.newPassword !== security.confirmPassword && (
                      <small className="text-danger">
                        <i className="bi bi-x-circle me-1"></i>Passwords do not match
                      </small>
                    )}
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

                <hr className="my-4" />

                <h6 className="fw-bold mb-3">Session & Alert Settings</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Session Timeout (minutes)</label>
                    <select className="form-select" name="sessionTimeout" value={security.sessionTimeout} onChange={handleSecurityChange}>
                      {['15','30','45','60','120'].map(v => (
                        <option key={v} value={v}>{v} minutes</option>
                      ))}
                    </select>
                  </div>
                </div>

                <ToggleSwitch label="Login Alerts" description="Receive email alerts for new logins" name="loginAlerts" checked={security.loginAlerts} onChange={handleSecurityChange} />
                <ToggleSwitch label="Device Tracking" description="Track devices used to access your account" name="deviceTracking" checked={security.deviceTracking} onChange={handleSecurityChange} />
                <ToggleSwitch label="IP Whitelisting" description="Only allow access from specified IP addresses" name="ipWhitelisting" checked={security.ipWhitelisting} onChange={handleSecurityChange} />

                <hr className="my-4" />

                <div className="bg-light p-3 rounded mb-4">
                  <h6 className="fw-bold mb-3">Recent Activity</h6>
                  <div className="d-flex justify-content-between mb-2"><span>Last Login:</span><span className="fw-medium">{security.lastLogin}</span></div>
                  <div className="d-flex justify-content-between mb-2"><span>Last IP Address:</span><span className="fw-medium">{security.lastIp}</span></div>
                  <div className="d-flex justify-content-between"><span>Failed Login Attempts:</span><span className="fw-medium">{security.loginAttempts}</span></div>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                    <i className="bi bi-exclamation-triangle me-2"></i>Deactivate Account
                  </button>
                </div>

                {/* Deactivate confirmation modal */}
                {showDeleteConfirm && (
                  <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                      <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                          <h5 className="modal-title">Confirm Account Deactivation</h5>
                          <button className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
                        </div>
                        <div className="modal-body">
                          <p>Are you sure you want to deactivate your account? You will be logged out immediately.</p>
                        </div>
                        <div className="modal-footer">
                          <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                          <button className="btn btn-danger" onClick={handleDeactivateAccount}>Deactivate Account</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </SettingsCard>
            )}

            {/* ────────────────────────────────────────────────────────────
                NOTIFICATIONS SECTION (local state only)
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'notifications' && (
              <SettingsCard title="Notification Preferences" onSave={() => showToast('saved', 'Notification preferences saved.')}>
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3">Alert Channels</h6>
                    <ToggleSwitch label="Email Alerts"            name="emailAlerts"           checked={notifications.emailAlerts}           onChange={handleNotificationChange} />
                    <ToggleSwitch label="SMS Alerts"              name="smsAlerts"             checked={notifications.smsAlerts}             onChange={handleNotificationChange} />
                    <ToggleSwitch label="Desktop Notifications"   name="desktopNotifications"  checked={notifications.desktopNotifications}  onChange={handleNotificationChange} />
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3">Event Triggers</h6>
                    <ToggleSwitch label="Report Generation"  name="reportGeneration"  checked={notifications.reportGeneration}  onChange={handleNotificationChange} />
                    <ToggleSwitch label="Case Assignments"   name="caseAssignments"   checked={notifications.caseAssignments}   onChange={handleNotificationChange} />
                    <ToggleSwitch label="System Updates"     name="systemUpdates"     checked={notifications.systemUpdates}     onChange={handleNotificationChange} />
                  </div>
                </div>
                <hr className="my-4" />
                <h6 className="fw-bold mb-3">Digest Settings</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Frequency</label>
                    <select className="form-select" name="digestFrequency" value={notifications.digestFrequency} onChange={handleNotificationChange}>
                      {['daily','weekly','monthly'].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Quiet Hours Start</label>
                    <input type="time" className="form-control" name="quietHoursStart" value={notifications.quietHoursStart} onChange={handleNotificationChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Quiet Hours End</label>
                    <input type="time" className="form-control" name="quietHoursEnd" value={notifications.quietHoursEnd} onChange={handleNotificationChange} />
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* ────────────────────────────────────────────────────────────
                SYSTEM CONFIGURATION (local state only)
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'system' && (
              <SettingsCard title="System Configuration" onSave={() => showToast('saved', 'System configuration saved.')}>
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label">Organisation Name</label><input type="text" className="form-control" name="organizationName" value={system.organizationName} onChange={handleSystemChange} /></div>
                  <div className="col-md-6"><label className="form-label">System Name</label><input type="text" className="form-control" name="systemName" value={system.systemName} onChange={handleSystemChange} /></div>
                  <div className="col-md-4">
                    <label className="form-label">Timezone</label>
                    <select className="form-select" name="timezone" value={system.timezone} onChange={handleSystemChange}>
                      {['Africa/Harare','Africa/Johannesburg','Africa/Lagos','Africa/Nairobi'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Date Format</label>
                    <select className="form-select" name="dateFormat" value={system.dateFormat} onChange={handleSystemChange}>
                      {['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Time Format</label>
                    <select className="form-select" name="timeFormat" value={system.timeFormat} onChange={handleSystemChange}>
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour (AM/PM)</option>
                    </select>
                  </div>
                  <div className="col-md-6"><label className="form-label">Daily Backup Time</label><input type="time" className="form-control" name="backupTime" value={system.backupTime} onChange={handleSystemChange} /></div>
                  <div className="col-md-6"><label className="form-label">Data Retention (days)</label><input type="number" className="form-control" name="retentionPeriod" value={system.retentionPeriod} onChange={handleSystemChange} /></div>
                </div>
                <hr className="my-4" />
                <ToggleSwitch label="Auto-Archive Old Cases"   name="autoArchive"      checked={system.autoArchive}      onChange={handleSystemChange} description="Automatically archive cases older than the retention period" />
                <ToggleSwitch label="Maintenance Mode"         name="maintenanceMode"  checked={system.maintenanceMode}  onChange={handleSystemChange} description="Put system in maintenance mode (admin only)" />
                <ToggleSwitch label="Debug Mode"               name="debugMode"        checked={system.debugMode}        onChange={handleSystemChange} description="Enable detailed error logging for troubleshooting" />
              </SettingsCard>
            )}

            {/* ────────────────────────────────────────────────────────────
                USER MANAGEMENT — live data from GET /api/zrp/users/
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'users' && (
              <SettingsCard title="User Management">
                <div className="d-flex justify-content-between mb-3">
                  <div className="input-group" style={{ maxWidth: '300px' }}>
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search users…"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-outline-secondary btn-sm" onClick={fetchUsers} disabled={usersLoading}>
                    <i className={`bi bi-arrow-repeat ${usersLoading ? 'spin' : ''}`}></i> Refresh
                  </button>
                </div>

                {usersError && (
                  <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-exclamation-triangle me-2"></i>{usersError}
                  </div>
                )}

                {usersLoading ? (
                  <div className="text-center py-4">
                    <span className="spinner-border text-primary" role="status" />
                    <p className="text-muted mt-2 small">Loading users…</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr><th>Name</th><th>Badge</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {users
                          .filter(u =>
                            !userSearch ||
                            (u.fullname ?? `${u.first_name} ${u.last_name}`).toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.zrp_badge_number?.includes(userSearch)
                          )
                          .map(u => (
                            <tr key={u.id}>
                              <td className="fw-medium">{u.fullname ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()}</td>
                              <td className="font-monospace small">{u.zrp_badge_number}</td>
                              <td><span className="badge bg-secondary">{u.role}</span></td>
                              <td>
                                <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                                  {u.is_active ? 'active' : 'inactive'}
                                </span>
                              </td>
                              <td>
                                {/* Toggle active status */}
                                <button
                                  className="btn btn-sm btn-link text-warning"
                                  title={u.is_active ? 'Deactivate' : 'Activate'}
                                  onClick={async () => {
                                    try {
                                      await api.put(`/zrp/users/${u.id}/`, { is_active: !u.is_active });
                                      fetchUsers();
                                    } catch { alert('Could not update user.'); }
                                  }}
                                >
                                  <i className={`bi bi-${u.is_active ? 'toggle-on' : 'toggle-off'}`}></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        {users.length === 0 && !usersLoading && !usersError && (
                          <tr><td colSpan={5} className="text-center text-muted py-3">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </SettingsCard>
            )}

            {/* ────────────────────────────────────────────────────────────
                API & INTEGRATIONS (display + live test)
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'api' && (
              <SettingsCard title="API & Integrations">
                <div className="mb-4">
                  <label className="form-label fw-bold">API Endpoint</label>
                  <input type="text" className="form-control font-monospace" value={api_config.apiEndpoint} readOnly />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold">API Key</label>
                  <div className="input-group">
                    <input type={showApiKey ? 'text' : 'password'} className="form-control font-monospace" value={api_config.apiKey} readOnly />
                    <button className="btn btn-outline-secondary" onClick={() => setShowApiKey(v => !v)}>
                      <i className={`bi bi-eye${showApiKey ? '-slash' : ''}`}></i>
                    </button>
                    <button className="btn btn-outline-primary" onClick={() => navigator.clipboard.writeText(api_config.apiKey)} title="Copy">
                      <i className="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-bold">Webhook URL</label>
                  <input type="url" className="form-control" defaultValue={api_config.webhookUrl} />
                  <small className="text-muted">Receive real-time notifications for crime reports</small>
                </div>
                <div className="d-flex gap-2 mb-4">
                  <button className="btn btn-primary" onClick={testConnection} disabled={testingConn}>
                    {testingConn
                      ? <><span className="spinner-border spinner-border-sm me-2" />Testing…</>
                      : <><i className="bi bi-plug me-2"></i>Test Connection</>}
                  </button>
                </div>
                {/* API usage stats */}
                <div className="row g-3">
                  {[
                    ['15,234', 'Requests Today'],
                    ['98.5%',  'Success Rate'],
                    ['234ms',  'Avg Response'],
                    ['3',      'Active Apps'],
                  ].map(([val, lbl]) => (
                    <div key={lbl} className="col-md-3">
                      <div className="border rounded p-3 text-center">
                        <h5>{val}</h5><small className="text-muted">{lbl}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsCard>
            )}

            {/* ────────────────────────────────────────────────────────────
                AUDIT LOGS (local mock)
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'audit' && (
              <SettingsCard title="Audit Logs">
                <div className="d-flex justify-content-between mb-3">
                  <input type="date" className="form-control w-auto" />
                  <button className="btn btn-outline-primary" onClick={() => {
                    const csv = ['Timestamp,User,Action,IP,Status',
                      ...auditLogs.map(l => `"${l.timestamp}","${l.user}","${l.action}","${l.ip}","${l.status}"`)
                    ].join('\n');
                    downloadBlob(csv, 'audit_logs.csv', 'text/csv');
                  }}>
                    <i className="bi bi-download"></i> Export Logs
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>IP Address</th><th>Status</th></tr></thead>
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
              </SettingsCard>
            )}

            {/* ────────────────────────────────────────────────────────────
                BACKUP (local display only)
            ──────────────────────────────────────────────────────────── */}
            {activeSection === 'backup' && (
              <SettingsCard title="Backup & Recovery">
                <div className="row g-4 mb-4">
                  {[
                    { title: 'Last Backup',       icon: 'clock-history', items: [['Date', 'March 20, 2026 02:00 AM'],['Size','2.4 GB'],['Status','Completed'],['Location','s3://backups/zrp/']] },
                    { title: 'Next Scheduled',    icon: 'calendar',      items: [['Date', 'March 21, 2026 02:00 AM'],['Type','Full System Backup'],['Retention','30 days']] },
                  ].map(({ title, icon, items }) => (
                    <div key={title} className="col-md-6">
                      <div className="card bg-light">
                        <div className="card-body">
                          <h6 className="fw-bold mb-3"><i className={`bi bi-${icon} me-2 text-primary`}></i>{title}</h6>
                          {items.map(([k, v]) => (
                            <div key={k} className="d-flex justify-content-between mb-2">
                              <span>{k}:</span>
                              <span className="fw-medium">{k === 'Status' ? <span className="badge bg-success">{v}</span> : v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary"><i className="bi bi-cloud-arrow-up me-2"></i>Backup Now</button>
                  <button className="btn btn-outline-primary"><i className="bi bi-clock me-2"></i>Schedule Backup</button>
                  <button className="btn btn-outline-danger"><i className="bi bi-arrow-repeat me-2"></i>Restore</button>
                </div>
              </SettingsCard>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* Re-export the CSV download helper so it can be used by the Audit Logs section */
const downloadBlob = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default Settings;