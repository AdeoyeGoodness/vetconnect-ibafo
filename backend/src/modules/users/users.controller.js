import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, noContent, paginate } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import * as usersService from './users.service.js';

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query);
  const { items, total } = await usersService.listUsers({
    page: meta.page,
    limit: meta.limit,
    offset: meta.offset,
    role: req.query.role,
    search: req.query.search,
  });
  ok(res, items, paginate(req.query, total));
});

export const getById = asyncHandler(async (req, res) => {
  // Self or SUPER_ADMIN only.
  if (req.user.role !== 'SUPER_ADMIN' && req.user.id !== req.params.id) {
    throw ApiError.forbidden('You do not have permission to view this user');
  }
  const user = await usersService.getUserById(req.params.id);
  ok(res, user);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateMe(req.user.id, req.body);
  ok(res, user);
});

export const setStatus = asyncHandler(async (req, res) => {
  const user = await usersService.setStatus(req.params.id, req.body.is_active);
  ok(res, user);
});

export const remove = asyncHandler(async (req, res) => {
  await usersService.deleteUser(req.params.id);
  noContent(res);
});
