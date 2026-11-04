import { NavLink, useLocation } from 'react-router-dom';
import { ROLES } from '../utils/constants.js';

const Icon = ({ path, className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const ICONS = {
  dashboard: 'M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-4H4v4zm10-11h6V4h-6v5z',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm13 10v-1a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  wrench: 'M14.7 6.3a4 4 0 0 1 5.3 5.3l-7.4 7.4a2.5 2.5 0 0 1-3.5-3.5l7.4-7.4zM3 21l3.5-3.5',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
};

const NAV = {
  [ROLES.STUDENT]: [
    { to: '/student', label: 'Dashboard', icon: ICONS.dashboard, end: true },
    { to: '/student/complaints/new', label: 'Submit complaint', icon: ICONS.plus },
    { to: '/student/complaints', label: 'My complaints', icon: ICONS.list },
    { to: '/profile', label: 'Profile', icon: ICONS.user },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Dashboard', icon: ICONS.dashboard, end: true },
    { to: '/admin/complaints', label: 'Manage complaints', icon: ICONS.list },
    { to: '/admin/users', label: 'Manage users', icon: ICONS.users },
    { to: '/admin/staff', label: 'Manage staff', icon: ICONS.wrench },
    { to: '/admin/analytics', label: 'Analytics', icon: ICONS.chart },
    { to: '/profile', label: 'Profile', icon: ICONS.user },
  ],
  [ROLES.STAFF]: [
    { to: '/staff', label: 'Dashboard', icon: ICONS.dashboard, end: true },
    { to: '/staff/tasks', label: 'Assigned tasks', icon: ICONS.wrench },
    { to: '/profile', label: 'Profile', icon: ICONS.user },
  ],
};

export function Sidebar({ role, onNavigate }) {
  const location = useLocation();
  const items = NAV[role] || [];

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Icon path={ICONS.wrench} className="h-4 w-4" />
        </span>
        <span className="text-base font-bold tracking-tight text-ink">CampusFix</span>
      </div>

      <p className="px-5 pt-4 pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
        {role} area
      </p>

      <nav className="flex-1 space-y-1 px-3 pb-4">
        {items.map((item) => {
          // A detail page (/complaints/:id) should keep its section highlighted.
          const active =
            item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to.replace(/\/new$/, ''));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
              }`}
            >
              <Icon path={item.icon} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
        CampusFix · MERN training project
      </div>
    </div>
  );
}
