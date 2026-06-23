import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as vetController from './veterinarians.controller.js';
import {
  listVetsSchema,
  idParamSchema,
  createVetSchema,
  updateVetSchema,
  verifyVetSchema,
} from './veterinarians.validation.js';

const router = Router();

router.get('/', validate(listVetsSchema, 'query'), vetController.list);

router.post(
  '/',
  authenticate,
  authorize('CLINIC_ADMIN'),
  validate(createVetSchema),
  vetController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('CLINIC_ADMIN', 'SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateVetSchema),
  vetController.update
);

router.patch(
  '/:id/verify',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(verifyVetSchema),
  vetController.verify
);

router.delete(
  '/:id',
  authenticate,
  authorize('CLINIC_ADMIN', 'SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  vetController.remove
);

export default router;
