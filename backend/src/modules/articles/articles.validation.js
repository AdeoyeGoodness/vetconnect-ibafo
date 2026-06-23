import { z } from 'zod';

const uuid = z.string().uuid('A valid id is required');
const species = z.enum(['DOG', 'CAT', 'POULTRY', 'GOAT', 'SHEEP', 'CATTLE', 'RABBIT', 'OTHER']);

export const listArticlesQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(240).optional(), // slug or uuid
  species: species.optional(),
  tag: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(240),
});

export const idParamSchema = z.object({ id: uuid });

export const createArticleSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(220),
  body: z.string().trim().min(1, 'Body is required'),
  category_id: uuid.optional(),
  excerpt: z.string().trim().max(400).optional(),
  cover_url: z.string().trim().url().optional(),
  tags: z.array(z.string().trim().max(120)).max(30).optional(),
  is_published: z.coerce.boolean().optional(),
});

export const updateArticleSchema = z
  .object({
    title: z.string().trim().min(1).max(220).optional(),
    body: z.string().trim().min(1).optional(),
    category_id: uuid.nullable().optional(),
    excerpt: z.string().trim().max(400).nullable().optional(),
    cover_url: z.string().trim().url().nullable().optional(),
    tags: z.array(z.string().trim().max(120)).max(30).optional(),
    is_published: z.coerce.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  species: species.optional(),
  description: z.string().trim().max(2000).optional(),
});
