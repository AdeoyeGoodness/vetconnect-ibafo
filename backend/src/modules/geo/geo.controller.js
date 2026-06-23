import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as geoService from './geo.service.js';

export const nearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius, emergency, limit } = req.query;
  const clinics = await geoService.findNearby({ lat, lng, radius, emergency, limit });
  ok(res, clinics, { count: clinics.length, radius_km: radius, center: { lat, lng } });
});
