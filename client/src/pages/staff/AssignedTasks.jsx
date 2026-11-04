import { useMemo, useState } from 'react';
import { ComplaintList } from '../../components/ComplaintList.jsx';

const TABS = {
  open: { label: 'Open tasks', query: { open: 'true' } },
  completed: { label: 'Completed work', query: { status: 'resolved' } },
  all: { label: 'Everything assigned', query: {} },
};

export default function AssignedTasks() {
  const [tab, setTab] = useState('open');
  const baseQuery = useMemo(() => TABS[tab].query, [tab]);

  return (
    <div className="mb-5">
      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1">
        {Object.entries(TABS).map(([key, definition]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
              tab === key ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-ink'
            }`}
          >
            {definition.label}
          </button>
        ))}
      </div>

      <ComplaintList
        key={tab}
        variant="staff"
        baseQuery={baseQuery}
        title="Assigned tasks"
        description="Complaints assigned to you. Open one to post progress or close it with resolution remarks."
      />
    </div>
  );
}
