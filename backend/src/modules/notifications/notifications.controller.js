import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginate } from '../../utils/response.js';
import * as service from './notifications.service.js';

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query, 0);
  const { rows, total } = await service.listNotifications(req.user.id, req.query, meta);
  ok(res, rows, paginate(req.query, total));
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await service.markRead(req.user.id, req.params.id);
  ok(res, notification);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await service.markAllRead(req.user.id);
  ok(res, result);
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await service.unreadCount(req.user.id);
  ok(res, { count });
});
