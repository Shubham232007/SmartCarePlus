import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { broadcastEmergencyEvent, broadcastNewAlert } from '../sockets/socketManager';
import { logAudit } from '../middleware/auditLogger';

export const triggerSOS = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, deviceId, triggerType, description } = req.body;

    let resolvedId = patientId || req.user?.patientId;
    if (typeof resolvedId === 'string' && resolvedId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId: resolvedId } });
      if (p) resolvedId = p.id;
    }

    if (!resolvedId || typeof resolvedId !== 'string') {
      res.status(400).json({ success: false, message: 'Patient ID is required for SOS trigger.', errorCode: 'MISSING_PATIENT_ID' });
      return;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: resolvedId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient profile not found.', errorCode: 'PATIENT_NOT_FOUND' });
      return;
    }

    // 1. Create Emergency Event
    const emergency = await prisma.emergencyEvent.create({
      data: {
        patientId: resolvedId,
        deviceId: deviceId || null,
        triggerType: triggerType || 'SOS_BUTTON',
        description: description || `EMERGENCY SOS triggered by ${patient.user.firstName} ${patient.user.lastName}`,
        createdAt: new Date(),
        status: 'PENDING',
      },
    });

    // 2. Create Critical Alert
    const createdAlert = await prisma.alert.create({
      data: {
        patientId: resolvedId,
        deviceId: deviceId || null,
        type: 'SOS',
        severity: 'CRITICAL',
        title: '🔴 EMERGENCY SOS ALARM',
        message: `Patient ${patient.user.firstName} ${patient.user.lastName} triggered an immediate SOS assistance call!`,
        status: 'ACTIVE',
      },
      include: {
        patient: {
          select: {
            patientId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    await logAudit(req.user?.userId || null, 'SOS_TRIGGER', 'EMERGENCY', emergency.id, String(req.ip || '127.0.0.1'));

    // 3. Broadcast real-time Socket.IO events
    broadcastEmergencyEvent({
      ...emergency,
      patientName: `${patient.user.firstName} ${patient.user.lastName}`,
      patientHumanId: patient.patientId,
    });
    broadcastNewAlert(createdAlert);

    res.status(201).json({
      success: true,
      message: 'Emergency SOS activated. Caregivers and doctors notified.',
      emergency,
      alert: createdAlert,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmergencyEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientId = (req.query.patientId as string) || req.user?.patientId;

    let whereCondition: any = {};
    if (req.user?.role === 'PATIENT') {
      whereCondition.patientId = req.user.patientId;
    } else if (patientId && typeof patientId === 'string') {
      let resolvedId = patientId;
      if (patientId.startsWith('PAT-')) {
        const p = await prisma.patient.findUnique({ where: { patientId } });
        if (p) resolvedId = p.id;
      }
      whereCondition.patientId = resolvedId;
    }

    const events = await prisma.emergencyEvent.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            patientId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
};

export const respondEmergencyEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const updated = await prisma.emergencyEvent.update({
      where: { id },
      data: {
        status: status || 'ACKNOWLEDGED',
        respondedAt: new Date(),
        respondedBy: req.user?.email || 'NURSE_STATION',
      },
    });

    await logAudit(req.user?.userId || null, 'EMERGENCY_RESPOND', 'EMERGENCY', id, String(req.ip || '127.0.0.1'));

    res.json({ success: true, message: 'Emergency event status updated.', emergency: updated });
  } catch (error) {
    next(error);
  }
};
