import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { logAudit } from '../middleware/auditLogger';
import bcrypt from 'bcryptjs';

export const getSystemStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const totalDoctors = await prisma.doctor.count();
    const totalPatients = await prisma.patient.count();
    const totalDevices = await prisma.device.count();
    const onlineDevices = await prisma.device.count({ where: { status: 'ONLINE' } });
    const activeAlerts = await prisma.alert.count({ where: { status: 'ACTIVE' } });
    const criticalAlerts = await prisma.alert.count({ where: { status: 'ACTIVE', severity: 'CRITICAL' } });
    const totalVitals = await prisma.vitalReading.count();

    const threshold = await prisma.thresholdConfig.findUnique({ where: { id: 'default' } });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalDevices,
        onlineDevices,
        activeAlerts,
        criticalAlerts,
        totalVitals,
        thresholdConfig: threshold,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        patient: { select: { patientId: true } },
        doctor: { select: { doctorId: true, specialization: true } },
      },
    });

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

export const assignDoctorToPatient = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { doctorId, patientId } = req.body;

    let resolvedDocId = doctorId;
    if (doctorId?.startsWith('DOC-')) {
      const d = await prisma.doctor.findUnique({ where: { doctorId } });
      if (d) resolvedDocId = d.id;
    }

    let resolvedPatId = patientId;
    if (patientId?.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedPatId = p.id;
    }

    if (!resolvedDocId || !resolvedPatId) {
      res.status(400).json({ success: false, message: 'doctorId and patientId are required.', errorCode: 'MISSING_IDS' });
      return;
    }

    const assignment = await prisma.doctorPatientAssignment.upsert({
      where: {
        doctorId_patientId: {
          doctorId: resolvedDocId,
          patientId: resolvedPatId,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        doctorId: resolvedDocId,
        patientId: resolvedPatId,
        status: 'ACTIVE',
      },
    });

    await logAudit(req.user?.userId || null, 'DOCTOR_PATIENT_ASSIGN', 'ASSIGNMENT', assignment.id, req.ip);

    res.json({ success: true, message: 'Doctor assigned to patient successfully.', assignment });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true, role: true, firstName: true, lastName: true } },
      },
    });

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};

export const updateThresholdConfig = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { minHeartRate, maxHeartRate, minSpo2Warning, minSpo2Critical, minTemp, maxTemp } = req.body;

    const threshold = await prisma.thresholdConfig.upsert({
      where: { id: 'default' },
      update: {
        ...(minHeartRate != null ? { minHeartRate: Number(minHeartRate) } : {}),
        ...(maxHeartRate != null ? { maxHeartRate: Number(maxHeartRate) } : {}),
        ...(minSpo2Warning != null ? { minSpo2Warning: Number(minSpo2Warning) } : {}),
        ...(minSpo2Critical != null ? { minSpo2Critical: Number(minSpo2Critical) } : {}),
        ...(minTemp != null ? { minTemp: Number(minTemp) } : {}),
        ...(maxTemp != null ? { maxTemp: Number(maxTemp) } : {}),
      },
      create: {
        id: 'default',
        minHeartRate: Number(minHeartRate || 50),
        maxHeartRate: Number(maxHeartRate || 120),
        minSpo2Warning: Number(minSpo2Warning || 94),
        minSpo2Critical: Number(minSpo2Critical || 90),
        minTemp: Number(minTemp || 36.0),
        maxTemp: Number(maxTemp || 38.0),
      },
    });

    await logAudit(req.user?.userId || null, 'THRESHOLD_CONFIG_UPDATE', 'SETTINGS', 'default', req.ip);

    res.json({ success: true, message: 'Software alert threshold settings updated.', thresholdConfig: threshold });
  } catch (error) {
    next(error);
  }
};
