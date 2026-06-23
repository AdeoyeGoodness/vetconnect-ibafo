import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './notifications.controller.js';
import { listNotificationsQuerySchema, idParamSchema } from './notifications.validation.js';

const router = Router();

// Every notification route requires authentication.
router.use(authenticate);

router.get('/', validate(listNotificationsQuerySchema, 'query'), controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validate(idParamSchema, 'params'), controller.markRead);

export default router;
