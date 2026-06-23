// Haversine distance utilities for the geolocation / nearby-clinic features.
const R = 6371; // Earth radius in km
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two lat/lng points. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) return null;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * SQL fragment computing Haversine distance (km) from a clinic row to a point.
 * Use with parameters: $lat, $lng. Returns an expression aliased by the caller.
 * Example: `SELECT *, ${haversineSql('$1','$2')} AS distance_km FROM clinics`
 */
export const haversineSql = (latParam, lngParam) => `
  (6371 * acos(
     LEAST(1, GREATEST(-1,
       cos(radians(${latParam})) * cos(radians(latitude)) *
       cos(radians(longitude) - radians(${lngParam})) +
       sin(radians(${latParam})) * sin(radians(latitude))
     ))
  ))`;
