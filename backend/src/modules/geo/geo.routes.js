import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as geoController from './geo.controller.js';
import { nearbySchema } from './geo.validation.js';

const router = Router();

router.get('/nearby', validate(nearbySchema, 'query'), geoController.nearby);

export default router;
