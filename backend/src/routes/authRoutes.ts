import { Router } from 'express';
import { login, register, getMe, logout } from '../controllers/authController';
import { authenticateJwt } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateJwt, getMe);
router.post('/logout', authenticateJwt, logout);

export default router;
