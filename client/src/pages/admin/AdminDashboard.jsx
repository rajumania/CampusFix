import { Link } from 'react-router-dom';
import { analyticsApi } from '../../services/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader, StatCard } from '../../components/StatCard.jsx';
import { CategoryChart, MonthlyChart, StatusChart, WorkloadChart } from '../../components/Charts.jsx';
import { ErrorState } from '../../components/States.jsx';
import { PageSkeleton } from '../../components/Spinner.jsx';
import { timeAgo } from '../../utils/format.js';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, error, loading, refresh } = useApi(analyticsApi.dashboard, 'admin-dashboard');

  if (loading) return <PageSkeleton rows={6} />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;

  const { summary, byCategory, monthly, performance, staffWorkload, usersByRole, recentActivity, criticalOpen } = data;

  return (
    <>
      <PageHeader
        title="Administrator dashboard"
        description={`Signed in as ${user.name}. Review the queue and track how fast the campus closes issues.`}
        actions={
          <>
            <Link to="/admin/complaints?status=pending" className="btn-secondary">
              Unassigned queue
            </Link>
            <Link to="/admin/analytics" className="btn-primary">
              Full analytics
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="All complaints" value={summary.total} tone="brand" />
        <StatCard label="Awaiting review" value={summary.pending} tone="slate" hint="Not yet assigned" />
        <StatCard label="Being worked" value={summary.assigned + summary.inProgress} tone="amber" />
        <StatCard label="Resolved" value={summary.resolved} tone="emerald" hint={`${summary.rejected} rejected`} />
        <StatCard
          label="Critical open"
          value={criticalOpen}
          tone="rose"
          hint="Safety or teaching impact"
        />
        <StatCard
          label="Resolution rate"
          value={`${performance.resolutionRatePercent}%`}
          tone="brand"
          hint={
            performance.avgResolutionHours
              ? `avg ${performance.avgResolutionHours} hrs to close`
              : 'nothing closed yet'
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-1 font-semibold text-ink">Complaints by category</h2>
          <p className="mb-4 text-xs text-slate-500">Where the campus is failing most often</p>
          <CategoryChart data={byCategory} />
        </div>

        <div className="card p-5">
          <h2 className="mb-1 font-semibold text-ink">Status distribution</h2>
          <p className="mb-4 text-xs text-slate-500">Every live complaint, split by workflow state</p>
          <StatusChart summary={summary} />
        </div>

        <div className="card p-5">
          <h2 className="mb-1 font-semibold text-ink">Monthly volume</h2>
          <p className="mb-4 text-xs text-slate-500">Received versus resolved over the last six months</p>
          <MonthlyChart data={monthly} />
        </div>

        <div className="card p-5">
          <h2 className="mb-1 font-semibold text-ink">Staff workload</h2>
          <p className="mb-4 text-xs text-slate-500">Assigned history per maintenance team member</p>
          <WorkloadChart data={staffWorkload} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Staff assignment performance</h2>
            <Link to="/admin/users?role=staff" className="text-sm font-medium text-brand-700 hover:underline">
              Manage staff
            </Link>
          </div>

          {staffWorkload.length === 0 ? (
            <p className="text-sm text-slate-400">No complaint has been assigned to anyone yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-3 py-2">Staff member</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2 text-right">Open</th>
                    <th className="px-3 py-2 text-right">Resolved</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffWorkload.map((row) => (
                    <tr key={row.staff}>
                      <td className="px-3 py-2 font-medium text-ink">{row.staff}</td>
                      <td className="px-3 py-2 text-slate-600">{row.department}</td>
                      <td className="px-3 py-2 text-right text-amber-700">{row.open}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{row.resolved}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-ink">Campus community</h2>
            <ul className="space-y-2 text-sm">
              {(usersByRole || []).map((row) => (
                <li key={row.role} className="flex items-center justify-between">
                  <span className="text-slate-600 capitalize">{row.role} accounts</span>
                  <span className="font-semibold text-ink">{row.count}</span>
                </li>
              ))}
            </ul>
            {performance.averageRating && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                Average student rating{' '}
                <span className="font-semibold text-ink">{performance.averageRating}/5</span> from{' '}
                {performance.feedbackCount} responses
              </p>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-ink">Latest activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing has happened yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {recentActivity.slice(0, 6).map((entry) => (
                  <li key={entry._id} className="border-l-2 border-brand-200 pl-3">
                    <p className="text-ink">{entry.message}</p>
                    <p className="text-xs text-slate-400">{timeAgo(entry.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
