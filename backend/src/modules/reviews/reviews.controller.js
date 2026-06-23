import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import * as service from './reviews.service.js';

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query, 0);
  const { rows, total } = await service.listReviews(req.query, meta);
  ok(res, rows, { ...paginate(req.query, total) });
});

export const create = asyncHandler(async (req, res) => {
  const review = await service.createReview(req.user.id, req.body);
  created(res, review);
});

export const respond = asyncHandler(async (req, res) => {
  const response = await service.respondToReview(
    req.params.id,
    req.user.id,
    req.user.role,
    req.body.body
  );
  created(res, response);
});

export const moderate = asyncHandler(async (req, res) => {
  const review = await service.moderateReview(req.params.id, req.body.status);
  ok(res, review);
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteReview(req.params.id, req.user);
  noContent(res);
});
