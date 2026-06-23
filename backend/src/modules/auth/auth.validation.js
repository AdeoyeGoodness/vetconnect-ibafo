import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('A valid email is required');
const password = z.string().min(8, 'Password must be at least 8 characters');

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(150),
  email,
  phone: z.string().trim().max(30).optional(),
  password,
  // SUPER_ADMIN can never be self-registered.
  role: z.enum(['OWNER', 'CLINIC_ADMIN']).optional(),
  location: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password,
});
