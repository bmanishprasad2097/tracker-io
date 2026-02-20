import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map } from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/roadmaps', label: 'Roadmaps',  icon: Map,             end: false },
];

export default function Sidebar() {
  return (
    <aside
      className="w-56 shrink-0 h-screen sticky top-0 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #09091a 0%, #07070f 100%)',
        borderRight: '1px solid #15152a',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14" style={{ borderBottom: '1px solid #15152a' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            boxShadow: '0 0 16px #7c3aed50',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <span className="font-bold text-sm tracking-tight gradient-text">tracker.io</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 pt-4">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, #6366f122, #7c3aed18)',
                      border: '1px solid #6366f130',
                      boxShadow: '0 0 16px #6366f115',
                    }}
                  />
                )}
                <Icon
                  size={15}
                  className="relative z-10"
                  style={{ color: isActive ? '#818cf8' : undefined }}
                />
                <span className="relative z-10">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3" style={{ borderTop: '1px solid #15152a' }}>
        <p className="text-xs" style={{ color: '#3a4060' }}>v1.0.0</p>
      </div>
    </aside>
  );
}
