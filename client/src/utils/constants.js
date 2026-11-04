export const ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
  STAFF: 'staff',
};

export const HOME_BY_ROLE = {
  [ROLES.STUDENT]: '/student',
  [ROLES.ADMIN]: '/admin',
  [ROLES.STAFF]: '/staff',
};

export const CATEGORIES = [
  'Electrical',
  'Internet/Wi-Fi',
  'Hostel',
  'Classroom',
  'Laboratory',
  'Water Supply',
  'Sanitation',
  'Other',
];

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const STATUSES = {
  pending: { label: 'Pending', badge: 'bg-slate-100 text-slate-700 ring-slate-200' },
  assigned: { label: 'Assigned', badge: 'bg-sky-50 text-sky-700 ring-sky-200' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-50 text-amber-800 ring-amber-200' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'Rejected', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const PRIORITY_BADGE = {
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
  medium: 'bg-blue-50 text-blue-700 ring-blue-200',
  high: 'bg-orange-50 text-orange-700 ring-orange-200',
  critical: 'bg-red-50 text-red-700 ring-red-200',
};

export const ACTIVITY_LABEL = {
  created: 'Reported',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  status_changed: 'Status changed',
  priority_changed: 'Priority changed',
  updated: 'Edited',
  comment_added: 'Comment',
  feedback_submitted: 'Feedback',
  deleted: 'Deleted',
};

export const CHART_COLORS = ['#2547eb', '#3b66f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
