/**
 * src/components/main/SideBar.jsx  (updated)
 * ─────────────────────────────────────────────────────────────────────────────
 * Added two new menu items to the Administration section:
 *   • "Serial Review"    → SerialGroupReview  (bi-diagram-3-fill)
 *   • "Case Management"  → CaseManagement     (bi-folder2-open)
 *
 * All other functionality is unchanged.
 */

import logo from '/logo.jpg';

const ICON_MAP = {
  Dashboard:          'bi-speedometer2',
  RRB:                'bi-journal-text',
  CPM:                'bi-diagram-3',
  Analytics:          'bi-graph-up-arrow',
  Statistics:         'bi-bar-chart-line',
  Reports:            'bi-file-earmark-bar-graph',
  'Data Upload':      'bi-cloud-upload',
  'ML Training':      'bi-cpu',
  Settings:           'bi-gear',
  'Serial Review':    'bi-diagram-3-fill',
  'Case Management':  'bi-folder2-open',
};

const MAIN_ITEMS  = ['Dashboard', 'RRB', 'CPM', 'Analytics', 'Statistics', 'Reports'];
const ADMIN_ITEMS = ['Case Management', 'Serial Review', 'Data Upload', 'ML Training', 'Settings'];

const LABELS = {
  Dashboard:         'Dashboard',
  RRB:               'Report Record Book',
  CPM:               'Crime Profile Matcher',
  Analytics:         'Analytics',
  Statistics:        'Statistics',
  Reports:           'Reports',
  'Data Upload':     'Data Upload',
  'ML Training':     'ML Training',
  Settings:          'Settings',
  'Serial Review':   'Serial Group Review',
  'Case Management': 'Case Management',
};

function NavItem({ item, activeComponent, setActiveComponent }) {
  return (
    <li
      className={item === activeComponent ? 'active' : ''}
      onClick={() => setActiveComponent(item)}
      title={LABELS[item]}
    >
      <i className={`bi ${ICON_MAP[item] ?? 'bi-circle'}`}></i>
      <span style={{ fontSize: '0.78rem', fontWeight: item === activeComponent ? 600 : 500 }}>
        {LABELS[item]}
      </span>
    </li>
  );
}

function SideBar({ setActiveComponent, activeComponent }) {
  const raw      = localStorage.getItem('user');
  const user     = raw ? JSON.parse(raw) : null;
  const username = user?.username ?? user?.zrp_badge_number ?? 'Officer';
  const role     = user?.role ?? 'user';

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

      <div className="d-flex logo align-items-center">
        <img src={logo} alt="ZimCrimeWatch Logo" />
        <h1>Zim Crime Watch</h1>
      </div>

      <p className="menu-section-label">Main Menu</p>
      <ul className="menu">
        {MAIN_ITEMS.map(item => (
          <NavItem key={item} item={item} activeComponent={activeComponent} setActiveComponent={setActiveComponent} />
        ))}
      </ul>

      <p className="menu-section-label">Administration</p>
      <ul className="menu" style={{ flexGrow: 0 }}>
        {ADMIN_ITEMS.map(item => (
          <NavItem key={item} item={item} activeComponent={activeComponent} setActiveComponent={setActiveComponent} />
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials || 'ZR'}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{username}</div>
            <div className="user-role text-uppercase">{role}</div>
          </div>
        </div>
        <button
          className="btn btn-sm btn-outline-secondary"
          style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)', padding: '3px 7px', flexShrink: 0 }}
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
