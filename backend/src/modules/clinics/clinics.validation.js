import { z } from 'zod';

const SPECIES = ['DOG', 'CAT', 'POULTRY', 'GOAT', 'SHEEP', 'CATTLE', 'RABBIT', 'OTHER'];

export const listClinicsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).optional(),
  town: z.string().trim().min(1).optional(),
  service: z.string().trim().min(1).optional(),
  animal_type: z.enum(SPECIES).optional(),
  emergency: z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .transform((v) => v === 'true' || v === '1' || v === 'yes')
    .optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['rating', 'reviews', 'newest']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
});

export const idOrSlugParamSchema = z.object({
  idOrSlug: z.string().trim().min(1),
});

export const idParamSchema = z.object({
  id: z.string().uuid('A valid clinic id is required'),
});

const operatingHours = z.record(z.any());

export const createClinicSchema = z.object({
  name: z.string().trim().min(1, 'Clinic name is required').max(180),
  description: z.string().trim().optional(),
  address: z.string().trim().min(1, 'Address is required').max(255),
  town: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  operating_hours: operatingHours.optional(),
  services_offered: z.array(z.string().trim().min(1)).optional(),
  animal_types: z.array(z.enum(SPECIES)).optional(),
  emergency_available: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  logo_url: z.string().trim().url().optional(),
  cover_url: z.string().trim().url().optional(),
});

export const updateClinicSchema = z
  .object({
    name: z.string().trim().min(1).max(180).optional(),
    description: z.string().trim().nullable().optional(),
    address: z.string().trim().min(1).max(255).optional(),
    town: z.string().trim().max(120).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().toLowerCase().email().nullable().optional(),
    operating_hours: operatingHours.optional(),
    services_offered: z.array(z.string().trim().min(1)).optional(),
    animal_types: z.array(z.enum(SPECIES)).optional(),
    emergency_available: z.boolean().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    logo_url: z.string().trim().url().nullable().optional(),
    cover_url: z.string().trim().url().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const updateClinicStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
});
