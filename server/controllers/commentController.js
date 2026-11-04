import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Complaint from '../models/Complaint.js';
import ApiError from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { buildPageMeta, getPagination } from '../utils/pagination.js';
import { recordActivity } from '../services/activityLog.js';
import { ROLES } from '../utils/constants.js';

/**
 * A comment thread is visible to the reporting student, the assigned staff
 * member and every administrator - nobody else.
 */
async function requireParticipant(complaintId, user) {
  if (!mongoose.isValidObjectId(complaintId)) throw ApiError.badRequest('Invalid complaint id');

  const complaint = await Complaint.findOne({ _id: complaintId, isDeleted: false });
  if (!complaint) throw ApiError.notFound('Complaint not found');

  if (user.role === ROLES.ADMIN) return complaint;
  if (user.role === ROLES.STAFF && complaint.assignedTo?.equals(user._id)) return complaint;
  if (user.role === ROLES.STUDENT && complaint.reportedBy.equals(user._id)) return complaint;

  throw ApiError.forbidden('You are not a participant in this complaint');
}

export async function addComment(req, res) {
  const complaint = await requireParticipant(req.params.id, req.user);

  const { text } = req.body || {};
  if (!text || !String(text).trim()) throw ApiError.badRequest('Comment text cannot be empty');

  const comment = await Comment.create({
    complaint: complaint._id,
    author: req.user._id,
    text: String(text).trim(),
  });

  await recordActivity({
    complaint,
    actor: req.user,
    action: 'comment_added',
    message: `${req.user.name} added a comment`,
    meta: { commentId: comment._id },
  });

  const populated = await comment.populate('author', 'name role');
  return sendCreated(res, { message: 'Comment added', data: { comment: populated } });
}

export async function listComments(req, res) {
  const complaint = await requireParticipant(req.params.id, req.user);
  const { page, limit, skip } = getPagination(req.query);

  const filter = { complaint: complaint._id };
  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name role'),
    Comment.countDocuments(filter),
  ]);

  return sendSuccess(res, { data: { comments, page: buildPageMeta({ page, limit, total }) } });
}
