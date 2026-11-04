import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from './Badges.jsx';
import { formatDate, timeAgo } from '../utils/format.js';

const COLUMNS = {
  student: ['Category', 'Priority', 'Status', 'Submitted'],
  admin: ['Reporter', 'Category', 'Priority', 'Status', 'Assigned to', 'Submitted'],
  staff: ['Reporter', 'Category', 'Priority', 'Status', 'Location', 'Assigned'],
};

function cellsFor(complaint, variant) {
  const who = (person) => person?.name || 'Unassigned';
  const map = {
    Reporter: complaint.reportedBy?.name || '-',
    Category: complaint.category,
    Priority: <PriorityBadge priority={complaint.priority} />,
    Status: <StatusBadge status={complaint.status} />,
    'Assigned to': who(complaint.assignedTo),
    'Location': complaint.location || '-',
    Submitted: (
      <span title={formatDate(complaint.createdAt)}>{timeAgo(complaint.createdAt)}</span>
    ),
    Assigned: (
      <span title={formatDate(complaint.updatedAt)}>{timeAgo(complaint.updatedAt)}</span>
    ),
  };
  return COLUMNS[variant].map((header) => map[header]);
}

export function ComplaintTable({ complaints, variant }) {
  const headers = COLUMNS[variant];

  return (
    <>
      {/* Table on wide screens, stacked cards on phones. */}
      <div className="card hidden overflow-hidden md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Complaint</th>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map((complaint) => {
              const cells = cellsFor(complaint, variant);
              return (
                <tr key={complaint._id} className="transition hover:bg-slate-50">
                  <td className="max-w-xs px-4 py-3">
                    <Link to={`/complaints/${complaint._id}`} className="font-medium text-brand-700 hover:underline">
                      {complaint.title}
                    </Link>
                  </td>
                  {cells.map((cell, i) => (
                    <td key={headers[i]} className="px-4 py-3 text-slate-600">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {complaints.map((complaint) => (
          <Link key={complaint._id} to={`/complaints/${complaint._id}`} className="card block p-4">
            <p className="font-medium text-brand-700">{complaint.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              <span className="text-xs text-slate-500">{complaint.category}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {complaint.reportedBy?.name ? `${complaint.reportedBy.name} · ` : ''}
              {formatDate(complaint.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
