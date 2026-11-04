import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import Comment from '../models/Comment.js';
import Activity from '../models/Activity.js';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { buildPageMeta, escapeRegex, getPagination, parseDateRange } from '../utils/pagination.js';
import { uploadImage, deleteImages } from '../services/cloudinary.js';
import { recordActivity } from '../services/activityLog.js';
import {
  CATEGORIES,
  COMPLAINT_STATUS,
  PRIORITIES,
  ROLES,
  STAFF_ALLOWED_STATUS,
} from '../utils/constants.js';

const SORTABLE = new Set(['createdAt', 'updatedAt', 'priority', 'status', 'title']);
const OPEN_STATUSES = [
  COMPLAINT_STATUS.PENDING,
  COMPLAINT_STATUS.ASSIGNED,
  COMPLAINT_STATUS.IN_PROGRESS,
];

function assertEnum(value, values, label) {
  if (!values.includes(value)) throw ApiError.badRequest(`Unknown ${label}: ${value}`);
}

/**
 * Roles see different slices of the same collection:
 * student -> own reports, staff -> own assignments, admin -> everything.
 */
function scopeFilter(user) {
  if (user.role === ROLES.ADMIN) return {};
  if (user.role === ROLES.STAFF) return { assignedTo: user._id };
  return { reportedBy: user._id };
}

async function findAccessible(id, user) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid complaint id');

  // isDeleted is filtered here too, otherwise a deleted complaint would stay
  // readable by direct id even though it vanished from every list.
  const complaint = await Complaint.findOne({ _id: id, isDeleted: false, ...scopeFilter(user) })
    .populate('reportedBy', 'name email studentId department')
    .populate('assignedTo', 'name email staffId department phone')
    .populate('deletedBy', 'name');

  if (!complaint) throw ApiError.notFound('Complaint not found or not visible to you');
  return complaint;
}

export async function createComplaint(req, res) {
  const { title, description, category, priority, location } = req.body || {};

  assertEnum(category, CATEGORIES, 'category');
  if (priority !== undefined) assertEnum(priority, PRIORITIES, 'priority');

  const files = req.files || [];
  const images = [];
  for (const file of files) {
    images.push(await uploadImage(file.buffer));
  }

  const complaint = await Complaint.create({
    title,
    description,
    category,
    priority: priority || 'medium',
    location,
    images,
    reportedBy: req.user._id,
    status: COMPLAINT_STATUS.PENDING,
  });

  await recordActivity({
    complaint,
    actor: req.user,
    action: 'created',
    message: `${req.user.name} reported a ${complaint.category} issue`,
    meta: { status: complaint.status, priority: complaint.priority },
  });

  const populated = await complaint.populate([
    { path: 'reportedBy', select: 'name email studentId' },
  ]);

  return sendCreated(res, { message: 'Complaint submitted', data: { complaint: populated } });
}

export async function listComplaints(req, res) {
  const { page, limit, skip } = getPagination(req.query);

  const filter = { ...scopeFilter(req.user), isDeleted: false };

  if (req.query.status) {
    assertEnum(req.query.status, Object.values(COMPLAINT_STATUS), 'status');
    filter.status = req.query.status;
  }
  if (req.query.category) {
    assertEnum(req.query.category, CATEGORIES, 'category');
    filter.category = req.query.category;
  }
  if (req.query.priority) {
    assertEnum(req.query.priority, PRIORITIES, 'priority');
    filter.priority = req.query.priority;
  }
  if (req.query.open === 'true') filter.status = { $in: OPEN_STATUSES };

  const dateRange = parseDateRange(req.query);
  if (dateRange) filter.createdAt = dateRange;

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }

  // Only an administrator may filter by another person's queue.
  if (req.query.assignedTo && req.user.role === ROLES.ADMIN) {
    if (!mongoose.isValidObjectId(req.query.assignedTo)) {
      throw ApiError.badRequest('Invalid assignedTo id');
    }
    filter.assignedTo = req.query.assignedTo;
  }
  if (req.query.reportedBy && req.user.role === ROLES.ADMIN) {
    if (!mongoose.isValidObjectId(req.query.reportedBy)) {
      throw ApiError.badRequest('Invalid reportedBy id');
    }
    filter.reportedBy = req.query.reportedBy;
  }

  const sortKey = SORTABLE.has(req.query.sort) ? req.query.sort : 'createdAt';
  const direction = req.query.order === 'asc' ? 1 : -1;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort({ [sortKey]: direction })
      .skip(skip)
      .limit(limit)
      .populate('reportedBy', 'name email studentId')
      .populate('assignedTo', 'name email staffId'),
    Complaint.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    data: { complaints, page: buildPageMeta({ page, limit, total }) },
  });
}

export async function getComplaint(req, res) {
  const complaint = await findAccessible(req.params.id, req.user);

  const [comments, activities, feedback] = await Promise.all([
    Comment.find({ complaint: complaint._id })
      .sort({ createdAt: 1 })
      .populate('author', 'name role'),
    Activity.find({ complaint: complaint._id })
      .sort({ createdAt: -1 })
      .populate('actor', 'name role'),
    Feedback.findOne({ complaint: complaint._id }).populate('student', 'name'),
  ]);

  return sendSuccess(res, {
    data: { complaint, comments, activities, feedback },
    message: 'OK',
  });
}

export async function updateComplaint(req, res) {
  const complaint = await findAccessible(req.params.id, req.user);
  const isAdmin = req.user.role === ROLES.ADMIN;
  const isOwner = complaint.reportedBy._id.equals(req.user._id);

  if (!isAdmin && !isOwner) throw ApiError.forbidden('You cannot edit this complaint');

  // Once an admin has acted on a report the student may no longer rewrite it,
  // otherwise the assignee would be working from changed facts.
  if (isOwner && !isAdmin && complaint.status !== COMPLAINT_STATUS.PENDING) {
    throw ApiError.conflict('This complaint is already being handled and can no longer be edited');
  }

  const allowed = isAdmin
    ? ['title', 'description', 'category', 'priority', 'location']
    : ['title', 'description', 'location'];

  const changes = {};
  for (const field of allowed) {
    const value = req.body?.[field];
    if (value === undefined) continue;
    if (field === 'category') assertEnum(value, CATEGORIES, 'category');
    if (field === 'priority') assertEnum(value, PRIORITIES, 'priority');
    changes[field] = value;
  }

  if (!Object.keys(changes).length) throw ApiError.badRequest('Nothing to update was supplied');

  Object.assign(complaint, changes);
  await complaint.save();

  if (changes.priority) {
    await recordActivity({
      complaint,
      actor: req.user,
      action: 'priority_changed',
      message: `${req.user.name} set the priority to ${changes.priority}`,
      meta: { priority: changes.priority },
    });
  } else {
    await recordActivity({
      complaint,
      actor: req.user,
      action: 'updated',
      message: `${req.user.name} edited the complaint details`,
      meta: { fields: Object.keys(changes) },
    });
  }

  return sendSuccess(res, { message: 'Complaint updated', data: { complaint } });
}

export async function assignComplaint(req, res) {
  const { assignedTo } = req.body || {};
  const complaint = await Complaint.findById(req.params.id).populate('assignedTo', 'name');
  if (!complaint || complaint.isDeleted) throw ApiError.notFound('Complaint not found');

  // Unassigning is a valid admin action and returns the report to the queue.
  if (!assignedTo) {
    complaint.assignedTo = null;
    complaint.status = COMPLAINT_STATUS.PENDING;
    await complaint.save();
    await recordActivity({
      complaint,
      actor: req.user,
      action: 'unassigned',
      message: `${req.user.name} returned this complaint to the unassigned queue`,
    });
    return sendSuccess(res, { message: 'Complaint unassigned', data: { complaint } });
  }

  if (!mongoose.isValidObjectId(assignedTo)) throw ApiError.badRequest('Invalid staff id');
  const staff = await User.findOne({ _id: assignedTo, role: ROLES.STAFF, isActive: true });
  if (!staff) throw ApiError.badRequest('Complaints can only be assigned to an active staff account');

  if (complaint.status === COMPLAINT_STATUS.RESOLVED || complaint.status === COMPLAINT_STATUS.REJECTED) {
    throw ApiError.conflict('A resolved or rejected complaint cannot be reassigned');
  }

  complaint.assignedTo = staff._id;
  complaint.status = COMPLAINT_STATUS.ASSIGNED;
  await complaint.save();

  await recordActivity({
    complaint,
    actor: req.user,
    action: 'assigned',
    message: `${req.user.name} assigned this complaint to ${staff.name}`,
    meta: { assignedTo: staff._id, assignedToName: staff.name },
  });

  const populated = await complaint.populate('assignedTo', 'name email staffId');
  return sendSuccess(res, { message: 'Complaint assigned', data: { complaint: populated } });
}

export async function updateStatus(req, res) {
  const { status, remarks, rejectionReason } = req.body || {};
  assertEnum(status, Object.values(COMPLAINT_STATUS), 'status');

  const complaint = await findAccessible(req.params.id, req.user);
  const isAdmin = req.user.role === ROLES.ADMIN;
  const isAssignedStaff =
    req.user.role === ROLES.STAFF &&
    complaint.assignedTo &&
    complaint.assignedTo._id.equals(req.user._id);

  if (!isAdmin && !isAssignedStaff) {
    throw ApiError.forbidden('Only an administrator or the assigned staff member may change status');
  }

  if (!isAdmin) {
    if (!STAFF_ALLOWED_STATUS.includes(status)) {
      throw ApiError.forbidden('Staff may only move a complaint to in progress or resolved');
    }
    if (complaint.status === COMPLAINT_STATUS.PENDING) {
      throw ApiError.conflict('Wait for an administrator to assign this complaint first');
    }
  }

  if (status === COMPLAINT_STATUS.RESOLVED && !remarks) {
    throw ApiError.badRequest('Resolution remarks are required when marking a complaint resolved');
  }
  if (status === COMPLAINT_STATUS.REJECTED && !rejectionReason) {
    throw ApiError.badRequest('A rejection reason is required when rejecting a complaint');
  }

  const from = complaint.status;
  complaint.status = status;
  if (status === COMPLAINT_STATUS.RESOLVED) {
    complaint.resolutionRemarks = remarks;
    complaint.resolvedAt = new Date();
  } else if (status === COMPLAINT_STATUS.REJECTED) {
    complaint.rejectionReason = rejectionReason;
    complaint.resolvedAt = null;
  } else {
    complaint.resolvedAt = null;
    if (status !== COMPLAINT_STATUS.IN_PROGRESS) complaint.resolutionRemarks = undefined;
  }

  // Moving back to pending without an owner keeps the queue honest.
  if (status === COMPLAINT_STATUS.PENDING) complaint.assignedTo = null;

  await complaint.save();

  await recordActivity({
    complaint,
    actor: req.user,
    action: 'status_changed',
    message: `${req.user.name} moved this complaint from ${from} to ${status}`,
    meta: { from, to: status, remarks, rejectionReason },
  });

  return sendSuccess(res, { message: `Status updated to ${status}`, data: { complaint } });
}

export async function deleteComplaint(req, res) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.isDeleted) throw ApiError.notFound('Complaint not found');

  complaint.isDeleted = true;
  complaint.deletedBy = req.user._id;
  await complaint.save();

  await deleteImages(complaint.images);

  await recordActivity({
    complaint,
    actor: req.user,
    action: 'deleted',
    message: `${req.user.name} removed this complaint${req.body?.reason ? `: ${req.body.reason}` : ''}`,
    meta: { reason: req.body?.reason },
  });

  return sendSuccess(res, { message: 'Complaint deleted', data: { complaint } });
}
