import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as usersController from './users.controller.js';
import {
  listUsersSchema,
  idParamSchema,
  updateMeSchema,
  updateStatusSchema,
} from './users.validation.js';

const router = Router();

// Every user route requires authentication.
router.use(authenticate);

router.get('/', authorize('SUPER_ADMIN'), validate(listUsersSchema, 'query'), usersController.list);

router.put('/me', validate(updateMeSchema), usersController.updateMe);

router.get('/:id', validate(idParamSchema, 'params'), usersController.getById);

router.patch(
  '/:id/status',
  authorize('SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateStatusSchema),
  usersController.setStatus
);

router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(idParamSchema, 'params'),
  usersController.remove
);

export default router;
