import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as authService from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  created(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  ok(res, result);
});

export const logout = asyncHandler(async (_req, res) => {
  // Stateless JWT — the client simply drops the token.
  ok(res, { message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  ok(res, { message: 'Password has been reset successfully. You can now log in.' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  ok(res, { user });
});
