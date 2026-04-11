import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getMe, updateCountry, deleteAppleUser } from '../controllers/user.controller';

const router = Router();

router.get('/user/me', authenticate, getMe);
router.post('/user/country', authenticate, updateCountry);
router.delete('/user/apple', authenticate, deleteAppleUser);

export default router;
