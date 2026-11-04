import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Complaint from '../models/Complaint.js';
import ApiError from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { buildPageMeta, getPagination } from '../utils/pagination.js';
import { recordActivity } from '../services/activityLog.js';
import { COMPLAINT_STATUS, ROLES } from '../utils/constants.js';

export async function submitFeedback(req, res) {
  const { rating, comment } = req.body || {};

  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid complaint id');

  const complaint = await Complaint.findOne({ _id: req.params.id, isDeleted: false });
  if (!complaint) throw ApiError.notFound('Complaint not found');

  if (!complaint.reportedBy.equals(req.user._id)) {
    throw ApiError.forbidden('Only the student who raised a complaint can rate it');
  }
  if (complaint.status !== COMPLAINT_STATUS.RESOLVED) {
    throw ApiError.conflict('Feedback can only be given once the complaint is resolved');
  }

  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw ApiError.badRequest('Rating must be a whole number between 1 and 5');
  }

  const already = await Feedback.findOne({ complaint: complaint._id });
  if (already) throw ApiError.conflict('You have already submitted feedback for this complaint');

  const feedback = await Feedback.create({
    complaint: complaint._id,
    student: req.user._id,
    rating: value,
    comment,
  });

  await recordActivity({
    complaint,
    actor: req.user,
    action: 'feedback_submitted',
    message: `${req.user.name} rated the resolution ${value}/5`,
    meta: { rating: value },
  });

  const populated = await feedback.populate([
    { path: 'student', select: 'name' },
    { path: 'complaint', select: 'title category status' },
  ]);

  return sendCreated(res, { message: 'Feedback recorded', data: { feedback: populated } });
}

export async function listFeedback(req, res) {
  const { page, limit, skip } = getPagination(req.query);

  // Students only ever see their own ratings; administrators see the whole set.
  const filter =
    req.user.role === ROLES.ADMIN ? {} : { student: req.user._id };

  const [items, total] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('student', 'name email studentId')
      .populate('complaint', 'title category priority status resolvedAt'),
    Feedback.countDocuments(filter),
  ]);

  return sendSuccess(res, { data: { feedback: items, page: buildPageMeta({ page, limit, total }) } });
}
