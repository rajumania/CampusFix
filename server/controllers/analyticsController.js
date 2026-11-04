import Complaint from '../models/Complaint.js';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { CATEGORIES, COMPLAINT_STATUS, ROLES } from '../utils/constants.js';

const BASE_FILTER = { isDeleted: false };

function scope(user) {
  if (user.role === ROLES.ADMIN) return BASE_FILTER;
  if (user.role === ROLES.STAFF) return { ...BASE_FILTER, assignedTo: user._id };
  return { ...BASE_FILTER, reportedBy: user._id };
}

async function countByStatus(match) {
  const rows = await Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(Object.values(COMPLAINT_STATUS).map((s) => [s, 0]));
  for (const row of rows) counts[row._id] = row.count;
  return counts;
}

async function countByCategory(match) {
  const rows = await Complaint.aggregate([
    { $match: match },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const lookup = new Map(rows.map((r) => [r._id, r.count]));
  // Categories with no complaints still appear, so the chart axis stays stable.
  return CATEGORIES.map((category) => ({ category, count: lookup.get(category) || 0 }));
}

async function monthlyStatistics(match, months) {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCMonth(since.getUTCMonth() - (months - 1));

  const rows = await Complaint.aggregate([
    { $match: { ...match, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', COMPLAINT_STATUS.RESOLVED] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', COMPLAINT_STATUS.REJECTED] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const lookup = new Map(rows.map((r) => [r._id, r]));
  const buckets = [];
  const cursor = new Date(since);
  for (let i = 0; i < months; i += 1) {
    const key = cursor.toISOString().slice(0, 7);
    const row = lookup.get(key);
    buckets.push({
      month: key,
      total: row?.total ?? 0,
      resolved: row?.resolved ?? 0,
      rejected: row?.rejected ?? 0,
      critical: row?.critical ?? 0,
      open: (row?.total ?? 0) - (row?.resolved ?? 0) - (row?.rejected ?? 0),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return buckets;
}

async function resolutionPerformance() {
  const [aggregateRow] = await Complaint.aggregate([
    { $match: { ...BASE_FILTER, resolvedAt: { $ne: null } } },
    {
      $group: {
        _id: null,
        resolvedCount: { $sum: 1 },
        avgHours: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } },
      },
    },
  ]);

  const [ratingRow] = await Feedback.aggregate([
    { $group: { _id: null, avgRating: { $avg: '$rating' }, feedbackCount: { $sum: 1 } } },
  ]);

  const totalHandled = await Complaint.countDocuments(BASE_FILTER);
  const resolvedCount = aggregateRow?.resolvedCount ?? 0;

  return {
    resolvedCount,
    resolutionRatePercent: totalHandled
      ? Number(((resolvedCount / totalHandled) * 100).toFixed(1))
      : 0,
    avgResolutionHours: aggregateRow?.avgHours
      ? Number((aggregateRow.avgHours / 3600000).toFixed(1))
      : null,
    averageRating: ratingRow?.avgRating ? Number(ratingRow.avgRating.toFixed(2)) : null,
    feedbackCount: ratingRow?.feedbackCount ?? 0,
  };
}

async function staffWorkload() {
  const rows = await Complaint.aggregate([
    { $match: { ...BASE_FILTER, assignedTo: { $ne: null } } },
    {
      $group: {
        _id: '$assignedTo',
        total: { $sum: 1 },
        open: {
          $sum: {
            $cond: [{ $in: ['$status', [COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS]] }, 1, 0],
          },
        },
        resolved: { $sum: { $cond: [{ $eq: ['$status', COMPLAINT_STATUS.RESOLVED] }, 1, 0] } },
      },
    },
  ]);

  const staffIds = rows.map((r) => r._id);
  const staffMembers = await User.find({ _id: { $in: staffIds } }).select('name department');
  const nameById = new Map(staffMembers.map((s) => [s._id.toString(), s]));

  return rows
    .map((row) => ({
      staff: nameById.get(row._id.toString())?.name || 'Unknown',
      department: nameById.get(row._id.toString())?.department || '-',
      total: row.total,
      open: row.open,
      resolved: row.resolved,
    }))
    .sort((a, b) => b.open - a.open);
}

export async function dashboard(req, res) {
  const user = req.user;
  const match = scope(user);

  const byStatus = await countByStatus(match);
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

  const summary = {
    total,
    pending: byStatus[COMPLAINT_STATUS.PENDING],
    assigned: byStatus[COMPLAINT_STATUS.ASSIGNED],
    inProgress: byStatus[COMPLAINT_STATUS.IN_PROGRESS],
    resolved: byStatus[COMPLAINT_STATUS.RESOLVED],
    rejected: byStatus[COMPLAINT_STATUS.REJECTED],
    // Anything not yet closed - what a student would call "still open".
    open:
      byStatus[COMPLAINT_STATUS.PENDING] +
      byStatus[COMPLAINT_STATUS.ASSIGNED] +
      byStatus[COMPLAINT_STATUS.IN_PROGRESS],
  };

  const data = { summary };

  if (user.role === ROLES.ADMIN) {
    const [byCategory, monthly, performance, workload, userCounts, recentActivity] =
      await Promise.all([
        countByCategory(BASE_FILTER),
        monthlyStatistics(BASE_FILTER, 6),
        resolutionPerformance(),
        staffWorkload(),
        User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $project: { _id: 0, role: '$_id', count: 1 } },
        ]),
        Activity.find().sort({ createdAt: -1 }).limit(10).populate('actor', 'name role'),
      ]);

    Object.assign(data, {
      byCategory,
      monthly,
      performance,
      staffWorkload: workload,
      usersByRole: userCounts,
      recentActivity,
      criticalOpen: await Complaint.countDocuments({
        ...BASE_FILTER,
        priority: 'critical',
        status: { $in: [COMPLAINT_STATUS.PENDING, COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] },
      }),
    });
  } else {
    const [recent, byCategory] = await Promise.all([
      Complaint.find(match).sort({ updatedAt: -1 }).limit(5).populate('assignedTo', 'name'),
      countByCategory(match),
    ]);
    data.recentComplaints = recent;
    data.byCategory = byCategory;

    if (user.role === ROLES.STAFF) {
      data.unassignedWaiting = await Complaint.countDocuments({
        ...BASE_FILTER,
        status: COMPLAINT_STATUS.PENDING,
      });
    }
  }

  return sendSuccess(res, { data });
}

export async function complaintsByCategory(req, res) {
  return sendSuccess(res, { data: { categories: await countByCategory(scope(req.user)) } });
}

export async function monthlyStats(req, res) {
  const months = Number(req.query.months || 6);
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw ApiError.badRequest('`months` must be an integer between 1 and 24');
  }
  return sendSuccess(res, { data: { months: await monthlyStatistics(scope(req.user), months) } });
}
