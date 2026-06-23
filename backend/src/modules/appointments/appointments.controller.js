import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginate } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import * as service from './appointments.service.js';

export const book = asyncHandler(async (req, res) => {
  if (req.user.role !== 'OWNER') {
    throw ApiError.forbidden('Only animal owners can book appointments');
  }
  const appt = await service.bookAppointment(req.user, req.body);
  created(res, appt);
});

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query, 0);
  const { rows, total } = await service.listAppointments(
    req.user,
    {
      status: req.query.status,
      date: req.query.date,
      clinic_id: req.query.clinic_id,
    },
    meta.limit,
    meta.offset
  );
  ok(res, rows, paginate(req.query, total));
});

export const getOne = asyncHandler(async (req, res) => {
  const appt = await service.getAppointmentForUser(req.params.id, req.user);
  ok(res, appt);
});

export const patch = asyncHandler(async (req, res) => {
  const appt = await service.patchAppointment(req.params.id, req.user, req.body);
  ok(res, appt);
});
