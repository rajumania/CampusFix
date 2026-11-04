import { useState } from 'react';
import { analyticsApi } from '../../services/endpoints.js';
import { useApi } from '../../hooks/useApi.js';
import { PageHeader, StatCard } from '../../components/StatCard.jsx';
import { CategoryChart, MonthlyChart, StatusChart, WorkloadChart } from '../../components/Charts.jsx';
import { ErrorState } from '../../components/States.jsx';
import { PageSkeleton } from '../../components/Spinner.jsx';
import { Select } from '../../components/Filters.jsx';

const MONTH_OPTIONS = [3, 6, 12].map((months) => ({ value: String(months), label: `Last ${months} months` }));

export default function Analytics() {
  const { data, error, loading, refresh } = useApi(analyticsApi.dashboard, 'admin-analytics');
  const [months, setMonths] = useState('6');

  const { data: monthly, loading: monthlyLoading } = useApi(
    () => analyticsApi.monthly(Number(months)),
    `monthly-${months}`
  );

  if (loading) return <PageSkeleton rows={6} />;
  if (error) return <ErrorState error={error} onRetry={refresh} />;

  const { summary, byCategory, performance, staffWorkload } = data;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Reporting performance across the whole campus, straight from the complaint collection."
        actions={<Select label="Range" value={months} onChange={setMonths} options={MONTH_OPTIONS} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total complaints" value={summary.total} tone="brand" />
        <StatCard
          label="Closure rate"
          value={`${performance.resolutionRatePercent}%`}
          tone="emerald"
          hint="share of all complaints resolved"
        />
        <StatCard
          label="Average time to resolve"
          value={performance.avgResolutionHours ? `${performance.avgResolutionHours} h` : '—'}
          tone="amber"
          hint="from submission to closure"
        />
        <StatCard
          label="Student satisfaction"
          value={performance.averageRating ? `${performance.averageRating}/5` : '—'}
          tone="slate"
          hint={`${performance.feedbackCount} ratings collected`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink">Complaints by category</h2>
          <CategoryChart data={byCategory} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink">Complaints by status</h2>
          <StatusChart summary={summary} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-ink">Monthly statistics</h2>
          {monthlyLoading ? <PageSkeleton rows={2} /> : <MonthlyChart data={monthly || []} />}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2 text-right">Received</th>
                  <th className="px-3 py-2 text-right">Resolved</th>
                  <th className="px-3 py-2 text-right">Rejected</th>
                  <th className="px-3 py-2 text-right">Still open</th>
                  <th className="px-3 py-2 text-right">Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(monthly || []).map((row) => (
                  <tr key={row.month}>
                    <td className="px-3 py-2 font-medium text-ink">{row.month}</td>
                    <td className="px-3 py-2 text-right">{row.total}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{row.resolved}</td>
                    <td className="px-3 py-2 text-right text-rose-700">{row.rejected}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{row.open}</td>
                    <td className="px-3 py-2 text-right">{row.critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-ink">Resolution performance by staff</h2>
          <WorkloadChart data={staffWorkload} />
        </div>
      </div>
    </>
  );
}
