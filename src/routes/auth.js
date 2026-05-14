import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

import * as authController from '../controllers/auth.js';

const router = Router();

router.post('/login', authController.login);

router.post('/register', authController.register);

router.get('/me', authMiddleware, authController.getUserData);

router.put('/me', authMiddleware, authController.updateUserData);

router.post('/refresh', authController.refreshUserAuthToken);

router.post('/logout', authController.logout);

export default router;