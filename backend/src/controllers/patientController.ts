import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const getPatientProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id || req.user?.patientId;
    const id = typeof rawId === 'string' ? rawId : undefined;

    if (!id) {
      res.status(400).json({ success: false, message: 'Patient ID is required.', errorCode: 'MISSING_PATIENT_ID' });
      return;
    }

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id }, { patientId: id }],
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        devices: true,
        doctorAssignments: {
          include: {
            doctor: {
              include: { user: { select: { firstName: true, lastName: true, email: true } } },
            },
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient profile not found.', errorCode: 'PATIENT_NOT_FOUND' });
      return;
    }

    res.json({ success: true, patient });
  } catch (error) {
    next(error);
  }
};

export const getLatestVitals = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id || req.user?.patientId;
    const patientId = typeof rawId === 'string' ? rawId : '';

    let resolvedId = patientId;
    if (patientId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedId = p.id;
    }

    const latest = await prisma.vitalReading.findFirst({
      where: { patientId: resolvedId },
      orderBy: { recordedAt: 'desc' },
      include: { device: { select: { deviceId: true, status: true, lastSeen: true } } },
    });

    res.json({
      success: true,
      latest: latest || {
        heartRate: 75,
        spo2: 98,
        temperature: 36.6,
        recordedAt: new Date(),
        device: { status: 'OFFLINE' },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getVitalsHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawId = req.params.id || req.user?.patientId;
    const patientId = typeof rawId === 'string' ? rawId : '';

    const range = (req.query.range as string) || '24h';
    const from = req.query.from as string;
    const to = req.query.to as string;

    let resolvedId = patientId;
    if (patientId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedId = p.id;
    }

    let startDate = new Date();
    const now = new Date();

    if (from && to) {
      startDate = new Date(from);
    } else {
      switch (range) {
        case '1h':
          startDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
          break;
        case '6h':
          startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
    }

    const readings = await prisma.vitalReading.findMany({
      where: {
        patientId: resolvedId,
        recordedAt: {
          gte: startDate,
          ...(to ? { lte: new Date(to) } : {}),
        },
      },
      orderBy: { recordedAt: 'asc' },
    });

    res.json({ success: true, count: readings.length, range, readings });
  } catch (error) {
    next(error);
  }
};
