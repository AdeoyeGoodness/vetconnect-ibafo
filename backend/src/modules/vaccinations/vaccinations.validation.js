import { z } from 'zod';

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const VACCINATION_STATUS = ['DUE', 'UPCOMING', 'COMPLETED', 'OVERDUE'];
export const SPECIES = ['DOG', 'CAT', 'POULTRY', 'GOAT', 'SHEEP', 'CATTLE', 'RABBIT', 'OTHER'];

export const idParam = z.object({ id: z.string().uuid('Invalid vaccination id') });

export const listQuery = z.object({
  animal_id: z.string().uuid().optional(),
});

export const suggestionsQuery = z.object({
  species: z.enum(SPECIES).optional(),
});

export const createSchema = z.object({
  animal_id: z.string().uuid('animal_id is required'),
  vaccine_name: z.string().trim().min(1, 'Vaccine name is required').max(160),
  due_date: DATE,
  reminder_date: DATE.optional(),
  administered_date: DATE.optional(),
  status: z.enum(VACCINATION_STATUS).optional(),
  notes: z.string().trim().optional(),
});

export const updateSchema = z
  .object({
    vaccine_name: z.string().trim().min(1).max(160).optional(),
    due_date: DATE.optional(),
    reminder_date: DATE.optional().nullable(),
    administered_date: DATE.optional().nullable(),
    status: z.enum(VACCINATION_STATUS).optional(),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field must be provided' });
