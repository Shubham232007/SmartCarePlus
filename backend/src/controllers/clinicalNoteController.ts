import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { logAudit } from '../middleware/auditLogger';

export const getClinicalNotes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.patientId || (req.query.patientId as string);
    const patientId = typeof rawId === 'string' ? rawId : '';

    let resolvedId = patientId;
    if (patientId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedId = p.id;
    }

    if (!resolvedId) {
      res.status(400).json({ success: false, message: 'Patient ID is required.', errorCode: 'MISSING_PATIENT_ID' });
      return;
    }

    const notes = await prisma.clinicalNote.findMany({
      where: { patientId: resolvedId },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    res.json({ success: true, count: notes.length, notes });
  } catch (error) {
    next(error);
  }
};

export const createClinicalNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.patientId || req.body.patientId;
    const patientId = typeof rawId === 'string' ? rawId : '';
    const { note } = req.body;
    const doctorId = req.user?.doctorId;

    let resolvedId = patientId;
    if (patientId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedId = p.id;
    }

    if (!resolvedId || !note) {
      res.status(400).json({ success: false, message: 'Patient ID and note text are required.', errorCode: 'MISSING_FIELDS' });
      return;
    }

    if (!doctorId && req.user?.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Only authorized doctors can add clinical notes.', errorCode: 'FORBIDDEN' });
      return;
    }

    let docIdToUse = doctorId;
    if (!docIdToUse) {
      const firstDoc = await prisma.doctor.findFirst();
      docIdToUse = firstDoc?.id;
    }

    const newNote = await prisma.clinicalNote.create({
      data: {
        patientId: resolvedId,
        doctorId: docIdToUse!,
        note,
      },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await logAudit(req.user?.userId || null, 'CLINICAL_NOTE_CREATE', 'CLINICAL_NOTE', newNote.id, String(req.ip || '127.0.0.1'));

    res.status(201).json({ success: true, message: 'Clinical note created.', note: newNote });
  } catch (error) {
    next(error);
  }
};

export const updateClinicalNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { note } = req.body;

    const existing = await prisma.clinicalNote.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Note not found.', errorCode: 'NOTE_NOT_FOUND' });
      return;
    }

    const updated = await prisma.clinicalNote.update({
      where: { id },
      data: { note },
    });

    await logAudit(req.user?.userId || null, 'CLINICAL_NOTE_UPDATE', 'CLINICAL_NOTE', id, String(req.ip || '127.0.0.1'));

    res.json({ success: true, message: 'Clinical note updated.', note: updated });
  } catch (error) {
    next(error);
  }
};
