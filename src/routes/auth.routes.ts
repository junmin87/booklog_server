import { Router } from 'express';
import { validateToken, appleLogin, appleRevoke } from '../controllers/auth.controller';

const router = Router();

router.post('/validate-token', validateToken);
router.post('/apple/login', appleLogin);
router.post('/apple/revoke', appleRevoke);

export default router;
