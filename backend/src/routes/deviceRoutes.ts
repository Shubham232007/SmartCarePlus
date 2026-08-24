import { Router } from 'express';
import { getDevices, registerDevice, updateDevice } from '../controllers/deviceController';
import { authenticateJwt, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', getDevices);
router.post('/', authorizeRoles('ADMIN'), registerDevice);
router.put('/:id', authorizeRoles('ADMIN'), updateDevice);

export default router;
