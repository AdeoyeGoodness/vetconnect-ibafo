import slugify from 'slugify';
import { query, withTransaction } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build a unique slug from a clinic name. */
async function buildUniqueSlug(name) {
  const base = slugify(name, { lower: true, strict: true }) || 'clinic';
  let slug = base;
  let n = 1;
  // Loop until we find an unused slug.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await query('SELECT 1 FROM clinics WHERE slug = $1', [slug]);
    if (!rows.length) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function listClinics(opts, requester) {
  const {
    page, limit, offset,
    search, town, service, animal_type,
    emergency, minRating, sort, status,
  } = opts;

  const where = [];
  const params = [];

  // Status visibility: guests/non-admins only ever see APPROVED clinics.
  if (requester?.role === 'SUPER_ADMIN') {
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
  } else {
    where.push(`status = 'APPROVED'`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`name ILIKE $${params.length}`);
  }
  if (town) {
    params.push(town);
    where.push(`town = $${params.length}`);
  }
  if (service) {
    params.push(service);
    where.push(`$${params.length} = ANY(services_offered)`);
  }
  if (animal_type) {
    params.push(animal_type);
    where.push(`$${params.length}::animal_species = ANY(animal_types)`);
  }
  if (emergency === true) {
    where.push(`emergency_available = TRUE`);
  }
  if (minRating != null) {
    params.push(minRating);
    where.push(`rating_avg >= $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let orderSql = 'ORDER BY created_at DESC';
  if (sort === 'rating') orderSql = 'ORDER BY rating_avg DESC, rating_count DESC';
  else if (sort === 'reviews') orderSql = 'ORDER BY rating_count DESC, rating_avg DESC';
  else if (sort === 'newest') orderSql = 'ORDER BY created_at DESC';

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM clinics ${whereSql}`, params);
  const total = countRes.rows[0].total;

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM clinics ${whereSql} ${orderSql}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { items: rows, total };
}

export async function getClinicByIdOrSlug(idOrSlug, requester) {
  const byId = UUID_RE.test(idOrSlug);
  const { rows } = await query(
    `SELECT * FROM clinics WHERE ${byId ? 'id' : 'slug'} = $1`,
    [idOrSlug]
  );
  const clinic = rows[0];
  if (!clinic) throw ApiError.notFound('Clinic not found');

  // Non-approved clinics are only visible to SUPER_ADMIN or the owner.
  const isOwner = requester && clinic.owner_id === requester.id;
  const isAdmin = requester?.role === 'SUPER_ADMIN';
  if (clinic.status !== 'APPROVED' && !isOwner && !isAdmin) {
    throw ApiError.notFound('Clinic not found');
  }

  const vetsRes = await query(
    `SELECT * FROM veterinarians WHERE clinic_id = $1 AND status = 'VERIFIED' ORDER BY created_at DESC`,
    [clinic.id]
  );
  const reviewsRes = await query(
    `SELECT r.*, u.full_name AS reviewer_name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.clinic_id = $1 AND r.status = 'PUBLISHED'
     ORDER BY r.created_at DESC LIMIT 5`,
    [clinic.id]
  );

  return { ...clinic, veterinarians: vetsRes.rows, reviews: reviewsRes.rows };
}

export async function createClinic(data, requester) {
  const slug = await buildUniqueSlug(data.name);

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO clinics
        (owner_id, name, slug, description, address, town, phone, email,
         operating_hours, services_offered, animal_types, emergency_available,
         latitude, longitude, logo_url, cover_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
               COALESCE($9,'{}'::jsonb), COALESCE($10,'{}'),
               COALESCE($11,'{}')::animal_species[], COALESCE($12,FALSE),
               $13,$14,$15,$16,'PENDING')
       RETURNING *`,
      [
        requester.id,
        data.name,
        slug,
        data.description ?? null,
        data.address,
        data.town ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.operating_hours ?? null,
        data.services_offered ?? null,
        data.animal_types ?? null,
        data.emergency_available ?? null,
        data.latitude ?? null,
        data.longitude ?? null,
        data.logo_url ?? null,
        data.cover_url ?? null,
      ]
    );

    // Promote a plain OWNER to CLINIC_ADMIN now that they own a clinic.
    if (requester.role === 'OWNER') {
      await client.query(
        `UPDATE users SET role = 'CLINIC_ADMIN' WHERE id = $1`,
        [requester.id]
      );
    }

    return rows[0];
  });
}

async function loadClinicOwnership(id) {
  const { rows } = await query('SELECT id, owner_id FROM clinics WHERE id = $1', [id]);
  if (!rows[0]) throw ApiError.notFound('Clinic not found');
  return rows[0];
}

export async function updateClinic(id, data, requester) {
  const clinic = await loadClinicOwnership(id);
  const isOwner = clinic.owner_id === requester.id;
  const isAdmin = requester.role === 'SUPER_ADMIN';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to update this clinic');
  }

  const allowed = [
    'name', 'description', 'address', 'town', 'phone', 'email',
    'operating_hours', 'services_offered', 'animal_types',
    'emergency_available', 'latitude', 'longitude', 'logo_url', 'cover_url',
  ];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      const cast = key === 'animal_types' ? '::animal_species[]' : '';
      sets.push(`${key} = $${params.length}${cast}`);
    }
  }
  if (!sets.length) throw ApiError.badRequest('No valid fields to update');

  params.push(id);
  const { rows } = await query(
    `UPDATE clinics SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0];
}

export async function setClinicStatus(id, status) {
  const { rows } = await query(
    `UPDATE clinics SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  if (!rows[0]) throw ApiError.notFound('Clinic not found');
  return rows[0];
}

export async function getMyClinics(requester) {
  const { rows } = await query(
    `SELECT * FROM clinics WHERE owner_id = $1 ORDER BY created_at DESC`,
    [requester.id]
  );
  return rows;
}
