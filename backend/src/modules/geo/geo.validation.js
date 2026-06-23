import { z } from 'zod';

export const nearbySchema = z.object({
  lat: z.coerce
    .number({ required_error: 'lat is required', invalid_type_error: 'lat must be numeric' })
    .min(-90)
    .max(90),
  lng: z.coerce
    .number({ required_error: 'lng is required', invalid_type_error: 'lng must be numeric' })
    .min(-180)
    .max(180),
  radius: z.coerce.number().positive().max(500).optional().default(15),
  // Accept true/false/1/0/yes/no; defaults to undefined when omitted.
  emergency: z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .transform((v) => v === 'true' || v === '1' || v === 'yes')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
