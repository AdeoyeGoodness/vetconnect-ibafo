import { z } from 'zod';

// Dashboard endpoints take no input; schema kept for convention/extension.
export const emptyQuerySchema = z.object({}).passthrough();
