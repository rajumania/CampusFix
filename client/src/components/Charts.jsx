import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, STATUSES } from '../utils/constants.js';

const AXIS = { fontSize: 12, stroke: '#94a3b8' };
const TOOLTIP = { contentStyle: { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 } };

export function CategoryChart({ data }) {
  const rows = data.filter((row) => row.count > 0);
  if (!rows.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 12, left: -18, bottom: 24 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="category" tick={AXIS} interval={0} angle={-30} textAnchor="end" height={62} />
        <YAxis tick={AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="count" name="Complaints" radius={[6, 6, 0, 0]}>
          {rows.map((row, index) => (
            <Cell key={row.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusChart({ summary }) {
  const rows = Object.entries(STATUSES)
    .map(([key, meta]) => ({ name: meta.label, value: summary[key] ?? 0 }))
    .filter((row) => row.value > 0);

  if (!rows.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
          {rows.map((row, index) => (
            <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Tooltip {...TOOLTIP} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyChart({ data }) {
  if (!data.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={AXIS} />
        <YAxis tick={AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="total" name="Received" stroke="#2547eb" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WorkloadChart({ data }) {
  const rows = data.map((row) => ({ ...row, name: row.staff.split(' ')[0] }));
  if (!rows.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={AXIS} />
        <YAxis tick={AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP} cursor={{ fill: '#f1f5f9' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="open" name="Still open" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
        <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
      No data for this chart yet
    </div>
  );
}
