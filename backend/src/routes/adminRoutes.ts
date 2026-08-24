import { Router } from 'express';
import {
  getSystemStatistics,
  getUsers,
  assignDoctorToPatient,
  getAuditLogs,
  updateThresholdConfig,
} from '../controllers/adminController';
import { authenticateJwt, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);
router.use(authorizeRoles('ADMIN'));

router.get('/statistics', getSystemStatistics);
router.get('/users', getUsers);
router.post('/assign-doctor', assignDoctorToPatient);
router.get('/audit-logs', getAuditLogs);
router.put('/thresholds', updateThresholdConfig);

export default router;
