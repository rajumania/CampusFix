import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { userApi } from '../../services/endpoints.js';
import { getFieldErrors, getMessage } from '../../services/api.js';
import { PageHeader } from '../../components/StatCard.jsx';
import { RoleBadge } from '../../components/Badges.jsx';
import { PageSkeleton } from '../../components/Spinner.jsx';
import { formatDate } from '../../utils/format.js';

export default function Profile() {
  const { user, updateUser, loading } = useAuth();
  const [details, setDetails] = useState({ name: '', department: '', phone: '' });
  const [passwords, setPasswords] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Seed the form once the session is restored, and again after a save so the
  // inputs always mirror the server's copy of the profile.
  useEffect(() => {
    if (!user) return;
    setDetails({ name: user.name, department: user.department || '', phone: user.phone || '' });
  }, [user]);

  if (loading || !user) return <PageSkeleton rows={3} />;

  const validateProfile = () => {
    const next = {};
    if (details.name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (details.phone && !/^[0-9+\-\s()]{7,16}$/.test(details.phone)) {
      next.phone = 'Enter a valid phone number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!validateProfile()) return;

    setSaving(true);
    try {
      const updated = await userApi.update(user._id, details);
      updateUser(updated);
      toast.success('Profile saved');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const next = {};
    if (passwords.password.length < 6) next.password = 'New password must be at least 6 characters';
    if (passwords.password !== passwords.confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await userApi.update(user._id, { password: passwords.password });
      setPasswords({ password: '', confirm: '' });
      toast.success('Password updated');
    } catch (err) {
      toast.error(getMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const identity = [
    { label: 'Email', value: user.email },
    { label: 'Role', node: <RoleBadge role={user.role} /> },
    user.studentId ? { label: 'Registration number', value: user.studentId } : null,
    user.staffId ? { label: 'Staff ID', value: user.staffId } : null,
    { label: 'Account created', value: formatDate(user.createdAt) },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="My profile" description="Update your contact details and change your password." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h2 className="mb-4 font-semibold text-ink">Account</h2>
          <dl className="space-y-3 text-sm">
            {identity.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{row.label}</dt>
                <dd className="mt-0.5 text-ink">{row.node || row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <form className="card space-y-4 p-6" onSubmit={saveProfile} noValidate>
            <h2 className="font-semibold text-ink">Personal details</h2>

            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className="input"
                value={details.name}
                onChange={(e) => setDetails((p) => ({ ...p, name: e.target.value }))}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  className="input"
                  value={details.department}
                  onChange={(e) => setDetails((p) => ({ ...p, department: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  className="input"
                  value={details.phone}
                  onChange={(e) => setDetails((p) => ({ ...p, phone: e.target.value }))}
                />
                {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <form className="card space-y-4 p-6" onSubmit={changePassword} noValidate>
            <h2 className="font-semibold text-ink">Change password</h2>
            <p className="text-sm text-slate-500">
              Leave this alone unless you want a new password. Your existing token stays valid until it expires.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="newPassword">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={passwords.password}
                  onChange={(e) => setPasswords((p) => ({ ...p, password: e.target.value }))}
                />
                {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
              </div>
              <div>
                <label className="label" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                />
                {errors.confirm && <p className="mt-1 text-xs text-rose-600">{errors.confirm}</p>}
              </div>
            </div>

            <button type="submit" className="btn-secondary" disabled={saving || !passwords.password}>
              Update password
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
