import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Sidebar } from '../components/Sidebar.jsx';
import { Navbar } from '../components/Navbar.jsx';

const TITLES = [
  ['/student/complaints/new', 'Submit a complaint'],
  ['/student/complaints', 'My complaints'],
  ['/admin/complaints', 'Manage complaints'],
  ['/admin/users', 'Manage users'],
  ['/admin/staff', 'Manage staff'],
  ['/admin/analytics', 'Analytics'],
  ['/staff/tasks', 'Assigned tasks'],
  ['/complaints/', 'Complaint details'],
  ['/profile', 'My profile'],
];

function resolveTitle(pathname) {
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  if (match) return match[1];
  if (pathname === '/student') return 'Student dashboard';
  if (pathname === '/admin') return 'Administrator dashboard';
  if (pathname === '/staff') return 'Staff dashboard';
  return 'CampusFix';
}

export function DashboardLayout() {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden shrink-0 md:block">
        <div className="fixed inset-y-0 left-0 z-20">
          <Sidebar role={user.role} />
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0">
            <Sidebar role={user.role} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <Navbar title={resolveTitle(location.pathname)} onOpenSidebar={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
