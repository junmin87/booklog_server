import { Router } from 'express';
import { sendPush } from '../controllers/push.controller';
import { validate } from '../middlewares/validate';
import { sendPushSchema } from '../validators/push.validator';

const router = Router();

router.post('/cron/send-push', validate(sendPushSchema), sendPush);

export default router;
