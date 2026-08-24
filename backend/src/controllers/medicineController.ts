import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { logAudit } from '../middleware/auditLogger';

export const getMedicines = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientId = (req.query.patientId as string) || req.user?.patientId;

    let resolvedId = patientId as string;
    if (patientId?.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedId = p.id;
    }

    if (!resolvedId) {
      res.status(400).json({ success: false, message: 'Patient ID is required.', errorCode: 'MISSING_PATIENT_ID' });
      return;
    }

    const medicines = await prisma.medicine.findMany({
      where: { patientId: resolvedId },
      include: {
        schedules: true,
        logs: {
          take: 15,
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    res.json({ success: true, medicines });
  } catch (error) {
    next(error);
  }
};

export const createMedicine = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, name, dosage, frequency, instructions, startDate, endDate, schedules } = req.body;

    let resolvedId = patientId || req.user?.patientId;
    if (typeof resolvedId === 'string' && resolvedId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId: resolvedId } });
      if (p) resolvedId = p.id;
    }

    if (!resolvedId || !name || !dosage || !frequency) {
      res.status(400).json({ success: false, message: 'Patient ID, name, dosage, and frequency are required.', errorCode: 'MISSING_FIELDS' });
      return;
    }

    const medicine = await prisma.medicine.create({
      data: {
        patientId: resolvedId,
        name,
        dosage,
        frequency,
        instructions,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    if (schedules && Array.isArray(schedules)) {
      for (const s of schedules) {
        await prisma.medicineSchedule.create({
          data: {
            medicineId: medicine.id,
            scheduledTime: s.scheduledTime || '08:00',
            daysOfWeek: s.daysOfWeek || 'MON,TUE,WED,THU,FRI,SAT,SUN',
          },
        });
      }
    }

    await logAudit(req.user?.userId || null, 'MEDICINE_CREATE', 'MEDICINE', medicine.id, String(req.ip || '127.0.0.1'));

    res.status(201).json({ success: true, message: 'Medicine added successfully.', medicine });
  } catch (error) {
    next(error);
  }
};

export const confirmMedicineLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const log = await prisma.medicineLog.findUnique({ where: { id } });
    if (!log) {
      res.status(404).json({ success: false, message: 'Medicine log entry not found.', errorCode: 'LOG_NOT_FOUND' });
      return;
    }

    const updatedLog = await prisma.medicineLog.update({
      where: { id },
      data: {
        status: status || 'TAKEN',
        takenAt: status === 'SKIPPED' ? null : new Date(),
        confirmedBy: req.user?.email || 'PATIENT_WEB_UI',
      },
      include: { medicine: true },
    });

    await logAudit(req.user?.userId || null, 'MEDICINE_CONFIRM', 'MEDICINE_LOG', id, String(req.ip || '127.0.0.1'));

    res.json({ success: true, message: `Medication marked as ${updatedLog.status}`, log: updatedLog });
  } catch (error) {
    next(error);
  }
};
