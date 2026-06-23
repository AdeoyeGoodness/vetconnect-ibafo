import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { sanitizeUser } from '../auth/auth.service.js';

export async function listUsers({ page, limit, offset, role, search }) {
  const where = [];
  const params = [];
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM users ${whereSql}`, params);
  const total = countRes.rows[0].total;

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM users ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { items: rows.map(sanitizeUser), total, page, limit };
}

export async function getUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (!rows[0]) throw ApiError.notFound('User not found');
  return sanitizeUser(rows[0]);
}

export async function updateMe(userId, data) {
  const allowed = ['full_name', 'phone', 'location', 'avatar_url'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (!sets.length) throw ApiError.badRequest('No valid fields to update');

  params.push(userId);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  return sanitizeUser(rows[0]);
}

export async function setStatus(id, isActive) {
  const { rows } = await query(
    'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  return sanitizeUser(rows[0]);
}

export async function deleteUser(id) {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('User not found');
}
