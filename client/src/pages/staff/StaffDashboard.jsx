import { Link } from 'react-router-dom';
import { analyticsApi, complaintApi } from '../../services/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader, StatCard } from '../../components/StatCard.jsx';
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx';
import { EmptyState, ErrorState } from '../../components/States.jsx';
import { PageSkeleton } from '../../components/Spinner.jsx';
import { formatDate, timeAgo } from '../../utils/format.js';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useApi(analyticsApi.dashboard, 'staff-dashboard');

  // The queue card only needs the titles, so it is fetched separately from the
  // aggregate counters and can refresh on its own.
  const queue = useApi(
    () => complaintApi.list({ status: 'assigned', limit: 5 }).then((r) => r.complaints),
    'staff-assigned-preview'
  );

  if (loading) return <PageSkeleton rows={5} />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;

  const { summary, recentComplaints = [] } = data;

  return (
    <>
      <PageHeader
        title={`Work desk · ${user.name}`}
        description="Only complaints assigned to you are visible here, and only you can update them."
        actions={
          <Link to="/staff/tasks" className="btn-primary">
            Open full task list
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Waiting to start" value={summary.assigned} tone="slate" hint="Assigned, not begun" />
        <StatCard label="In progress" value={summary.inProgress} tone="amber" hint="Currently under repair" />
        <StatCard label="Completed" value={summary.resolved} tone="emerald" hint={`${user.name.split(' ')[0]}'s closures`} />
        <StatCard
          label="Campus backlog"
          value={data.unassignedWaiting ?? 0}
          tone="rose"
          hint="Awaiting an administrator assignment"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Newly assigned to you</h2>
            <Link to="/staff/tasks" className="text-sm font-medium text-brand-700 hover:underline">
              All tasks
            </Link>
          </div>

          {queue.loading ? (
            <PageSkeleton rows={3} />
          ) : queue.error ? (
            <ErrorState error={queue.error} onRetry={queue.refresh} />
          ) : (queue.data || []).length === 0 ? (
            <EmptyState
              title="Nothing new assigned"
              description="When an administrator hands you a complaint it will show up here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(queue.data || []).map((complaint) => (
                <li key={complaint._id} className="py-3">
                  <Link
                    to={`/complaints/${complaint._id}`}
                    className="block truncate font-medium text-brand-700 hover:underline"
                  >
                    {complaint.title}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                    <span>{complaint.category}</span>
                    <span>· {complaint.reportedBy?.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink">Recently updated work</h2>
          {recentComplaints.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentComplaints.map((complaint) => (
                <li key={complaint._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/complaints/${complaint._id}`}
                      className="block truncate font-medium text-brand-700 hover:underline"
                    >
                      {complaint.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {complaint.location || complaint.category} · updated {timeAgo(complaint.updatedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={complaint.status} />
                    <p className="mt-1 text-xs text-slate-400">{formatDate(complaint.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
