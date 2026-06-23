import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as service from './analytics.service.js';

export const owner = asyncHandler(async (req, res) => {
  const data = await service.ownerDashboard(req.user.id);
  ok(res, data);
});

export const clinic = asyncHandler(async (req, res) => {
  const data = await service.clinicDashboard(req.user.id);
  ok(res, data);
});

export const admin = asyncHandler(async (_req, res) => {
  const data = await service.adminDashboard();
  ok(res, data);
});
