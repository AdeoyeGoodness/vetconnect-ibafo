import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  listAnimalsQuery,
  createAnimalSchema,
  updateAnimalSchema,
  idParam,
} from './animals.validation.js';
import * as controller from './animals.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listAnimalsQuery, 'query'), controller.list);
router.get('/:id', validate(idParam, 'params'), controller.getOne);
router.post('/', validate(createAnimalSchema), controller.create);
router.put('/:id', validate(idParam, 'params'), validate(updateAnimalSchema), controller.update);
router.delete('/:id', validate(idParam, 'params'), controller.remove);

export default router;
