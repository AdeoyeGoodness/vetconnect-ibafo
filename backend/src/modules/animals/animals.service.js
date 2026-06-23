import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

const ANIMAL_COLUMNS = `
  id, owner_id, name, species, breed, gender, date_of_birth, age_years,
  weight_kg, color, vaccination_status, medical_notes, photo_url,
  created_at, updated_at
`;

/** Paginated list of animals. SUPER_ADMIN may scope to any owner via ownerId. */
export async function listAnimals({ ownerId, species, limit, offset }) {
  const where = ['owner_id = $1'];
  const params = [ownerId];
  if (species) {
    params.push(species);
    where.push(`species = $${params.length}`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM animals ${whereSql}`, params);
  const total = countRes.rows[0].total;

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT ${ANIMAL_COLUMNS} FROM animals ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total };
}

/** Fetch one animal, enforcing ownership unless caller is SUPER_ADMIN. */
export async function getAnimalForUser(id, user) {
  const { rows } = await query(`SELECT ${ANIMAL_COLUMNS} FROM animals WHERE id = $1`, [id]);
  const animal = rows[0];
  if (!animal) throw ApiError.notFound('Animal not found');
  if (user.role !== 'SUPER_ADMIN' && animal.owner_id !== user.id) {
    throw ApiError.notFound('Animal not found');
  }
  return animal;
}

export async function createAnimal(ownerId, data) {
  const { rows } = await query(
    `INSERT INTO animals
       (owner_id, name, species, breed, gender, date_of_birth, age_years,
        weight_kg, color, vaccination_status, medical_notes, photo_url)
     VALUES ($1,$2,$3,$4,COALESCE($5,'UNKNOWN'),$6,$7,$8,$9,COALESCE($10,'UNKNOWN'),$11,$12)
     RETURNING ${ANIMAL_COLUMNS}`,
    [
      ownerId,
      data.name,
      data.species,
      data.breed ?? null,
      data.gender ?? null,
      data.date_of_birth ?? null,
      data.age_years ?? null,
      data.weight_kg ?? null,
      data.color ?? null,
      data.vaccination_status ?? null,
      data.medical_notes ?? null,
      data.photo_url ?? null,
    ]
  );
  return rows[0];
}

const UPDATABLE = [
  'name', 'species', 'breed', 'gender', 'date_of_birth', 'age_years',
  'weight_kg', 'color', 'vaccination_status', 'medical_notes', 'photo_url',
];

export async function updateAnimal(id, ownerId, data) {
  // Ownership check (owner only — not SUPER_ADMIN).
  const owned = await query('SELECT owner_id FROM animals WHERE id = $1', [id]);
  if (!owned.rows[0]) throw ApiError.notFound('Animal not found');
  if (owned.rows[0].owner_id !== ownerId) throw ApiError.notFound('Animal not found');

  const sets = [];
  const params = [];
  for (const col of UPDATABLE) {
    if (data[col] !== undefined) {
      params.push(data[col]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (!sets.length) throw ApiError.badRequest('No updatable fields provided');

  params.push(id, ownerId);
  const { rows } = await query(
    `UPDATE animals SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND owner_id = $${params.length}
     RETURNING ${ANIMAL_COLUMNS}`,
    params
  );
  return rows[0];
}

export async function deleteAnimal(id, ownerId) {
  const { rowCount } = await query(
    'DELETE FROM animals WHERE id = $1 AND owner_id = $2',
    [id, ownerId]
  );
  if (!rowCount) throw ApiError.notFound('Animal not found');
}
