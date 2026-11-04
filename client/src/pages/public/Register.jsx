import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { getFieldErrors, getMessage } from '../../services/api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INITIAL = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  studentId: '',
  department: '',
  phone: '',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (form.password.length < 6) next.password = 'Password must be at least 6 characters';
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match';
    if (!form.studentId.trim()) next.studentId = 'Registration number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      const user = await register(payload);
      toast.success(`Account created for ${user.name.split(' ')[0]}`);
      navigate('/student', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 7 5 12l4 5M15 7l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">CampusFix</span>
        </Link>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-ink">Create a student account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Public sign-up only creates student accounts. Administrator and maintenance staff accounts are issued
            by an administrator.
          </p>

          <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input id="name" className="input" value={form.name} onChange={set('name')} placeholder="Arjun Verma" />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={set('email')}
                placeholder="you@student.campusfix.edu"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="label" htmlFor="studentId">
                Registration number
              </label>
              <input
                id="studentId"
                className="input"
                value={form.studentId}
                onChange={set('studentId')}
                placeholder="CSE21001"
              />
              {errors.studentId && <p className="mt-1 text-xs text-rose-600">{errors.studentId}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="input"
                value={form.password}
                onChange={set('password')}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="input"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>}
            </div>

            <div>
              <label className="label" htmlFor="department">
                Department
              </label>
              <input
                id="department"
                className="input"
                value={form.department}
                onChange={set('department')}
                placeholder="Computer Science"
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Phone (optional)
              </label>
              <input
                id="phone"
                className="input"
                value={form.phone}
                onChange={set('phone')}
                placeholder="9876543210"
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </div>

            <button type="submit" className="btn-primary sm:col-span-2" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
