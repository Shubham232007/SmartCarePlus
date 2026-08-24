import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { broadcastAlertUpdated } from '../sockets/socketManager';
import { logAudit } from '../middleware/auditLogger';

export const getAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientIdQuery = req.query.patientId as string;
    const statusQuery = req.query.status as string;

    let whereCondition: any = {};

    if (req.user?.role === 'PATIENT') {
      whereCondition.patientId = req.user.patientId;
    } else if (req.user?.role === 'DOCTOR') {
      const assignments = await prisma.doctorPatientAssignment.findMany({
        where: { doctorId: req.user.doctorId, status: 'ACTIVE' },
        select: { patientId: true },
      });
      whereCondition.patientId = { in: assignments.map((a) => a.patientId) };
    }

    if (patientIdQuery) {
      let resolvedId = patientIdQuery;
      if (patientIdQuery.startsWith('PAT-')) {
        const p = await prisma.patient.findUnique({ where: { patientId: patientIdQuery } });
        if (p) resolvedId = p.id;
      }
      whereCondition.patientId = resolvedId;
    }

    if (statusQuery) {
      whereCondition.status = statusQuery;
    }

    const alerts = await prisma.alert.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            patientId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        device: { select: { deviceId: true } },
      },
    });

    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    next(error);
  }
};

export const acknowledgeAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found.', errorCode: 'ALERT_NOT_FOUND' });
      return;
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: `${req.user?.email} (${req.user?.role})`,
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

    await logAudit(req.user?.userId || null, 'ALERT_ACKNOWLEDGE', 'ALERT', id, String(req.ip || '127.0.0.1'));
    broadcastAlertUpdated(updatedAlert);

    res.json({ success: true, message: 'Alert acknowledged.', alert: updatedAlert });
  } catch (error) {
    next(error);
  }
};

export const resolveAlert = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
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

    await logAudit(req.user?.userId || null, 'ALERT_RESOLVE', 'ALERT', id, String(req.ip || '127.0.0.1'));
    broadcastAlertUpdated(updatedAlert);

    res.json({ success: true, message: 'Alert resolved.', alert: updatedAlert });
  } catch (error) {
    next(error);
  }
};
