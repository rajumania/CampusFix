import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { getFieldErrors, getMessage } from '../../services/api.js';
import { HOME_BY_ROLE } from '../../utils/constants.js';

const DEMO_ACCOUNTS = [
  { label: 'Student', email: 'arjun@student.campusfix.edu', password: 'Student@123' },
  { label: 'Administrator', email: 'admin@campusfix.edu', password: 'Admin@123' },
  { label: 'Maintenance staff', email: 'ravi.staff@campusfix.edu', password: 'Staff@123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      const to = location.state?.from || HOME_BY_ROLE[user.role];
      navigate(to, { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getMessage(err, 'Sign in failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 7 5 12l4 5M15 7l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">CampusFix</span>
        </Link>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-ink">Sign in to your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Students, administrators and maintenance staff all sign in here.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                className="input"
                value={form.email}
                onChange={set('email')}
                placeholder="you@student.campusfix.edu"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New student?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Development-only shortcuts; never rendered in a production build. */}
        {import.meta.env.DEV && (
          <div className="card mt-4 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Demo accounts (after `npm run seed`)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                  onClick={() => setForm({ email: account.email, password: account.password })}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
