import { ACTIVITY_LABEL } from '../utils/constants.js';
import { formatDateTime, timeAgo } from '../utils/format.js';

const DOT = {
  created: 'bg-brand-600',
  assigned: 'bg-sky-500',
  unassigned: 'bg-slate-400',
  status_changed: 'bg-amber-500',
  priority_changed: 'bg-purple-500',
  updated: 'bg-slate-400',
  comment_added: 'bg-slate-300',
  feedback_submitted: 'bg-emerald-500',
  deleted: 'bg-rose-500',
};

export function ActivityTimeline({ activities }) {
  if (!activities.length) {
    return <p className="text-sm text-slate-400">No history recorded for this complaint.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {activities.map((entry) => (
        <li key={entry._id} className="relative">
          <span
            className={`absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white ${DOT[entry.action] || 'bg-slate-400'}`}
          />
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {ACTIVITY_LABEL[entry.action] || entry.action}
          </p>
          <p className="mt-1 text-sm text-ink">{entry.message}</p>
          <p className="mt-0.5 text-xs text-slate-400" title={formatDateTime(entry.createdAt)}>
            {timeAgo(entry.createdAt)}
            {entry.actor?.role ? ` · ${entry.actor.role}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
