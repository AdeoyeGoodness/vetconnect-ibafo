import { Router } from 'express';
import { authenticate, optionalAuth, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './emergency.controller.js';
import {
  createEmergencySchema,
  listEmergencyQuerySchema,
  updateEmergencySchema,
  idParamSchema,
} from './emergency.validation.js';

const router = Router();

// Guests allowed — capture user if a token is present.
router.post('/', optionalAuth, validate(createEmergencySchema), controller.create);

// Public quick-reference list of emergency clinics (declare before /:id).
router.get('/contacts', controller.contacts);

router.get(
  '/',
  authenticate,
  authorize('CLINIC_ADMIN', 'SUPER_ADMIN'),
  validate(listEmergencyQuerySchema, 'query'),
  controller.list
);

router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  controller.getOne
);

router.patch(
  '/:id',
  authenticate,
  authorize('CLINIC_ADMIN', 'SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateEmergencySchema),
  controller.update
);

export default router;
