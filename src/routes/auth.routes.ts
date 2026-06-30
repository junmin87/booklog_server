import { Router } from 'express';
import { validateToken, appleLogin, appleRevoke, kakaoLogin } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { appleLoginSchema, appleRevokeSchema, kakaoLoginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/validate-token', validateToken);
router.post('/apple/login', validate(appleLoginSchema), appleLogin);
router.post('/apple/revoke', validate(appleRevokeSchema), appleRevoke);

router.post('/kakao/login', validate(kakaoLoginSchema), kakaoLogin);

export default router;
