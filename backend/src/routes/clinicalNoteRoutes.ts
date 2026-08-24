import { Router } from 'express';
import { getClinicalNotes, createClinicalNote, updateClinicalNote } from '../controllers/clinicalNoteController';
import { authenticateJwt, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/patients/:patientId/notes', getClinicalNotes);
router.post('/patients/:patientId/notes', authorizeRoles('DOCTOR', 'ADMIN'), createClinicalNote);
router.put('/notes/:id', authorizeRoles('DOCTOR', 'ADMIN'), updateClinicalNote);

export default router;
