import { Router } from 'express';
import { getAlerts, acknowledgeAlert, resolveAlert } from '../controllers/alertController';
import { authenticateJwt, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', getAlerts);
router.post('/:id/acknowledge', authorizeRoles('DOCTOR', 'ADMIN'), acknowledgeAlert);
router.post('/:id/resolve', authorizeRoles('DOCTOR', 'ADMIN'), resolveAlert);

export default router;
