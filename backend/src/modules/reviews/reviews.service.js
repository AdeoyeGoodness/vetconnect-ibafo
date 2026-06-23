import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

// How long after creation an author may delete their own review.
const EDIT_WINDOW_HOURS = 24;

/**
 * Public list of PUBLISHED reviews for a clinic, OR the moderation queue
 * (PENDING/FLAGGED/etc) for SUPER_ADMIN. Each row embeds author name + response.
 */
export async function listReviews({ clinic_id, status }, { page, limit, offset }) {
  const where = [];
  const params = [];

  if (clinic_id) {
    params.push(clinic_id);
    where.push(`r.clinic_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  } else {
    // Public listing defaults to published only.
    where.push(`r.status = 'PUBLISHED'`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRes = await query(`SELECT COUNT(*)::int AS total FROM reviews r ${whereSql}`, params);
  const total = totalRes.rows[0].total;

  const dataParams = [...params, limit, offset];
  const { rows } = await query(
    `SELECT r.id, r.clinic_id, r.user_id, r.appointment_id, r.rating, r.body,
            r.images, r.status, r.created_at, r.updated_at,
            u.full_name AS author_name,
            CASE WHEN resp.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', resp.id,
              'review_id', resp.review_id,
              'responder_id', resp.responder_id,
              'responder_name', ru.full_name,
              'body', resp.body,
              'created_at', resp.created_at,
              'updated_at', resp.updated_at
            ) END AS response
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN review_responses resp ON resp.review_id = r.id
       LEFT JOIN users ru ON ru.id = resp.responder_id
       ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total };
}

/**
 * Create a review. Business rule: the appointment must belong to the user,
 * be for that clinic, be COMPLETED, and not already reviewed.
 */
export async function createReview(userId, { clinic_id, appointment_id, rating, body, images }) {
  const apptRes = await query(
    `SELECT id, owner_id, clinic_id, status FROM appointments WHERE id = $1`,
    [appointment_id]
  );
  const appt = apptRes.rows[0];
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.owner_id !== userId) {
    throw ApiError.forbidden('You can only review your own appointments');
  }
  if (appt.clinic_id !== clinic_id) {
    throw ApiError.badRequest('This appointment is not for the specified clinic');
  }
  if (appt.status !== 'COMPLETED') {
    throw ApiError.forbidden('You can only review completed appointments');
  }

  const existing = await query('SELECT id FROM reviews WHERE appointment_id = $1', [appointment_id]);
  if (existing.rows.length) throw ApiError.conflict('A review already exists for this appointment');

  try {
    const { rows } = await query(
      `INSERT INTO reviews (clinic_id, user_id, appointment_id, rating, body, images)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clinic_id, userId, appointment_id, rating, body || null, images || []]
    );
    return rows[0]; // clinics.rating_avg/count updated by DB trigger
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict('A review already exists for this appointment');
    throw err;
  }
}

/** Upsert a clinic admin response. The caller must own the reviewed clinic. */
export async function respondToReview(reviewId, responderId, userRole, body) {
  const reviewRes = await query(
    `SELECT r.id, r.clinic_id, c.owner_id AS clinic_owner_id
       FROM reviews r JOIN clinics c ON c.id = r.clinic_id
      WHERE r.id = $1`,
    [reviewId]
  );
  const review = reviewRes.rows[0];
  if (!review) throw ApiError.notFound('Review not found');

  if (userRole !== 'SUPER_ADMIN' && review.clinic_owner_id !== responderId) {
    throw ApiError.forbidden('Only the clinic administrator can respond to this review');
  }

  const existing = await query('SELECT id FROM review_responses WHERE review_id = $1', [reviewId]);
  if (existing.rows.length) {
    const { rows } = await query(
      `UPDATE review_responses SET body = $1, responder_id = $2 WHERE review_id = $3 RETURNING *`,
      [body, responderId, reviewId]
    );
    return rows[0];
  }
  const { rows } = await query(
    `INSERT INTO review_responses (review_id, responder_id, body) VALUES ($1, $2, $3) RETURNING *`,
    [reviewId, responderId, body]
  );
  return rows[0];
}

/** SUPER_ADMIN moderation. Trigger recomputes clinic rating on status change. */
export async function moderateReview(reviewId, status) {
  const { rows } = await query(
    `UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *`,
    [status, reviewId]
  );
  if (!rows[0]) throw ApiError.notFound('Review not found');
  return rows[0];
}

/** Delete: author within edit window, or SUPER_ADMIN any time. */
export async function deleteReview(reviewId, user) {
  const { rows } = await query('SELECT id, user_id, created_at FROM reviews WHERE id = $1', [reviewId]);
  const review = rows[0];
  if (!review) throw ApiError.notFound('Review not found');

  const isAdmin = user.role === 'SUPER_ADMIN';
  const isAuthor = review.user_id === user.id;
  if (!isAdmin && !isAuthor) throw ApiError.forbidden('You cannot delete this review');

  if (!isAdmin) {
    const ageMs = Date.now() - new Date(review.created_at).getTime();
    if (ageMs > EDIT_WINDOW_HOURS * 3600 * 1000) {
      throw ApiError.forbidden(`Reviews can only be deleted within ${EDIT_WINDOW_HOURS} hours`);
    }
  }

  await query('DELETE FROM reviews WHERE id = $1', [reviewId]); // trigger refreshes rating
}
