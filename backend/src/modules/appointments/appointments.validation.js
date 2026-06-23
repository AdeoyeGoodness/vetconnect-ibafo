import { z } from 'zod';

const TIME = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be HH:MM');
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const APPOINTMENT_STATUS = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export const idParam = z.object({ id: z.string().uuid('Invalid appointment id') });

export const bookSchema = z.object({
  clinic_id: z.string().uuid('clinic_id is required'),
  animal_id: z.string().uuid('animal_id is required'),
  service: z.string().trim().min(1, 'Service is required').max(160),
  scheduled_date: DATE,
  start_time: TIME,
  vet_id: z.string().uuid().optional(),
  notes: z.string().trim().optional(),
});

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(APPOINTMENT_STATUS).optional(),
  date: DATE.optional(),
  clinic_id: z.string().uuid().optional(),
});

// PATCH — action-driven state transition.
export const patchSchema = z
  .object({
    action: z.enum(['cancel', 'reschedule', 'confirm', 'reject', 'complete', 'no_show']),
    scheduled_date: DATE.optional(),
    start_time: TIME.optional(),
    reject_reason: z.string().trim().max(255).optional(),
  })
  .refine(
    (v) => (v.action === 'reschedule' ? !!v.scheduled_date && !!v.start_time : true),
    { message: 'reschedule requires scheduled_date and start_time' }
  );
