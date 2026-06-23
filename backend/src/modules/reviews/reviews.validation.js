import { z } from 'zod';

const uuid = z.string().uuid('A valid id is required');

export const listReviewsQuerySchema = z
  .object({
    clinic_id: z.string().uuid().optional(),
    status: z.enum(['PUBLISHED', 'PENDING', 'HIDDEN', 'FLAGGED']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine((q) => q.clinic_id || q.status, {
    message: 'Provide clinic_id (public) or status (moderation queue)',
  });

export const createReviewSchema = z.object({
  clinic_id: uuid,
  appointment_id: uuid,
  rating: z.coerce.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
  body: z.string().trim().max(4000).optional(),
  images: z.array(z.string().trim().url('Each image must be a URL')).max(10).optional(),
});

export const respondSchema = z.object({
  body: z.string().trim().min(1, 'Response body is required').max(4000),
});

export const moderateSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN', 'FLAGGED'], {
    errorMap: () => ({ message: 'status must be PUBLISHED, HIDDEN or FLAGGED' }),
  }),
});

export const idParamSchema = z.object({ id: uuid });
