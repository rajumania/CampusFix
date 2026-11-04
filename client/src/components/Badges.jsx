import { PRIORITY_BADGE, STATUSES } from '../utils/constants.js';

const base =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap';

export function StatusBadge({ status }) {
  const meta = STATUSES[status] || { label: status, badge: 'bg-slate-100 text-slate-700 ring-slate-200' };
  return <span className={`${base} ${meta.badge}`}>{meta.label}</span>;
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`${base} ${PRIORITY_BADGE[priority] || PRIORITY_BADGE.medium}`}>
      {priority ? priority[0].toUpperCase() + priority.slice(1) : 'Medium'}
    </span>
  );
}

export function RoleBadge({ role }) {
  const map = {
    student: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    admin: 'bg-purple-50 text-purple-700 ring-purple-200',
    staff: 'bg-teal-50 text-teal-700 ring-teal-200',
  };
  return <span className={`${base} ${map[role] || map.student}`}>{role}</span>;
}
