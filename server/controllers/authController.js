import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { signToken } from '../utils/jwt.js';
import { sendCreated, sendSuccess } from '../utils/apiResponse.js';
import { ROLES } from '../utils/constants.js';

const PUBLIC_SIGNUP_ROLES = [ROLES.STUDENT];

export async function register(req, res) {
  const { name, email, password, studentId, department, phone } = req.body || {};

  // Mass-assignment guard: the client must not be able to hand itself a
  // privileged role through this public endpoint.
  if (req.body.role !== undefined && !PUBLIC_SIGNUP_ROLES.includes(req.body.role)) {
    throw ApiError.forbidden('Public sign-up can only create student accounts');
  }

  const existing = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({
    name,
    email,
    password,
    studentId,
    department,
    phone,
    role: ROLES.STUDENT,
  });

  return sendCreated(res, {
    message: 'Registration successful',
    data: { user, token: signToken(user) },
  });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw ApiError.badRequest('Email and password are both required');

  // The password is select:false, so it has to be asked for explicitly.
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

  return sendSuccess(res, {
    message: 'Login successful',
    data: { user: user.toJSON(), token: signToken(user) },
  });
}

export async function getMe(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('Account not found');
  return sendSuccess(res, { message: 'OK', data: { user } });
}
