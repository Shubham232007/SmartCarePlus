import { Router } from 'express';
import { getVoiceInteractions, createVoiceInteraction } from '../controllers/voiceController';
import { authenticateJwt } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/interactions', getVoiceInteractions);
router.post('/interactions', createVoiceInteraction);

export default router;
