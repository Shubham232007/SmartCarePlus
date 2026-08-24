import { Router } from 'express';
import { getMedicines, createMedicine, confirmMedicineLog } from '../controllers/medicineController';
import { authenticateJwt, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', getMedicines);
router.post('/', authorizeRoles('DOCTOR', 'ADMIN'), createMedicine);
router.post('/logs/:id/confirm', confirmMedicineLog);

export default router;
