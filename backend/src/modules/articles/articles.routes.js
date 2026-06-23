import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './articles.controller.js';
import {
  listArticlesQuerySchema,
  slugParamSchema,
  idParamSchema,
  createArticleSchema,
  updateArticleSchema,
  createCategorySchema,
} from './articles.validation.js';

const router = Router();

// --- Categories (declared before /:slug to avoid capture) ---
router.get('/categories', controller.listCategories);
router.post(
  '/categories',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(createCategorySchema),
  controller.createCategory
);

// --- Articles ---
router.get('/', validate(listArticlesQuerySchema, 'query'), controller.list);

router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(createArticleSchema),
  controller.create
);

router.put(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateArticleSchema),
  controller.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  controller.remove
);

router.get('/:slug', validate(slugParamSchema, 'params'), controller.getBySlug);

export default router;
