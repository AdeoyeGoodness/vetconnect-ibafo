import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent } from '../../utils/response.js';
import * as service from './vaccinations.service.js';

export const list = asyncHandler(async (req, res) => {
  if (req.query.animal_id) {
    const rows = await service.listForAnimal(req.query.animal_id, req.user.id);
    return ok(res, rows);
  }
  // No animal_id → dashboard reminders: all due/upcoming across owned animals.
  const rows = await service.listDueForOwner(req.user.id);
  ok(res, rows);
});

export const suggestions = asyncHandler(async (req, res) => {
  ok(res, service.getSuggestions(req.query.species));
});

export const create = asyncHandler(async (req, res) => {
  const row = await service.createVaccination(req.user.id, req.body);
  created(res, row);
});

export const update = asyncHandler(async (req, res) => {
  const row = await service.updateVaccination(req.params.id, req.user.id, req.body);
  ok(res, row);
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteVaccination(req.params.id, req.user.id);
  noContent(res);
});
