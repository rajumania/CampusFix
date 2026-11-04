import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { userApi } from '../../services/endpoints.js';
import { getFieldErrors, getMessage } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader } from '../../components/StatCard.jsx';
import { RoleBadge } from '../../components/Badges.jsx';
import { FilterBar, SearchBox, Select } from '../../components/Filters.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { Modal } from '../../components/Modal.jsx';
import { EmptyState, ErrorState } from '../../components/States.jsx';
import { PageSkeleton } from '../../components/Spinner.jsx';
import { ROLES } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student' },
  { value: ROLES.STAFF, label: 'Maintenance staff' },
  { value: ROLES.ADMIN, label: 'Administrator' },
];

const BLANK = {
  name: '',
  email: '',
  password: '',
  role: ROLES.STAFF,
  staffId: '',
  department: '',
  phone: '',
};

function CreateUserForm({ defaultRole, onCreated, onCancel }) {
  const [form, setForm] = useState({ ...BLANK, role: defaultRole || ROLES.STAFF });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) next.email = 'A valid email is required';
    if (form.password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await userApi.create(form);
      toast.success(`${form.role === ROLES.ADMIN ? 'Administrator' : 'Staff'} account created`);
      onCreated();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="new-name">
          Full name
        </label>
        <input id="new-name" className="input" value={form.name} onChange={set('name')} />
        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
      </div>

      <div>
        <label className="label" htmlFor="new-email">
          Email
        </label>
        <input id="new-email" type="email" className="input" value={form.email} onChange={set('email')} />
        {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
      </div>

      <div>
        <label className="label" htmlFor="new-password">
          Temporary password
        </label>
        <input
          id="new-password"
          type="text"
          className="input"
          value={form.password}
          onChange={set('password')}
          autoComplete="off"
        />
        {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
      </div>

      <div>
        <label className="label" htmlFor="new-role">
          Account type
        </label>
        <select
          id="new-role"
          className="input"
          value={form.role}
          onChange={set('role')}
          disabled={Boolean(defaultRole)}
        >
          <option value={ROLES.STAFF}>Maintenance staff</option>
          <option value={ROLES.ADMIN}>Administrator</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="new-staffId">
          Staff ID (optional)
        </label>
        <input id="new-staffId" className="input" value={form.staffId} onChange={set('staffId')} placeholder="MT-003" />
      </div>

      <div>
        <label className="label" htmlFor="new-department">
          Department
        </label>
        <input id="new-department" className="input" value={form.department} onChange={set('department')} />
      </div>

      <div>
        <label className="label" htmlFor="new-phone">
          Phone (optional)
        </label>
        <input id="new-phone" className="input" value={form.phone} onChange={set('phone')} />
      </div>

      <div className="mt-2 flex gap-2 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create account'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ManageUsers({ fixedRole }) {
  const { user } = useAuth();
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState(fixedRole || '');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const params = useMemo(
    () => ({ page, limit: 10, ...(role ? { role } : {}), ...(search ? { search } : {}) }),
    [page, role, search]
  );

  const { data, error, loading, refresh } = useApi(() => userApi.list(params), JSON.stringify(params));

  const applyChange = async (target, payload, successMessage) => {
    setBusyId(target._id);
    try {
      await userApi.update(target._id, payload);
      toast.success(successMessage);
      await refresh();
    } catch (err) {
      toast.error(getMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const users = data?.users || [];

  return (
    <>
      <PageHeader
        title={fixedRole === ROLES.STAFF ? 'Manage staff' : 'Manage users'}
        description="Only administrators can create staff and administrator accounts, or change anyone's role."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            + Add staff or admin
          </button>
        }
      />

      <FilterBar
        onReset={() => {
          setSearchDraft('');
          setRole(fixedRole || '');
          setPage(1);
        }}
        showReset={Boolean(searchDraft || (!fixedRole && role))}
      >
        <SearchBox value={searchDraft} onChange={setSearchDraft} placeholder="Search name, email or ID" />
        {!fixedRole && (
          <Select
            label="Role"
            value={role}
            onChange={(value) => {
              setRole(value);
              setPage(1);
            }}
            options={ROLE_OPTIONS}
            allLabel="All roles"
          />
        )}
      </FilterBar>

      {loading ? (
        <PageSkeleton rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No accounts match this filter"
          description="Try a different role or clear the search box."
        />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((row) => {
                  const isSelf = row._id === user._id;
                  return (
                    <tr key={row._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">
                          {row.name}
                          {isSelf && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{row.email}</p>
                        <p className="text-xs text-slate-400">{row.studentId || row.staffId || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.department || '—'}</td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <RoleBadge role={row.role} />
                        ) : (
                          <select
                            className="input w-36 py-1 text-xs"
                            value={row.role}
                            disabled={busyId === row._id}
                            onChange={(e) => applyChange(row, { role: e.target.value }, `Role set to ${e.target.value}`)}
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                            row.isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-slate-100 text-slate-500 ring-slate-200'
                          }`}
                        >
                          {row.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1.5 text-xs"
                            disabled={isSelf || busyId === row._id}
                            onClick={() =>
                              applyChange(
                                row,
                                { isActive: !row.isActive },
                                row.isActive ? 'Account disabled' : 'Account reactivated'
                              )
                            }
                          >
                            {row.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            className="btn-danger px-3 py-1.5 text-xs"
                            disabled={isSelf}
                            onClick={() => setPendingDelete(row)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={createOpen}
        title="Create a privileged account"
        description="Students register themselves; staff and administrators are issued here."
        onClose={() => setCreateOpen(false)}
      >
        <CreateUserForm
          defaultRole={fixedRole}
          onCancel={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await refresh();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name || 'this account'}?`}
        description="Deletion only succeeds when the account has no linked complaints. Otherwise disable it instead."
        confirmLabel="Delete account"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await userApi.remove(pendingDelete._id);
            toast.success('Account deleted');
            await refresh();
          } catch (err) {
            toast.error(getMessage(err));
          }
        }}
      />
    </>
  );
}
