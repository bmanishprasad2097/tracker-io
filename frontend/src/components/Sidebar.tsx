import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map } from 'lucide-react';

const nav = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/roadmaps', label: 'Roadmaps',  icon: Map,             end: false },
];

export default function Sidebar() {
  return (
    <aside
      className="w-56 shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ background: 'var(--bg-default)', borderRight: '1px solid var(--border-default)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 h-14"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-border)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>tracker.io</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 pt-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            {({ isActive }) => (
              <div
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                style={isActive
                  ? { background: 'var(--accent-subtle)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' }
                  : { color: 'var(--text-secondary)', border: '1px solid transparent' }
                }
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Icon size={15} style={{ color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)' }} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
        <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>v1.0.0</p>
      </div>
    </aside>
  );
}
