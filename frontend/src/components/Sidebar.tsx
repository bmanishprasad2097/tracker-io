import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map } from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/roadmaps', label: 'Roadmaps',  icon: Map,             end: false },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r border-[#1e1e2a] bg-[#0d0d12]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[#1e1e2a]">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/25">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <span className="font-semibold text-white text-sm tracking-tight">tracker.io</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 pt-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={clsx(isActive ? 'text-indigo-400' : 'text-slate-600')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-[#1e1e2a]">
        <p className="text-xs text-slate-700">Learning Tracker</p>
      </div>
    </aside>
  );
}
