import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Map common PostgreSQL errors to friendly responses.
  if (err.code === '23505') { status = 409; message = 'A record with these details already exists'; }
  if (err.code === '23503') { status = 400; message = 'Referenced record does not exist'; }
  if (err.code === '22P02') { status = 400; message = 'Invalid identifier format'; }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    success: false,
    error: message,
    ...(details ? { details } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
}
