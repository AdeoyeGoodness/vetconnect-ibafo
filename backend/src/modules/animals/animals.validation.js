import { z } from 'zod';

export const SPECIES = ['DOG', 'CAT', 'POULTRY', 'GOAT', 'SHEEP', 'CATTLE', 'RABBIT', 'OTHER'];
export const GENDERS = ['MALE', 'FEMALE', 'UNKNOWN'];

export const listAnimalsQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  owner_id: z.string().uuid().optional(),
  species: z.enum(SPECIES).optional(),
});

export const createAnimalSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  species: z.enum(SPECIES, { errorMap: () => ({ message: 'Invalid species' }) }),
  breed: z.string().trim().max(120).optional(),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Invalid gender' }) }).optional(),
  date_of_birth: z.coerce.date().optional(),
  age_years: z.coerce.number().min(0).max(999).optional(),
  weight_kg: z.coerce.number().min(0).max(9999).optional(),
  color: z.string().trim().max(80).optional(),
  vaccination_status: z.string().trim().max(40).optional(),
  medical_notes: z.string().trim().optional(),
  photo_url: z.string().trim().url().max(2048).optional(),
});

// All fields optional for PUT; at least one must be present.
export const updateAnimalSchema = createAnimalSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field must be provided' }
);

export const idParam = z.object({ id: z.string().uuid('Invalid animal id') });
