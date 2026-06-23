import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { sendEmail } from '../../utils/mailer.js';
import { haversineSql } from '../../utils/geo.js';

/** Find the nearest N approved, emergency-enabled clinics to a point. */
async function findNearestEmergencyClinics(latitude, longitude, limit = 3) {
  if (latitude == null || longitude == null) return [];
  const distance = haversineSql('$1', '$2');
  const { rows } = await query(
    `SELECT id, name, phone, email, address, town, latitude, longitude,
            ${distance} AS distance_km
       FROM clinics
      WHERE status = 'APPROVED'
        AND emergency_available = TRUE
        AND latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY distance_km ASC
      LIMIT $3`,
    [latitude, longitude, limit]
  );
  return rows;
}

/** Create an emergency request, notify nearest clinics + requester. */
export async function createEmergency(user, data) {
  const { animal_type, symptoms, location_text, latitude, longitude, phone, urgency } = data;

  const { rows } = await query(
    `INSERT INTO emergency_requests
       (user_id, animal_type, symptoms, location_text, latitude, longitude, phone, urgency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'HIGH'))
     RETURNING *`,
    [
      user?.id || null,
      animal_type,
      symptoms,
      location_text || null,
      latitude ?? null,
      longitude ?? null,
      phone,
      urgency || null,
    ]
  );
  const request = rows[0];

  const clinics = await findNearestEmergencyClinics(latitude, longitude, 3);

  // Notify clinics (fire-and-forget; failures are logged inside mailer).
  const subject = `URGENT: Emergency request (${animal_type}) — ${request.urgency}`;
  const clinicHtml = `
    <p>A new emergency request has been submitted near your clinic.</p>
    <ul>
      <li><strong>Animal:</strong> ${animal_type}</li>
      <li><strong>Urgency:</strong> ${request.urgency}</li>
      <li><strong>Symptoms:</strong> ${symptoms}</li>
      <li><strong>Location:</strong> ${location_text || 'Not provided'}</li>
      <li><strong>Contact phone:</strong> ${phone}</li>
    </ul>
    <p>Please respond as soon as possible.</p>`;

  await Promise.all(
    clinics
      .filter((c) => c.email)
      .map((c) =>
        sendEmail({
          to: c.email,
          subject,
          html: clinicHtml,
          payload: { type: 'EMERGENCY_REQUEST', emergency_id: request.id, clinic_id: c.id },
        })
      )
  );

  // Acknowledge the requester if they are a registered user with an email.
  if (user?.email) {
    const clinicList = clinics.length
      ? `<ul>${clinics
          .map((c) => `<li>${c.name}${c.phone ? ` — ${c.phone}` : ''}</li>`)
          .join('')}</ul>`
      : '<p>We are locating the nearest emergency clinics for you.</p>';
    await sendEmail({
      to: user.email,
      userId: user.id,
      subject: 'Your VetConnect emergency request has been received',
      html: `<p>Hello ${user.full_name || ''},</p>
             <p>We received your emergency request and notified nearby emergency clinics.</p>
             ${clinicList}`,
      payload: { type: 'EMERGENCY_ACK', emergency_id: request.id },
    });
  }

  return { request, suggested_clinics: clinics };
}

/** List requests scoped to the caller's role. */
export async function listEmergencies(user, { status }, { limit, offset }) {
  const params = [];
  const where = [];

  if (status) {
    params.push(status);
    where.push(`e.status = $${params.length}`);
  }

  if (user.role === 'CLINIC_ADMIN') {
    // OPEN (unassigned, available to claim) + ones assigned to a clinic they own.
    params.push(user.id);
    where.push(
      `(e.status = 'OPEN' OR e.assigned_clinic_id IN (SELECT id FROM clinics WHERE owner_id = $${params.length}))`
    );
  }
  // SUPER_ADMIN sees all (no extra scope).

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRes = await query(`SELECT COUNT(*)::int AS total FROM emergency_requests e ${whereSql}`, params);
  const total = totalRes.rows[0].total;

  const dataParams = [...params, limit, offset];
  const { rows } = await query(
    `SELECT e.*, c.name AS assigned_clinic_name
       FROM emergency_requests e
       LEFT JOIN clinics c ON c.id = e.assigned_clinic_id
       ${whereSql}
      ORDER BY e.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total };
}

export async function getEmergency(user, id) {
  const { rows } = await query(
    `SELECT e.*, c.name AS assigned_clinic_name
       FROM emergency_requests e
       LEFT JOIN clinics c ON c.id = e.assigned_clinic_id
      WHERE e.id = $1`,
    [id]
  );
  const request = rows[0];
  if (!request) throw ApiError.notFound('Emergency request not found');

  if (user.role === 'SUPER_ADMIN') return request;
  if (request.user_id && request.user_id === user.id) return request;

  if (user.role === 'CLINIC_ADMIN' && request.assigned_clinic_id) {
    const owns = await query(
      'SELECT 1 FROM clinics WHERE id = $1 AND owner_id = $2',
      [request.assigned_clinic_id, user.id]
    );
    if (owns.rows.length) return request;
  }
  // Clinic admins may also view OPEN requests (to decide whether to claim).
  if (user.role === 'CLINIC_ADMIN' && request.status === 'OPEN') return request;

  throw ApiError.forbidden('You do not have access to this emergency request');
}

/** Assign / resolve / cancel. */
export async function updateEmergency(user, id, { action, assigned_clinic_id, resolved_note }) {
  const existingRes = await query('SELECT * FROM emergency_requests WHERE id = $1', [id]);
  const existing = existingRes.rows[0];
  if (!existing) throw ApiError.notFound('Emergency request not found');

  // CLINIC_ADMIN must own the clinic they touch.
  if (user.role === 'CLINIC_ADMIN') {
    const targetClinic = assigned_clinic_id || existing.assigned_clinic_id;
    if (!targetClinic) throw ApiError.badRequest('A clinic must be specified');
    const owns = await query(
      'SELECT 1 FROM clinics WHERE id = $1 AND owner_id = $2',
      [targetClinic, user.id]
    );
    if (!owns.rows.length) throw ApiError.forbidden('You can only manage requests for your own clinic');
  }

  if (action === 'assign') {
    const { rows } = await query(
      `UPDATE emergency_requests
          SET status = 'ASSIGNED', assigned_clinic_id = $1
        WHERE id = $2 RETURNING *`,
      [assigned_clinic_id, id]
    );
    return rows[0];
  }
  if (action === 'resolve') {
    const { rows } = await query(
      `UPDATE emergency_requests
          SET status = 'RESOLVED', resolved_note = $1
        WHERE id = $2 RETURNING *`,
      [resolved_note || null, id]
    );
    return rows[0];
  }
  // cancel
  const { rows } = await query(
    `UPDATE emergency_requests SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

/** Public quick-reference: emergency-enabled approved clinics with phone numbers. */
export async function listEmergencyContacts() {
  const { rows } = await query(
    `SELECT id, name, phone, email, address, town, latitude, longitude
       FROM clinics
      WHERE status = 'APPROVED' AND emergency_available = TRUE
      ORDER BY name ASC`
  );
  return rows;
}
