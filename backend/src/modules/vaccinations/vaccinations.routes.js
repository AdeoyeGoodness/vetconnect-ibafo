import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  idParam,
  listQuery,
  suggestionsQuery,
  createSchema,
  updateSchema,
} from './vaccinations.validation.js';
import * as controller from './vaccinations.controller.js';

const router = Router();

router.use(authenticate);

// Static path first so it is not shadowed by /:id.
router.get('/suggestions', validate(suggestionsQuery, 'query'), controller.suggestions);

router.get('/', validate(listQuery, 'query'), controller.list);
router.post('/', validate(createSchema), controller.create);
router.put('/:id', validate(idParam, 'params'), validate(updateSchema), controller.update);
router.delete('/:id', validate(idParam, 'params'), controller.remove);

export default router;
