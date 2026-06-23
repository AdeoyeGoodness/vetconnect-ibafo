import { paginate } from '../src/utils/response.js';
import { ApiError } from '../src/utils/ApiError.js';
import { hashPassword, comparePassword } from '../src/utils/password.js';
import { signToken, verifyToken } from '../src/utils/jwt.js';

describe('paginate', () => {
  test('defaults to page 1, limit 20', () => {
    const m = paginate({}, 100);
    expect(m).toMatchObject({ page: 1, limit: 20, total: 100, totalPages: 5, offset: 0 });
  });
  test('computes offset and clamps limit to 100', () => {
    const m = paginate({ page: '3', limit: '500' }, 1000);
    expect(m.limit).toBe(100);
    expect(m.offset).toBe(200);
  });
  test('never returns fewer than 1 total page', () => {
    expect(paginate({}, 0).totalPages).toBe(1);
  });
});

describe('ApiError', () => {
  test('factory methods set correct status codes', () => {
    expect(ApiError.notFound().statusCode).toBe(404);
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.conflict().statusCode).toBe(409);
    expect(ApiError.unprocessable('x', [{ path: 'a', message: 'b' }]).details).toHaveLength(1);
  });
  test('is an instance of Error and flagged operational', () => {
    const e = ApiError.badRequest('nope');
    expect(e).toBeInstanceOf(Error);
    expect(e.isOperational).toBe(true);
  });
});

describe('password hashing', () => {
  test('hash differs from plaintext and verifies', async () => {
    const hash = await hashPassword('Password123');
    expect(hash).not.toBe('Password123');
    expect(await comparePassword('Password123', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});

describe('jwt', () => {
  test('signs and verifies a payload round-trip', () => {
    const token = signToken({ sub: 'user-123', role: 'OWNER' });
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('OWNER');
  });
});
