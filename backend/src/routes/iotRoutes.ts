import { Router } from 'express';
import { submitVitalReadings, deviceHeartbeat, getDeviceStatus } from '../controllers/iotController';
import { validateDeviceKey } from '../middleware/deviceAuthMiddleware';

const router = Router();

router.post('/readings', validateDeviceKey, submitVitalReadings);
router.post('/heartbeat', validateDeviceKey, deviceHeartbeat);
router.get('/devices/:deviceId/status', getDeviceStatus);

export default router;
