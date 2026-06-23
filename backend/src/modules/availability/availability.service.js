import { query, withTransaction } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

// ---------------------------------------------------------------------------
// Time helpers (work on "HH:MM" / "HH:MM:SS" strings via minutes-since-midnight)
// ---------------------------------------------------------------------------
export function toMinutes(t) {
  if (t == null) return null;
  const [h, m] = String(t).split(':');
  return Number(h) * 60 + Number(m);
}

export function toTimeStr(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Normalise a Date|string to a YYYY-MM-DD string (no timezone surprises). */
export function dateKey(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** 0=Sun..6=Sat for a YYYY-MM-DD string, interpreted as a UTC calendar date. */
export function dayOfWeek(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

// ---------------------------------------------------------------------------
// Clinic ownership / existence guards
// ---------------------------------------------------------------------------
export async function getClinicOrThrow(clinicId) {
  const { rows } = await query(
    'SELECT id, owner_id, status FROM clinics WHERE id = $1',
    [clinicId]
  );
  if (!rows[0]) throw ApiError.notFound('Clinic not found');
  return rows[0];
}

/** Ensure the user may administer this clinic (owning CLINIC_ADMIN or SUPER_ADMIN). */
export async function assertClinicAdmin(clinicId, user) {
  const clinic = await getClinicOrThrow(clinicId);
  if (user.role === 'SUPER_ADMIN') return clinic;
  if (user.role === 'CLINIC_ADMIN' && clinic.owner_id === user.id) return clinic;
  throw ApiError.forbidden('You do not manage this clinic');
}

// ---------------------------------------------------------------------------
// Availability rows
// ---------------------------------------------------------------------------
const AVAIL_COLUMNS = `
  id, clinic_id, day_of_week, open_time, close_time, break_start, break_end,
  slot_minutes, specific_date, is_blocked, reason, created_at, updated_at
`;

/** All availability rows (recurring + date-specific) for a clinic. */
export async function listAvailability(clinicId) {
  await getClinicOrThrow(clinicId);
  const { rows } = await query(
    `SELECT ${AVAIL_COLUMNS} FROM clinic_availability
     WHERE clinic_id = $1
     ORDER BY specific_date NULLS FIRST, day_of_week, open_time`,
    [clinicId]
  );
  return rows;
}

/** Replace the entire weekly recurring schedule (specific_date IS NULL rows). */
export async function replaceWeeklySchedule(clinicId, schedule) {
  return withTransaction(async (client) => {
    await client.query(
      'DELETE FROM clinic_availability WHERE clinic_id = $1 AND specific_date IS NULL',
      [clinicId]
    );

    const inserted = [];
    for (const row of schedule) {
      const { rows } = await client.query(
        `INSERT INTO clinic_availability
           (clinic_id, day_of_week, open_time, close_time, break_start, break_end, slot_minutes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING ${AVAIL_COLUMNS}`,
        [
          clinicId,
          row.day_of_week,
          row.open_time,
          row.close_time,
          row.break_start ?? null,
          row.break_end ?? null,
          row.slot_minutes ?? 30,
        ]
      );
      inserted.push(rows[0]);
    }
    return inserted;
  });
}

/** Add a date-specific block (holiday / emergency closure). */
export async function addBlock(clinicId, { specific_date, is_blocked, reason }) {
  const { rows } = await query(
    `INSERT INTO clinic_availability (clinic_id, specific_date, is_blocked, reason)
     VALUES ($1,$2,$3,$4)
     RETURNING ${AVAIL_COLUMNS}`,
    [clinicId, specific_date, is_blocked ?? true, reason ?? null]
  );
  return rows[0];
}

/** Resolve the clinic owning a date-specific block row. */
export async function getBlockClinicId(blockId) {
  const { rows } = await query(
    'SELECT clinic_id FROM clinic_availability WHERE id = $1 AND specific_date IS NOT NULL',
    [blockId]
  );
  if (!rows[0]) throw ApiError.notFound('Block not found');
  return rows[0].clinic_id;
}

export async function removeBlock(clinicId, blockId) {
  const { rowCount } = await query(
    'DELETE FROM clinic_availability WHERE id = $1 AND clinic_id = $2 AND specific_date IS NOT NULL',
    [blockId, clinicId]
  );
  if (!rowCount) throw ApiError.notFound('Block not found');
}

// ---------------------------------------------------------------------------
// Slot computation — the anti-double-booking source of truth
// ---------------------------------------------------------------------------

/**
 * Compute bookable slots for a clinic on a given date.
 * Returns [{ start_time, end_time, available }]. Past dates => [].
 */
export async function computeSlots(clinicId, dateStr) {
  await getClinicOrThrow(clinicId);

  const today = dateKey(new Date());
  if (dateStr < today) return [];

  // Is the date explicitly blocked?
  const blocked = await query(
    `SELECT 1 FROM clinic_availability
     WHERE clinic_id = $1 AND specific_date = $2 AND is_blocked = TRUE
     LIMIT 1`,
    [clinicId, dateStr]
  );
  if (blocked.rows.length) return [];

  // Recurring rule(s) for that weekday.
  const dow = dayOfWeek(dateStr);
  const ruleRes = await query(
    `SELECT open_time, close_time, break_start, break_end, slot_minutes
     FROM clinic_availability
     WHERE clinic_id = $1 AND specific_date IS NULL AND day_of_week = $2
       AND open_time IS NOT NULL AND close_time IS NOT NULL
     ORDER BY open_time`,
    [clinicId, dow]
  );
  if (!ruleRes.rows.length) return [];

  // Taken start-times: live appointments + booked slot rows.
  const apptRes = await query(
    `SELECT start_time FROM appointments
     WHERE clinic_id = $1 AND scheduled_date = $2
       AND status IN ('PENDING','CONFIRMED')`,
    [clinicId, dateStr]
  );
  const slotRes = await query(
    `SELECT start_time FROM appointment_slots
     WHERE clinic_id = $1 AND slot_date = $2 AND is_booked = TRUE`,
    [clinicId, dateStr]
  );
  const taken = new Set([
    ...apptRes.rows.map((r) => String(r.start_time).slice(0, 5)),
    ...slotRes.rows.map((r) => String(r.start_time).slice(0, 5)),
  ]);

  const out = [];
  for (const rule of ruleRes.rows) {
    const open = toMinutes(rule.open_time);
    const close = toMinutes(rule.close_time);
    const bStart = toMinutes(rule.break_start);
    const bEnd = toMinutes(rule.break_end);
    const size = rule.slot_minutes || 30;

    for (let t = open; t + size <= close; t += size) {
      const end = t + size;
      // Skip any slot overlapping the break window.
      if (bStart != null && bEnd != null && t < bEnd && end > bStart) continue;

      const startStr = toTimeStr(t);
      out.push({
        start_time: startStr,
        end_time: toTimeStr(end),
        available: !taken.has(startStr),
      });
    }
  }

  // De-dup + sort by start (in case of overlapping rules).
  const seen = new Set();
  return out
    .filter((s) => (seen.has(s.start_time) ? false : seen.add(s.start_time)))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/**
 * Slot length (minutes) for a clinic on a weekday — used to derive appointment end_time.
 * Falls back to 30 when no rule exists.
 */
export async function slotMinutesFor(clinicId, dateStr, client = null) {
  const run = client ? client.query.bind(client) : query;
  const dow = dayOfWeek(dateStr);
  const { rows } = await run(
    `SELECT slot_minutes FROM clinic_availability
     WHERE clinic_id = $1 AND specific_date IS NULL AND day_of_week = $2
     ORDER BY open_time LIMIT 1`,
    [clinicId, dow]
  );
  return rows[0]?.slot_minutes || 30;
}
