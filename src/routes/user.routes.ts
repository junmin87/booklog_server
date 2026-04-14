import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getMe, updateCountry, updateFcmToken, deleteFcmToken, deleteAppleUser } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { updateCountrySchema, updateFcmTokenSchema } from '../validators/user.validator';

const router = Router();

router.get('/user/me', authenticate, getMe);
router.post('/user/country', authenticate, validate(updateCountrySchema), updateCountry);
router.post('/user/fcm-token', authenticate, validate(updateFcmTokenSchema), updateFcmToken);
router.delete('/user/fcm-token', authenticate, deleteFcmToken);
router.delete('/user/apple', authenticate, deleteAppleUser);

export default router;
