/**
 * src/components/main/Home.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root layout for the authenticated ZRP dashboard.
 *
 * Changes from previous version:
 *  • Wraps the entire layout in a div with className="app-shell" so that
 *    index.css can override the blurred-logo body background with the clean
 *    #f0f2f5 grey used across the dashboard.
 *  • Default active component is "Dashboard".
 */

import { useState } from 'react';
import SideBar from './SideBar';
import Container from './Container';

function Home() {
  const [activeComponent, setActiveComponent] = useState('Dashboard');

  return (
    /* app-shell overrides the body's background-image with the clean grey */
    <div
      className="app-shell navbar row g-0 p-0 m-0"
      style={{ minHeight: '100vh', maxHeight: '100vh', background: '#f0f2f5' }}
    >
      <SideBar
        setActiveComponent={setActiveComponent}
        activeComponent={activeComponent}
      />
      <Container activeComponent={activeComponent} />
    </div>
  );
}

export default Home;