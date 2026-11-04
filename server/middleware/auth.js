import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * The user is re-read on every request so a deactivated account or a revoked
 * role takes effect immediately instead of at token expiry.
 */
export async function protect(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Not authorised: no access token supplied');
  }

  const token = header.slice('Bearer '.length).trim();

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session expired, please sign in again');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findById(payload.sub).select('_id name email role isActive');
  if (!user) throw ApiError.unauthorized('This account no longer exists');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  req.user = user;
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Only ${roles.join(' or ')} may perform this action`));
    }
    return next();
  };
}
