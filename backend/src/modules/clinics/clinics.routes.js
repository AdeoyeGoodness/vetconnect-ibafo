import { Router } from 'express';
import { authenticate, optionalAuth, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as clinicsController from './clinics.controller.js';
import {
  listClinicsSchema,
  idOrSlugParamSchema,
  idParamSchema,
  createClinicSchema,
  updateClinicSchema,
  updateClinicStatusSchema,
} from './clinics.validation.js';

const router = Router();

router.get('/', optionalAuth, validate(listClinicsSchema, 'query'), clinicsController.list);

// Static routes must come before the dynamic :idOrSlug matcher.
router.get('/mine', authenticate, authorize('CLINIC_ADMIN'), clinicsController.mine);

router.post(
  '/',
  authenticate,
  authorize('OWNER', 'CLINIC_ADMIN'),
  validate(createClinicSchema),
  clinicsController.create
);

router.get(
  '/:idOrSlug',
  optionalAuth,
  validate(idOrSlugParamSchema, 'params'),
  clinicsController.getOne
);

router.put(
  '/:id',
  authenticate,
  authorize('OWNER', 'CLINIC_ADMIN', 'SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateClinicSchema),
  clinicsController.update
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateClinicStatusSchema),
  clinicsController.setStatus
);

export default router;
