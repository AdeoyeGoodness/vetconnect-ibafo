import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './reviews.controller.js';
import {
  listReviewsQuerySchema,
  createReviewSchema,
  respondSchema,
  moderateSchema,
  idParamSchema,
} from './reviews.validation.js';

const router = Router();

// Public listing (clinic reviews) + SUPER_ADMIN moderation queue (?status=).
router.get('/', validate(listReviewsQuerySchema, 'query'), controller.list);

// Owner posts a review for a completed appointment.
router.post(
  '/',
  authenticate,
  authorize('OWNER'),
  validate(createReviewSchema),
  controller.create
);

// Clinic admin (owner of the clinic) responds to a review.
router.post(
  '/:id/response',
  authenticate,
  authorize('CLINIC_ADMIN', 'SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(respondSchema),
  controller.respond
);

// SUPER_ADMIN moderation.
router.patch(
  '/:id/moderate',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(moderateSchema),
  controller.moderate
);

// Author (within edit window) or SUPER_ADMIN.
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  controller.remove
);

export default router;
