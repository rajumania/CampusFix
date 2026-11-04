import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { complaintApi, feedbackApi, userApi } from '../../services/endpoints.js';
import { getMessage } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx';
import { ActivityTimeline } from '../../components/ActivityTimeline.jsx';
import { CommentThread, ImageGallery } from '../../components/CommentThread.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { RatingDisplay, RatingInput } from '../../components/Rating.jsx';
import { ErrorState } from '../../components/States.jsx';
import { PageSkeleton } from '../../components/Spinner.jsx';
import { Select } from '../../components/Filters.jsx';
import { PRIORITIES, ROLES, STATUSES } from '../../utils/constants.js';
import { formatDate, formatDateTime, hoursBetween, timeAgo } from '../../utils/format.js';

const STAFF_STATUS_OPTIONS = ['in_progress', 'resolved'];

function Notice({ tone, title, children }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}

/** Shared by the admin status control and the staff progress control. */
function StatusPanel({ complaint, allowed, onSubmit, remarksLabel, busy, setBusy }) {
  const [status, setStatus] = useState(complaint.status);
  const [remarks, setRemarks] = useState('');

  const needsRemarks = status === 'resolved' || status === 'rejected';
  const remarkTitle = status === 'rejected' ? 'Rejection reason' : remarksLabel;

  const submit = async () => {
    if (status === complaint.status) {
      toast('Status is already set to that value', { icon: 'ℹ️' });
      return;
    }
    if (status === 'resolved' && remarks.trim().length < 5) {
      toast.error('Add resolution remarks of at least 5 characters');
      return;
    }
    if (status === 'rejected' && remarks.trim().length < 5) {
      toast.error('Give a reason of at least 5 characters');
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        status,
        ...(status === 'resolved' ? { remarks: remarks.trim() } : {}),
        ...(status === 'rejected' ? { rejectionReason: remarks.trim() } : {}),
      });
      setRemarks('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold text-ink">Update status</h2>
      <Select
        label="Status"
        value={status}
        onChange={setStatus}
        options={allowed.map((value) => ({ value, label: STATUSES[value].label }))}
      />
      {needsRemarks && (
        <div>
          <label className="label" htmlFor="remarks">
            {remarkTitle}
          </label>
          <textarea
            id="remarks"
            rows={3}
            className="input"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={
              status === 'rejected'
                ? 'Why is this complaint being rejected?'
                : 'What was done to fix the issue?'
            }
          />
        </div>
      )}
      <button type="button" className="btn-primary w-full" onClick={submit} disabled={busy}>
        {busy ? 'Saving…' : 'Apply status change'}
      </button>
    </div>
  );
}

export default function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, error, loading, refresh } = useApi(() => complaintApi.get(id), `complaint-${id}`);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', location: '' });
  // Null means "not edited yet", which renders the server's current value as the
  // default without needing an effect to copy it into state.
  const [priority, setPriority] = useState(null);
  const [assignee, setAssignee] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  const isAdmin = user.role === ROLES.ADMIN;
  // Staff may only load the staff-directory list when they need it for assigning.
  const staffQuery = useApi(() => userApi.list({ role: ROLES.STAFF, limit: 100 }), isAdmin ? 'staff-directory' : 'noop', {
    enabled: isAdmin,
  });

  const complaint = data?.complaint;

  const permissions = useMemo(() => {
    if (!complaint) return { isOwner: false, isAssignedStaff: false, canComment: false, canAct: false };
    const isOwner = complaint.reportedBy?._id === user._id;
    const isAssignedStaff = complaint.assignedTo?._id === user._id;
    return {
      isOwner,
      isAssignedStaff,
      canComment: isAdmin || isOwner || isAssignedStaff,
      canAct: isAdmin || isAssignedStaff,
    };
  }, [complaint, user._id, isAdmin]);

  if (loading) return <PageSkeleton rows={6} />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;

  const resolutionHours = hoursBetween(complaint.createdAt, complaint.resolvedAt);

  const run = async (label, work) => {
    setBusy(true);
    try {
      await work();
      toast.success(label);
      await refresh();
    } catch (err) {
      toast.error(getMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const statusAllowed = isAdmin ? Object.keys(STATUSES) : STAFF_STATUS_OPTIONS;

  return (
    <>
      <Link
        to={isAdmin ? '/admin/complaints' : user.role === ROLES.STAFF ? '/staff/tasks' : '/student/complaints'}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-ink"
      >
        ← Back to list
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {editing ? (
                  <input
                    className="input mb-3 text-lg font-semibold"
                    value={draft.title}
                    onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  />
                ) : (
                  <h1 className="text-xl font-bold text-ink">{complaint.title}</h1>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 ring-inset">
                    {complaint.category}
                  </span>
                </div>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Reported by</dt>
                <dd className="mt-1 text-ink">
                  {complaint.reportedBy?.name}
                  {complaint.reportedBy?.studentId ? ` · ${complaint.reportedBy.studentId}` : ''}
                </dd>
                <dd className="text-xs text-slate-500">
                  {formatDate(complaint.createdAt)} · {complaint.reportedBy?.department || 'no department'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Assigned to</dt>
                <dd className="mt-1 text-ink">{complaint.assignedTo?.name || 'Not assigned yet'}</dd>
                <dd className="text-xs text-slate-500">
                  {complaint.assignedTo?.staffId || ''} {complaint.assignedTo?.department || ''}
                </dd>
              </div>
              {complaint.location && (
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Location</dt>
                  <dd className="mt-1 text-ink">{complaint.location}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Last update</dt>
                <dd className="mt-1 text-ink" title={formatDateTime(complaint.updatedAt)}>
                  {timeAgo(complaint.updatedAt)}
                </dd>
              </div>
            </dl>

            {editing ? (
              <div className="mt-5 space-y-3">
                <textarea
                  className="input"
                  rows={6}
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Location"
                  value={draft.location}
                  onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busy}
                    onClick={() =>
                      run('Complaint updated', () => complaintApi.update(complaint._id, draft))
                    }
                  >
                    Save changes
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                {complaint.description}
              </p>
            )}

            {permissions.isOwner && !editing && complaint.status === 'pending' && (
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => {
                  setDraft({
                    title: complaint.title,
                    description: complaint.description,
                    location: complaint.location || '',
                  });
                  setEditing(true);
                }}
              >
                Edit complaint
              </button>
            )}
          </div>

          <div className="card p-6">
            <ImageGallery images={complaint.images || []} title={complaint.title} />
          </div>

          {complaint.status === 'resolved' && complaint.resolutionRemarks && (
            <Notice tone="success" title="Resolution remarks">
              {complaint.resolutionRemarks}
              {resolutionHours !== null && (
                <span className="mt-1 block text-xs opacity-80">
                  Closed on {formatDate(complaint.resolvedAt)} · resolved in {resolutionHours} hours
                </span>
              )}
            </Notice>
          )}

          {complaint.status === 'rejected' && complaint.rejectionReason && (
            <Notice tone="danger" title="Complaint rejected">
              {complaint.rejectionReason}
            </Notice>
          )}

          {data.feedback && (
            <div className="card p-6">
              <h2 className="mb-2 font-semibold text-ink">Student feedback</h2>
              <RatingDisplay value={data.feedback.rating} />
              {data.feedback.comment && (
                <p className="mt-2 text-sm text-slate-600">“{data.feedback.comment}”</p>
              )}
              <p className="mt-1 text-xs text-slate-400">{formatDate(data.feedback.createdAt)}</p>
            </div>
          )}

          {permissions.isOwner && complaint.status === 'resolved' && !data.feedback && (
            <div className="card p-6">
              <h2 className="mb-1 font-semibold text-ink">Rate the resolution</h2>
              <p className="mb-3 text-sm text-slate-500">
                The complaint is marked resolved. Your feedback tells administrators whether the fix actually held.
              </p>
              <RatingInput value={rating} onChange={setRating} />
              <textarea
                className="input mt-3"
                rows={3}
                placeholder="Optional comment for the maintenance team"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                maxLength={600}
              />
              <button
                type="button"
                className="btn-primary mt-3"
                disabled={busy || rating === 0}
                onClick={() =>
                  run('Feedback submitted', () =>
                    feedbackApi.submit(complaint._id, { rating, comment: feedbackText.trim() })
                  )
                }
              >
                Submit feedback
              </button>
            </div>
          )}

          <div className="card p-6">
            <CommentThread
              comments={data.comments}
              canComment={permissions.canComment}
              onSubmit={(text) =>
                run('Comment added', async () => {
                  await complaintApi.addComment(complaint._id, text);
                })
              }
            />
          </div>
        </div>

        <div className="space-y-6">
          {isAdmin && (
            <div className="card space-y-4 p-5">
              <h2 className="font-semibold text-ink">Assignment</h2>
              <div>
                <label className="label" htmlFor="staff-select">
                  Maintenance staff
                </label>
                <select
                  id="staff-select"
                  className="input"
                  value={assignee ?? complaint.assignedTo?._id ?? ''}
                  disabled={staffQuery.loading}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {(staffQuery.data?.users || []).map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name}
                      {staff.department ? ` · ${staff.department}` : ''}
                    </option>
                  ))}
                </select>
                {staffQuery.error && <p className="mt-1 text-xs text-rose-600">{staffQuery.error}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={busy || !assignee}
                  onClick={() =>
                    run('Complaint assigned', () => complaintApi.assign(complaint._id, assignee))
                  }
                >
                  Assign
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy || !complaint.assignedTo}
                  onClick={() =>
                    run('Returned to the queue', () => complaintApi.assign(complaint._id, null))
                  }
                >
                  Unassign
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="card space-y-3 p-5">
              <h2 className="font-semibold text-ink">Priority</h2>
              <Select
                label="Priority"
                value={priority ?? complaint.priority}
                onChange={setPriority}
                options={PRIORITIES}
              />
              <button
                type="button"
                className="btn-secondary w-full"
                disabled={busy || (priority ?? complaint.priority) === complaint.priority}
                onClick={() =>
                  run('Priority updated', () => complaintApi.update(complaint._id, { priority }))
                }
              >
                Save priority
              </button>
            </div>
          )}

          {permissions.canAct && (
            <StatusPanel
              complaint={complaint}
              allowed={statusAllowed}
              busy={busy}
              setBusy={setBusy}
              remarksLabel="Resolution remarks"
              onSubmit={(payload) =>
                run('Status updated', async () => {
                  await complaintApi.setStatus(complaint._id, payload);
                })
              }
            />
          )}

          {isAdmin && (
            <div className="card space-y-3 border-rose-200 p-5">
              <h2 className="font-semibold text-rose-800">Delete complaint</h2>
              <p className="text-sm text-slate-600">
                Removes the complaint from every queue. The reason you give is written to the audit trail.
              </p>
              <button type="button" className="btn-danger w-full" onClick={() => setConfirmOpen(true)}>
                Delete this complaint
              </button>
            </div>
          )}

          {user.role === ROLES.STAFF && !permissions.isAssignedStaff && (
            <div className="card p-5">
              <p className="text-sm text-slate-500">
                This complaint is not assigned to you, so you can read it but not change it.
              </p>
            </div>
          )}

          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-ink">Activity history</h2>
            <ActivityTimeline activities={data.activities} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this complaint?"
        description="Students will lose the record and its history stays with the administrators only."
        confirmLabel="Delete complaint"
        tone="danger"
        requireReason
        reasonLabel="Reason for deletion"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async (reason) => {
          await complaintApi.remove(complaint._id, reason);
          toast.success('Complaint deleted');
          navigate('/admin/complaints');
        }}
      />
    </>
  );
}
