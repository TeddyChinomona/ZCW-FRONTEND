/**
 * src/components/shared/PageTopBar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Uniform sticky page header used at the top of every main page component.
 * Replaces the ad-hoc "d-flex justify-content-between mb-4" pattern that was
 * duplicated across Dashboard, Analytics, Statistics, Reports, etc.
 *
 * Props:
 *  title       {string}   — Page title text
 *  icon        {string}   — Bootstrap Icons class (without the "bi-" prefix)
 *  subtitle    {string}   — Optional subtitle / breadcrumb text
 *  children    {node}     — Action buttons / controls rendered on the right
 */

export default function PageTopBar({ title, icon, subtitle, children }) {
  return (
    /* Sticky top bar — always visible as the user scrolls the content pane */
    <div className="page-topbar">

      {/* Left: icon + title + optional subtitle */}
      <div>
        <h1 className="page-title mb-0" style={{ fontSize: '1rem' }}>
          {icon && <i className={`bi bi-${icon}`}></i>}
          {title}
        </h1>
        {subtitle && (
          <small className="text-muted" style={{ fontSize: '0.72rem', marginLeft: icon ? '26px' : 0 }}>
            {subtitle}
          </small>
        )}
      </div>

      {/* Right: action buttons / filters passed as children */}
      {children && (
        <div className="topbar-actions">
          {children}
        </div>
      )}

    </div>
  );
}