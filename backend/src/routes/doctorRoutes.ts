import { Router } from 'express';
import { getDoctorPatients, getDoctorPatientDetails, getDoctorSummary } from '../controllers/doctorController';
import { authenticateJwt, authorizeRoles, authorizeDoctorPatientAccess } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);
router.use(authorizeRoles('DOCTOR', 'ADMIN'));

router.get('/summary', getDoctorSummary);
router.get('/patients', getDoctorPatients);
router.get('/patients/:patientId', authorizeDoctorPatientAccess, getDoctorPatientDetails);

export default router;
