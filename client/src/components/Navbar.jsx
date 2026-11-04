import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';
import { RoleBadge } from './Badges.jsx';

export function Navbar({ onOpenSidebar, title }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="btn-ghost px-2 md:hidden"
          aria-label="Open navigation"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <h2 className="hidden text-sm font-semibold text-slate-500 sm:block">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-ink">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <RoleBadge role={user?.role} />
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
          {initials(user?.name)}
        </span>
        <button type="button" onClick={handleSignOut} className="btn-secondary px-3 py-1.5">
          Sign out
        </button>
      </div>
    </header>
  );
}
