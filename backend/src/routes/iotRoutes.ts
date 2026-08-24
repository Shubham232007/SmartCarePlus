import { Router } from 'express';
import { submitVitalReadings, deviceHeartbeat, getDeviceStatus, deviceTriggeredSOS, deviceVoiceQuery } from '../controllers/iotController';
import { validateDeviceKey } from '../middleware/deviceAuthMiddleware';

const router = Router();

router.post('/readings', validateDeviceKey, submitVitalReadings);
router.post('/heartbeat', validateDeviceKey, deviceHeartbeat);
router.post('/sos', validateDeviceKey, deviceTriggeredSOS);        // ESP32 SOS button
router.post('/voice', validateDeviceKey, deviceVoiceQuery);         // ESP32 AI voice query
router.get('/devices/:deviceId/status', getDeviceStatus);

export default router;
