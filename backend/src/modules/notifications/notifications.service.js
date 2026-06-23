import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

export async function listNotifications(userId, { status, channel }, { limit, offset }) {
  const params = [userId];
  const where = ['user_id = $1'];

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (channel) {
    params.push(channel);
    where.push(`channel = $${params.length}`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const totalRes = await query(`SELECT COUNT(*)::int AS total FROM notifications ${whereSql}`, params);
  const total = totalRes.rows[0].total;

  const dataParams = [...params, limit, offset];
  const { rows } = await query(
    `SELECT id, user_id, channel, subject, body, payload, status, error, sent_at, read_at, created_at
       FROM notifications
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total };
}

export async function markRead(userId, id) {
  const { rows } = await query(
    `UPDATE notifications
        SET status = 'READ', read_at = COALESCE(read_at, NOW())
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
    [id, userId]
  );
  if (!rows[0]) throw ApiError.notFound('Notification not found');
  return rows[0];
}

export async function markAllRead(userId) {
  const { rows } = await query(
    `UPDATE notifications
        SET status = 'READ', read_at = COALESCE(read_at, NOW())
      WHERE user_id = $1 AND status <> 'READ'
      RETURNING id`,
    [userId]
  );
  return { updated: rows.length };
}

export async function unreadCount(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count
       FROM notifications
      WHERE user_id = $1 AND read_at IS NULL AND status <> 'READ'`,
    [userId]
  );
  return rows[0].count;
}
