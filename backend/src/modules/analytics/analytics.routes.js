import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import * as controller from './analytics.controller.js';

const router = Router();

router.use(authenticate);

router.get('/owner', authorize('OWNER'), controller.owner);
router.get('/clinic', authorize('CLINIC_ADMIN'), controller.clinic);
router.get('/admin', authorize('SUPER_ADMIN'), controller.admin);

export default router;
