import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent } from '../../utils/response.js';
import * as service from './availability.service.js';

export const list = asyncHandler(async (req, res) => {
  const rows = await service.listAvailability(req.query.clinic_id);
  ok(res, rows);
});

export const replaceSchedule = asyncHandler(async (req, res) => {
  await service.assertClinicAdmin(req.params.clinic_id, req.user);
  const rows = await service.replaceWeeklySchedule(req.params.clinic_id, req.body.schedule);
  ok(res, rows);
});

export const addBlock = asyncHandler(async (req, res) => {
  await service.assertClinicAdmin(req.params.clinic_id, req.user);
  const block = await service.addBlock(req.params.clinic_id, req.body);
  created(res, block);
});

export const removeBlock = asyncHandler(async (req, res) => {
  // Resolve the block's clinic, then assert admin on it.
  const clinicId = await service.getBlockClinicId(req.params.id);
  await service.assertClinicAdmin(clinicId, req.user);
  await service.removeBlock(clinicId, req.params.id);
  noContent(res);
});

export const slots = asyncHandler(async (req, res) => {
  const result = await service.computeSlots(req.params.clinic_id, req.query.date);
  ok(res, result);
});
