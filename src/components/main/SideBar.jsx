/**
 * src/components/main/SideBar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified sidebar for the ZimCrimeWatch ZRP dashboard.
 *
 * Changes from original:
 *  • Each menu item now has a Bootstrap Icon for visual clarity
 *  • Nav items are grouped under "Main Menu" and "Administration" section labels
 *  • The sidebar footer is completed — shows a user avatar (initials), full name,
 *    role badge, and a logout button
 *  • Active item styling uses the CSS variables defined in index.css
 *  • Text-transform/font sizing is handled entirely via index.css (.menu li)
 */

import logo from '/logo.jpg';

/* ── Icon map — each menu key maps to a Bootstrap Icon class ────────────── */
const ICON_MAP = {
  Dashboard:     'bi-speedometer2',
  RRB:           'bi-journal-text',
  CPM:           'bi-diagram-3',
  Analytics:     'bi-graph-up-arrow',
  Statistics:    'bi-bar-chart-line',
  Reports:       'bi-file-earmark-bar-graph',
  'Data Upload': 'bi-cloud-upload',
  'ML Training': 'bi-cpu',
  Settings:      'bi-gear',
};

/* ── Section groupings ──────────────────────────────────────────────────── */
const MAIN_ITEMS  = ['Dashboard', 'RRB', 'CPM', 'Analytics', 'Statistics', 'Reports'];
const ADMIN_ITEMS = ['Data Upload', 'ML Training', 'Settings'];

/* ── Friendly display labels (sidebar shows abbreviated names in the code,
      but the user should see the full name) ─────────────────────────────── */
const LABELS = {
  Dashboard:     'Dashboard',
  RRB:           'Report Record Book',
  CPM:           'Crime Profile Matcher',
  Analytics:     'Analytics',
  Statistics:    'Statistics',
  Reports:       'Reports',
  'Data Upload': 'Data Upload',
  'ML Training': 'ML Training',
  Settings:      'Settings',
};

/* ── Reusable nav item ──────────────────────────────────────────────────── */
function NavItem({ item, activeComponent, setActiveComponent }) {
  return (
    <li
      className={item === activeComponent ? 'active' : ''}
      onClick={() => setActiveComponent(item)}
      title={LABELS[item]}  /* tooltip for when labels are truncated */
    >
      {/* Bootstrap Icon */}
      <i className={`bi ${ICON_MAP[item] ?? 'bi-circle'}`}></i>
      {/* Display label */}
      <span style={{ fontSize: '0.78rem', fontWeight: item === activeComponent ? 600 : 500 }}>
        {LABELS[item]}
      </span>
    </li>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
function SideBar({ setActiveComponent, activeComponent }) {
  /* Read user info from localStorage — set by authService.login()        */
  const raw      = localStorage.getItem('user');
  const user     = raw ? JSON.parse(raw) : null;
  const username = user?.username ?? user?.zrp_badge_number ?? 'Officer';
  const role     = user?.role ?? 'user';

  /* Build avatar initials from username */
  const initials = username
    .split(/[\s._-]/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    window.location.replace('/');
  };

  return (
    <div className="sidebar col-2">

      {/* ── Logo / Branding ────────────────────────────────────────────── */}
      <div className="d-flex logo align-items-center">
        <img src={logo} alt="ZimCrimeWatch Logo" />
        <h1>Zim Crime Watch</h1>
      </div>

      {/* ── Main Menu ──────────────────────────────────────────────────── */}
      <p className="menu-section-label">Main Menu</p>
      <ul className="menu">
        {MAIN_ITEMS.map(item => (
          <NavItem
            key={item}
            item={item}
            activeComponent={activeComponent}
            setActiveComponent={setActiveComponent}
          />
        ))}
      </ul>

      {/* ── Administration ─────────────────────────────────────────────── */}
      <p className="menu-section-label">Administration</p>
      <ul className="menu" style={{ flexGrow: 0 }}>
        {ADMIN_ITEMS.map(item => (
          <NavItem
            key={item}
            item={item}
            activeComponent={activeComponent}
            setActiveComponent={setActiveComponent}
          />
        ))}
      </ul>

      {/* ── Footer: user identity + logout ─────────────────────────────── */}
      <div className="sidebar-footer">
        <div className="user-info">
          {/* Initials avatar */}
          <div className="user-avatar">{initials || 'ZR'}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{username}</div>
            <div className="user-role text-uppercase">{role}</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          className="btn btn-sm btn-outline-secondary"
          style={{
            color: 'rgba(255,255,255,0.5)',
            borderColor: 'rgba(255,255,255,0.15)',
            padding: '3px 7px',
            flexShrink: 0,
          }}
          title="Sign out"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right" style={{ fontSize: '0.85rem' }}></i>
        </button>
      </div>

    </div>
  );
}

export default SideBar;