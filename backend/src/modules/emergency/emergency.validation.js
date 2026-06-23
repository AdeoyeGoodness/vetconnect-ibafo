import { z } from 'zod';

const uuid = z.string().uuid('A valid id is required');
const species = z.enum(['DOG', 'CAT', 'POULTRY', 'GOAT', 'SHEEP', 'CATTLE', 'RABBIT', 'OTHER']);
const urgency = z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']);

export const createEmergencySchema = z.object({
  animal_type: species,
  symptoms: z.string().trim().min(1, 'Symptoms are required').max(4000),
  location_text: z.string().trim().max(200).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().trim().min(1, 'Phone is required').max(30),
  urgency: urgency.optional(),
});

export const listEmergencyQuerySchema = z.object({
  status: z.enum(['OPEN', 'ASSIGNED', 'RESOLVED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateEmergencySchema = z
  .object({
    action: z.enum(['assign', 'resolve', 'cancel']),
    assigned_clinic_id: uuid.optional(),
    resolved_note: z.string().trim().max(4000).optional(),
  })
  .refine((d) => d.action !== 'assign' || d.assigned_clinic_id, {
    message: 'assigned_clinic_id is required to assign',
    path: ['assigned_clinic_id'],
  });

export const idParamSchema = z.object({ id: uuid });
