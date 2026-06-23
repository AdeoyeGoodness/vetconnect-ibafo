import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import * as service from './animals.service.js';

export const list = asyncHandler(async (req, res) => {
  // SUPER_ADMIN may inspect any owner; everyone else is scoped to themselves.
  const ownerId =
    req.user.role === 'SUPER_ADMIN' && req.query.owner_id
      ? req.query.owner_id
      : req.user.id;

  const meta = paginate(req.query, 0);
  const { rows, total } = await service.listAnimals({
    ownerId,
    species: req.query.species,
    limit: meta.limit,
    offset: meta.offset,
  });
  ok(res, rows, { ...paginate(req.query, total) });
});

export const getOne = asyncHandler(async (req, res) => {
  const animal = await service.getAnimalForUser(req.params.id, req.user);
  ok(res, animal);
});

export const create = asyncHandler(async (req, res) => {
  const animal = await service.createAnimal(req.user.id, req.body);
  created(res, animal);
});

export const update = asyncHandler(async (req, res) => {
  const animal = await service.updateAnimal(req.params.id, req.user.id, req.body);
  ok(res, animal);
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteAnimal(req.params.id, req.user.id);
  noContent(res);
});
