import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import ApiError from '../utils/ApiError.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { buildPageMeta, escapeRegex, getPagination } from '../utils/pagination.js';
import { ROLES } from '../utils/constants.js';

const ASSIGNABLE_ROLES = [ROLES.ADMIN, ROLES.STAFF];

export async function listUsers(req, res) {
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (req.query.role) {
    if (!Object.values(ROLES).includes(req.query.role)) {
      throw ApiError.badRequest('Unknown role filter');
    }
    filter.role = req.query.role;
  }
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { studentId: rx }, { staffId: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, { data: { users, page: buildPageMeta({ page, limit, total }) } });
}

export async function getUser(req, res) {
  const isSelf = req.user._id.equals(req.params.id);
  if (!isSelf && req.user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You may only view your own profile');
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw ApiError.notFound('User not found');
  return sendSuccess(res, { data: { user } });
}

/** Admin-only provisioning of staff and administrator accounts. */
export async function createUser(req, res) {
  const { name, email, password, role, department, phone, staffId, studentId } = req.body || {};

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw ApiError.badRequest('Administrator accounts may only create staff or admin users');
  }
  const existing = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({
    name,
    email,
    password,
    role,
    department,
    phone,
    staffId: role === ROLES.STAFF ? staffId : undefined,
    studentId: role === ROLES.STUDENT ? studentId : undefined,
  });

  return sendCreated(res, {
    message: `${role === ROLES.ADMIN ? 'Administrator' : 'Staff'} account created`,
    data: { user },
  });
}

export async function updateUser(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');

  const isSelf = req.user._id.equals(target._id);
  const isAdmin = req.user.role === ROLES.ADMIN;
  if (!isSelf && !isAdmin) throw ApiError.forbidden('You may only update your own profile');

  const updates = req.body || {};

  if (!isAdmin) {
    // A non-admin editing their own profile may not change privileged fields.
    const blocked = ['role', 'isActive', 'email', 'studentId', 'staffId'];
    const attempted = blocked.filter((field) => updates[field] !== undefined);
    if (attempted.length) {
      throw ApiError.forbidden(`Only an administrator can change: ${attempted.join(', ')}`);
    }
  }

  if (isSelf && (updates.role !== undefined || updates.isActive === false)) {
    throw ApiError.badRequest('You cannot change your own role or deactivate your own account');
  }

  if (updates.role !== undefined && !Object.values(ROLES).includes(updates.role)) {
    throw ApiError.badRequest('Unknown role');
  }
  if (updates.email) {
    const clash = await User.findOne({ email: updates.email.toLowerCase().trim() });
    if (clash && !clash._id.equals(target._id)) throw ApiError.conflict('Email is already in use');
  }

  const allowed = [
    'name',
    'email',
    'role',
    'department',
    'phone',
    'studentId',
    'staffId',
    'isActive',
    'password',
  ];
  for (const field of allowed) {
    if (updates[field] !== undefined) {
      if (field === 'password' && !updates.password) {
        throw ApiError.badRequest('Password cannot be blank');
      }
      target[field] = updates[field];
    }
  }

  await target.save();
  return sendSuccess(res, { message: 'Profile updated', data: { user: target.toJSON() } });
}

export async function deleteUser(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');
  if (req.user._id.equals(target._id)) {
    throw ApiError.badRequest('You cannot delete the account you are signed in with');
  }

  // Deleting a user would orphan their complaints and blank out the audit trail,
  // so history-bearing accounts must be deactivated instead.
  const linked = await Complaint.countDocuments({
    $or: [{ reportedBy: target._id }, { assignedTo: target._id }],
  });
  if (linked > 0) {
    throw ApiError.conflict(
      `This account is linked to ${linked} complaint(s). Set it inactive instead of deleting it.`
    );
  }

  await target.deleteOne();
  return sendSuccess(res, { message: 'User deleted' });
}
