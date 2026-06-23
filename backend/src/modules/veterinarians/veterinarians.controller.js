import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import * as vetService from './veterinarians.service.js';

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query);
  const { items, total } = await vetService.listVets({
    clinic_id: req.query.clinic_id,
    limit: meta.limit,
    offset: meta.offset,
  });
  ok(res, items, paginate(req.query, total));
});

export const create = asyncHandler(async (req, res) => {
  const vet = await vetService.createVet(req.body, req.user);
  created(res, vet);
});

export const update = asyncHandler(async (req, res) => {
  const vet = await vetService.updateVet(req.params.id, req.body, req.user);
  ok(res, vet);
});

export const verify = asyncHandler(async (req, res) => {
  const vet = await vetService.verifyVet(req.params.id, req.body.status);
  ok(res, vet);
});

export const remove = asyncHandler(async (req, res) => {
  await vetService.deleteVet(req.params.id, req.user);
  noContent(res);
});
