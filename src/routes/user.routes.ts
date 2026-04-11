import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getMe, updateCountry, deleteAppleUser } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { updateCountrySchema } from '../validators/user.validator';

const router = Router();

router.get('/user/me', authenticate, getMe);
router.post('/user/country', authenticate, validate(updateCountrySchema), updateCountry);
router.delete('/user/apple', authenticate, deleteAppleUser);

export default router;
