import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

async function loadClinic(clinicId) {
  const { rows } = await query('SELECT id, owner_id FROM clinics WHERE id = $1', [clinicId]);
  if (!rows[0]) throw ApiError.notFound('Clinic not found');
  return rows[0];
}

async function loadVet(id) {
  const { rows } = await query(
    `SELECT v.*, c.owner_id AS clinic_owner_id
     FROM veterinarians v JOIN clinics c ON c.id = v.clinic_id
     WHERE v.id = $1`,
    [id]
  );
  if (!rows[0]) throw ApiError.notFound('Veterinarian not found');
  return rows[0];
}

function assertCanManage(vet, requester) {
  const isAdmin = requester.role === 'SUPER_ADMIN';
  const isOwner = requester.role === 'CLINIC_ADMIN' && vet.clinic_owner_id === requester.id;
  if (!isAdmin && !isOwner) {
    throw ApiError.forbidden('You do not have permission to manage this veterinarian');
  }
}

export async function listVets({ clinic_id, limit, offset }) {
  const where = [];
  const params = [];
  if (clinic_id) {
    params.push(clinic_id);
    where.push(`clinic_id = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM veterinarians ${whereSql}`, params);
  const total = countRes.rows[0].total;

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM veterinarians ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { items: rows, total };
}

export async function createVet(data, requester) {
  const clinic = await loadClinic(data.clinic_id);
  // Only the clinic's owning CLINIC_ADMIN may add a vet.
  if (clinic.owner_id !== requester.id) {
    throw ApiError.forbidden('You can only add veterinarians to your own clinic');
  }

  const { rows } = await query(
    `INSERT INTO veterinarians
       (clinic_id, user_id, full_name, license_number, specialization, bio, photo_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING')
     RETURNING *`,
    [
      data.clinic_id,
      data.user_id ?? null,
      data.full_name,
      data.license_number ?? null,
      data.specialization ?? null,
      data.bio ?? null,
      data.photo_url ?? null,
    ]
  );
  return rows[0];
}

export async function updateVet(id, data, requester) {
  const vet = await loadVet(id);
  assertCanManage(vet, requester);

  const allowed = ['full_name', 'license_number', 'specialization', 'bio', 'photo_url'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (!sets.length) throw ApiError.badRequest('No valid fields to update');

  params.push(id);
  const { rows } = await query(
    `UPDATE veterinarians SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0];
}

export async function verifyVet(id, status) {
  const { rows } = await query(
    `UPDATE veterinarians SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (!rows[0]) throw ApiError.notFound('Veterinarian not found');
  return rows[0];
}

export async function deleteVet(id, requester) {
  const vet = await loadVet(id);
  assertCanManage(vet, requester);
  await query('DELETE FROM veterinarians WHERE id = $1', [id]);
}
