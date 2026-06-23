import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  status: z.enum(['QUEUED', 'SENT', 'FAILED', 'READ']).optional(),
  channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('A valid id is required'),
});
