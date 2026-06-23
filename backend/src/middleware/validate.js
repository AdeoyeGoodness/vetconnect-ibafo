import { ApiError } from '../utils/ApiError.js';

/**
 * Validate req[source] against a Zod schema. On success replaces it with the
 * parsed (coerced, stripped) value. On failure raises a 422 with field details.
 * Usage: router.post('/', validate(createSchema), handler)
 *        router.get('/', validate(querySchema, 'query'), handler)
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return next(ApiError.unprocessable('Validation failed', details));
  }
  // req.query can be read-only in some setups; assign defensively.
  try { req[source] = result.data; } catch { /* query getter only — ignore */ }
  next();
};

export default validate;
