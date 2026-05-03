import { Router } from 'express';
import { sendPush } from '../controllers/push.controller';

const router = Router();

router.post('/cron/send-push', sendPush);

export default router;