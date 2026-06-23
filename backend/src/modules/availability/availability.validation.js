import { z } from 'zod';

const TIME = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be HH:MM');
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const clinicIdParam = z.object({ clinic_id: z.string().uuid('Invalid clinic id') });
export const blockIdParam = z.object({ id: z.string().uuid('Invalid block id') });

export const listAvailabilityQuery = z.object({
  clinic_id: z.string().uuid('clinic_id is required'),
});

export const slotsQuery = z.object({
  date: DATE,
});

const scheduleRow = z
  .object({
    day_of_week: z.coerce.number().int().min(0).max(6),
    open_time: TIME,
    close_time: TIME,
    break_start: TIME.optional().nullable(),
    break_end: TIME.optional().nullable(),
    slot_minutes: z.coerce.number().int().min(5).max(480).default(30),
  })
  .refine((r) => r.open_time < r.close_time, {
    message: 'open_time must be before close_time',
  })
  .refine(
    (r) => (r.break_start && r.break_end ? r.break_start < r.break_end : true),
    { message: 'break_start must be before break_end' }
  );

export const replaceScheduleSchema = z.object({
  schedule: z.array(scheduleRow).min(0),
});

export const createBlockSchema = z.object({
  specific_date: DATE,
  is_blocked: z.coerce.boolean().default(true),
  reason: z.string().trim().max(160).optional(),
});
