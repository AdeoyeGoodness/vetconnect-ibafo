import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate } from '../../utils/response.js';
import * as clinicsService from './clinics.service.js';

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query);
  const { items, total } = await clinicsService.listClinics(
    {
      page: meta.page,
      limit: meta.limit,
      offset: meta.offset,
      search: req.query.search,
      town: req.query.town,
      service: req.query.service,
      animal_type: req.query.animal_type,
      emergency: req.query.emergency,
      minRating: req.query.minRating,
      sort: req.query.sort,
      status: req.query.status,
    },
    req.user
  );
  ok(res, items, paginate(req.query, total));
});

export const getOne = asyncHandler(async (req, res) => {
  const clinic = await clinicsService.getClinicByIdOrSlug(req.params.idOrSlug, req.user);
  ok(res, clinic);
});

export const create = asyncHandler(async (req, res) => {
  const clinic = await clinicsService.createClinic(req.body, req.user);
  created(res, clinic);
});

export const update = asyncHandler(async (req, res) => {
  const clinic = await clinicsService.updateClinic(req.params.id, req.body, req.user);
  ok(res, clinic);
});

export const setStatus = asyncHandler(async (req, res) => {
  const clinic = await clinicsService.setClinicStatus(req.params.id, req.body.status);
  ok(res, clinic);
});

export const mine = asyncHandler(async (req, res) => {
  const clinics = await clinicsService.getMyClinics(req.user);
  ok(res, clinics);
});
