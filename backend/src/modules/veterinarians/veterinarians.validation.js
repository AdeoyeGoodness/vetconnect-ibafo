import { z } from 'zod';

export const listVetsSchema = z.object({
  clinic_id: z.string().uuid('A valid clinic_id is required').optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('A valid veterinarian id is required'),
});

export const createVetSchema = z.object({
  clinic_id: z.string().uuid('A valid clinic_id is required'),
  user_id: z.string().uuid().optional(),
  full_name: z.string().trim().min(1, 'Full name is required').max(150),
  license_number: z.string().trim().max(80).optional(),
  specialization: z.string().trim().max(150).optional(),
  bio: z.string().trim().optional(),
  photo_url: z.string().trim().url().optional(),
});

export const updateVetSchema = z
  .object({
    full_name: z.string().trim().min(1).max(150).optional(),
    license_number: z.string().trim().max(80).nullable().optional(),
    specialization: z.string().trim().max(150).nullable().optional(),
    bio: z.string().trim().nullable().optional(),
    photo_url: z.string().trim().url().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const verifyVetSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
});
