import { Router } from 'express';
import { getPatientProfile, getLatestVitals, getVitalsHistory } from '../controllers/patientController';
import { authenticateJwt, authorizeDoctorPatientAccess } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/me', getPatientProfile);
router.get('/:id', authorizeDoctorPatientAccess, getPatientProfile);
router.get('/:id/vitals', authorizeDoctorPatientAccess, getVitalsHistory);
router.get('/:id/vitals/latest', authorizeDoctorPatientAccess, getLatestVitals);
router.get('/:id/vitals/history', authorizeDoctorPatientAccess, getVitalsHistory);

export default router;
