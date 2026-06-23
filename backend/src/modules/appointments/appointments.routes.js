import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  bookSchema,
  listQuery,
  idParam,
  patchSchema,
} from './appointments.validation.js';
import * as controller from './appointments.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(bookSchema), controller.book);
router.get('/', validate(listQuery, 'query'), controller.list);
router.get('/:id', validate(idParam, 'params'), controller.getOne);
router.patch('/:id', validate(idParam, 'params'), validate(patchSchema), controller.patch);

export default router;
