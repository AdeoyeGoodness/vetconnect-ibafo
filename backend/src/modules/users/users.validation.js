import { z } from 'zod';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  role: z.enum(['OWNER', 'CLINIC_ADMIN', 'SUPER_ADMIN']).optional(),
  search: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('A valid user id is required'),
});

export const updateMeSchema = z
  .object({
    full_name: z.string().trim().min(1).max(150).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
    avatar_url: z.string().trim().url().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const updateStatusSchema = z.object({
  is_active: z.boolean(),
});
