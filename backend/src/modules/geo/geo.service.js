import { query } from '../../db/pool.js';
import { haversineSql } from '../../utils/geo.js';

/**
 * Find APPROVED clinics within `radius` km of (lat,lng), nearest first.
 * Distance is computed in SQL via the haversineSql helper using bound params.
 */
export async function findNearby({ lat, lng, radius, emergency, limit }) {
  // $1 = lat, $2 = lng  → reused by the haversine expression.
  const distanceExpr = haversineSql('$1', '$2');
  const params = [lat, lng];

  const where = [
    `status = 'APPROVED'`,
    `latitude IS NOT NULL`,
    `longitude IS NOT NULL`,
  ];

  if (emergency === true) {
    where.push(`emergency_available = TRUE`);
  }

  params.push(radius);
  const radiusParam = `$${params.length}`;

  params.push(limit);
  const limitParam = `$${params.length}`;

  const sql = `
    SELECT *, ${distanceExpr} AS distance_km
    FROM clinics
    WHERE ${where.join(' AND ')}
      AND ${distanceExpr} <= ${radiusParam}
    ORDER BY distance_km ASC
    LIMIT ${limitParam}`;

  const { rows } = await query(sql, params);
  return rows.map((r) => ({
    ...r,
    distance_km: r.distance_km == null ? null : Math.round(Number(r.distance_km) * 100) / 100,
  }));
}
