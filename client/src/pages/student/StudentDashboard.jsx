import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { analyticsApi } from '../../services/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader, StatCard } from '../../components/StatCard.jsx';
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx';
import { EmptyState, ErrorState } from '../../components/States.jsx';
import { PageSkeleton } from '../../components/Spinner.jsx';
import { CHART_COLORS } from '../../utils/constants.js';
import { timeAgo } from '../../utils/format.js';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useApi(analyticsApi.dashboard, 'student-dashboard');

  if (loading) return <PageSkeleton rows={5} />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;

  const { summary, recentComplaints = [], byCategory = [] } = data;
  const activeCategories = byCategory.filter((row) => row.count > 0);

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        description="Everything you have reported, and where each issue currently stands."
        actions={
          <Link to="/student/complaints/new" className="btn-primary">
            + New complaint
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submitted" value={summary.total} tone="brand" />
        <StatCard label="Pending" value={summary.pending} tone="slate" hint="Waiting for an administrator" />
        <StatCard
          label="In progress"
          value={summary.inProgress + summary.assigned}
          tone="amber"
          hint={`${summary.assigned} assigned, ${summary.inProgress} being worked`}
        />
        <StatCard label="Resolved" value={summary.resolved} tone="emerald" hint={`${summary.rejected} rejected`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-ink">Recent complaint activity</h2>
              <Link to="/student/complaints" className="text-sm font-medium text-brand-700 hover:underline">
                View all
              </Link>
            </div>

            {recentComplaints.length === 0 ? (
              <EmptyState
                title="You have not filed a complaint yet"
                description="Report a classroom, hostel or laboratory issue and it will appear here."
                action={
                  <Link to="/student/complaints/new" className="btn-primary">
                    Submit your first complaint
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentComplaints.map((complaint) => (
                  <li key={complaint._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        to={`/complaints/${complaint._id}`}
                        className="block truncate font-medium text-brand-700 hover:underline"
                      >
                        {complaint.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {complaint.category} · {timeAgo(complaint.updatedAt)}
                        {complaint.assignedTo ? ` · handled by ${complaint.assignedTo.name}` : ' · not assigned yet'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={complaint.priority} />
                      <StatusBadge status={complaint.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-1 font-semibold text-ink">Your categories</h2>
          <p className="mb-4 text-xs text-slate-500">Where your complaints come from</p>
          {activeCategories.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing to chart yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeCategories} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" width={92} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" name="Complaints" radius={[0, 4, 4, 0]}>
                    {activeCategories.map((entry, index) => (
                      <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
