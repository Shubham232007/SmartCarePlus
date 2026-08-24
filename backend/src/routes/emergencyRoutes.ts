import { Router } from 'express';
import { triggerSOS, getEmergencyEvents, respondEmergencyEvent } from '../controllers/emergencyController';
import { authenticateJwt, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.post('/sos', triggerSOS);
router.get('/events', getEmergencyEvents);
router.post('/events/:id/respond', authorizeRoles('DOCTOR', 'ADMIN'), respondEmergencyEvent);

export default router;
