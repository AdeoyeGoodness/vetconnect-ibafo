import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate } from '../../utils/response.js';
import * as service from './emergency.service.js';

export const create = asyncHandler(async (req, res) => {
  const result = await service.createEmergency(req.user, req.body);
  created(res, result);
});

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query, 0);
  const { rows, total } = await service.listEmergencies(req.user, req.query, meta);
  ok(res, rows, paginate(req.query, total));
});

export const getOne = asyncHandler(async (req, res) => {
  const request = await service.getEmergency(req.user, req.params.id);
  ok(res, request);
});

export const update = asyncHandler(async (req, res) => {
  const request = await service.updateEmergency(req.user, req.params.id, req.body);
  ok(res, request);
});

export const contacts = asyncHandler(async (_req, res) => {
  const rows = await service.listEmergencyContacts();
  ok(res, rows);
});
