import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  clinicIdParam,
  blockIdParam,
  listAvailabilityQuery,
  slotsQuery,
  replaceScheduleSchema,
  createBlockSchema,
} from './availability.validation.js';
import * as controller from './availability.controller.js';

const router = Router();

// Public reads.
router.get('/', validate(listAvailabilityQuery, 'query'), controller.list);
router.get(
  '/:clinic_id/slots',
  validate(clinicIdParam, 'params'),
  validate(slotsQuery, 'query'),
  controller.slots
);

// Authenticated admin writes.
router.put(
  '/:clinic_id',
  authenticate,
  validate(clinicIdParam, 'params'),
  validate(replaceScheduleSchema),
  controller.replaceSchedule
);
router.post(
  '/:clinic_id/block',
  authenticate,
  validate(clinicIdParam, 'params'),
  validate(createBlockSchema),
  controller.addBlock
);
router.delete(
  '/block/:id',
  authenticate,
  validate(blockIdParam, 'params'),
  controller.removeBlock
);

export default router;
