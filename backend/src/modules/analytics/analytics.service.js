import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

/** OWNER dashboard: counts + small recent lists. */
export async function ownerDashboard(userId) {
  const countsRes = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM appointments
         WHERE owner_id = $1 AND status IN ('PENDING','CONFIRMED')
           AND scheduled_date >= CURRENT_DATE)                       AS upcoming_appointments,
       (SELECT COUNT(*)::int FROM appointments
         WHERE owner_id = $1 AND (status IN ('COMPLETED','CANCELLED','NO_SHOW')
           OR scheduled_date < CURRENT_DATE))                        AS past_appointments,
       (SELECT COUNT(*)::int FROM animals WHERE owner_id = $1)        AS animals_count,
       (SELECT COUNT(*)::int FROM vaccinations v
          JOIN animals a ON a.id = v.animal_id
         WHERE a.owner_id = $1 AND v.status IN ('DUE','UPCOMING','OVERDUE')) AS vaccination_reminders`,
    [userId]
  );
  const counts = countsRes.rows[0];

  const upcomingRes = await query(
    `SELECT ap.id, ap.service, ap.scheduled_date, ap.start_time, ap.status,
            c.name AS clinic_name, an.name AS animal_name
       FROM appointments ap
       JOIN clinics c ON c.id = ap.clinic_id
       JOIN animals an ON an.id = ap.animal_id
      WHERE ap.owner_id = $1 AND ap.status IN ('PENDING','CONFIRMED')
        AND ap.scheduled_date >= CURRENT_DATE
      ORDER BY ap.scheduled_date ASC, ap.start_time ASC
      LIMIT 5`,
    [userId]
  );

  const remindersRes = await query(
    `SELECT v.id, v.vaccine_name, v.due_date, v.status, a.name AS animal_name
       FROM vaccinations v
       JOIN animals a ON a.id = v.animal_id
      WHERE a.owner_id = $1 AND v.status IN ('DUE','UPCOMING','OVERDUE')
      ORDER BY v.due_date ASC
      LIMIT 5`,
    [userId]
  );

  return {
    ...counts,
    recent_upcoming: upcomingRes.rows,
    upcoming_vaccinations: remindersRes.rows,
  };
}

/** Resolve the clinic owned by a CLINIC_ADMIN. */
async function getAdminClinic(userId) {
  const { rows } = await query(
    `SELECT id, name, rating_avg, rating_count
       FROM clinics WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId]
  );
  if (!rows[0]) throw ApiError.notFound('No clinic is associated with this account');
  return rows[0];
}

/** CLINIC_ADMIN dashboard for the admin's clinic. */
export async function clinicDashboard(userId) {
  const clinic = await getAdminClinic(userId);

  const statsRes = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM appointments
         WHERE clinic_id = $1 AND scheduled_date = CURRENT_DATE)      AS appointments_today,
       (SELECT COUNT(DISTINCT animal_id)::int FROM appointments
         WHERE clinic_id = $1 AND status = 'COMPLETED')               AS total_patients,
       (SELECT COUNT(*)::int FROM emergency_requests
         WHERE assigned_clinic_id = $1 AND status = 'OPEN')           AS emergency_requests_open`,
    [clinic.id]
  );
  const stats = statsRes.rows[0];

  const breakdownRes = await query(
    `SELECT status, COUNT(*)::int AS count
       FROM appointments WHERE clinic_id = $1
      GROUP BY status`,
    [clinic.id]
  );
  const status_breakdown = breakdownRes.rows.reduce((acc, r) => {
    acc[r.status] = r.count;
    return acc;
  }, {});

  return {
    clinic_id: clinic.id,
    clinic_name: clinic.name,
    appointments_today: stats.appointments_today,
    total_patients: stats.total_patients,
    avg_rating: Number(clinic.rating_avg),
    rating_count: clinic.rating_count,
    emergency_requests_open: stats.emergency_requests_open,
    status_breakdown,
  };
}

/** SUPER_ADMIN platform dashboard. */
export async function adminDashboard() {
  const countsRes = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM users)                                          AS total_users,
       (SELECT COUNT(*)::int FROM clinics)                                        AS total_clinics,
       (SELECT COUNT(*)::int FROM clinics WHERE status = 'PENDING')               AS pending_clinics,
       (SELECT COUNT(*)::int FROM appointments)                                   AS total_appointments,
       (SELECT COUNT(*)::int FROM emergency_requests WHERE status = 'OPEN')       AS emergency_open,
       (SELECT COUNT(*)::int FROM emergency_requests)                             AS emergency_total`
  );

  const topRes = await query(
    `SELECT id, name, rating_avg, rating_count
       FROM clinics
      WHERE rating_count > 0
      ORDER BY rating_avg DESC, rating_count DESC
      LIMIT 5`
  );

  return {
    ...countsRes.rows[0],
    top_clinics: topRes.rows.map((c) => ({
      id: c.id,
      name: c.name,
      rating_avg: Number(c.rating_avg),
      rating_count: c.rating_count,
    })),
  };
}
