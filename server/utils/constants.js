export const ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
  STAFF: 'staff',
};

export const COMPLAINT_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
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

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export const ACTIVITY_ACTIONS = [
  'created',
  'assigned',
  'unassigned',
  'status_changed',
  'priority_changed',
  'updated',
  'comment_added',
  'feedback_submitted',
  'deleted',
];

// Which statuses a staff member may move an assigned complaint into.
export const STAFF_ALLOWED_STATUS = [
  COMPLAINT_STATUS.IN_PROGRESS,
  COMPLAINT_STATUS.RESOLVED,
];
