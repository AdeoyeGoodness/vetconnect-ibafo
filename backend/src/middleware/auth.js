import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { query } from '../db/pool.js';

/**
 * Authenticate via Bearer JWT. Attaches req.user = { id, role, email, full_name }.
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Authentication token missing');

    const decoded = verifyToken(token);
    const { rows } = await query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1',
      [decoded.sub]
    );
    const user = rows[0];
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (!user.is_active) throw ApiError.forbidden('Account is disabled');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token expired'));
    if (err.name === 'JsonWebTokenError') return next(ApiError.unauthorized('Invalid token'));
    next(err);
  }
}

/** Optional auth: attaches req.user when a valid token is present, else continues as guest. */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const decoded = verifyToken(header.slice(7));
    const { rows } = await query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1',
      [decoded.sub]
    );
    if (rows[0]?.is_active) req.user = rows[0];
  } catch { /* ignore — treat as guest */ }
  next();
}

/** Role-based access control. Usage: authorize('SUPER_ADMIN'), authorize('CLINIC_ADMIN','SUPER_ADMIN'). */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}
