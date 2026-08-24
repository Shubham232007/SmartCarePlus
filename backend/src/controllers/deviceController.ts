import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { logAudit } from '../middleware/auditLogger';
import crypto from 'crypto';

export const getDevices = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const devices = await prisma.device.findMany({
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

    res.json({ success: true, count: devices.length, devices });
  } catch (error) {
    next(error);
  }
};

export const registerDevice = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { deviceId, deviceName, patientId, macAddress, firmwareVersion } = req.body;

    if (!deviceId || !deviceName) {
      res.status(400).json({ success: false, message: 'deviceId and deviceName are required.', errorCode: 'MISSING_FIELDS' });
      return;
    }

    let resolvedPatientId = patientId;
    if (typeof patientId === 'string' && patientId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedPatientId = p.id;
    }

    const deviceKey = `device_secret_${deviceId}_${crypto.randomBytes(4).toString('hex')}`;

    const device = await prisma.device.create({
      data: {
        deviceId,
        deviceName,
        patientId: resolvedPatientId || null,
        macAddress,
        firmwareVersion: firmwareVersion || '1.0.0',
        deviceKey,
        status: 'OFFLINE',
      },
    });

    await logAudit(req.user?.userId || null, 'DEVICE_REGISTER', 'DEVICE', device.id, String(req.ip || '127.0.0.1'));

    res.status(201).json({ success: true, message: 'Device registered successfully.', device });
  } catch (error) {
    next(error);
  }
};

export const updateDevice = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { deviceName, patientId, status, firmwareVersion } = req.body;

    let resolvedPatientId = patientId;
    if (typeof patientId === 'string' && patientId.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId } });
      if (p) resolvedPatientId = p.id;
    }

    const updated = await prisma.device.update({
      where: { id },
      data: {
        ...(deviceName ? { deviceName } : {}),
        ...(patientId !== undefined ? { patientId: resolvedPatientId } : {}),
        ...(status ? { status } : {}),
        ...(firmwareVersion ? { firmwareVersion } : {}),
      },
    });

    await logAudit(req.user?.userId || null, 'DEVICE_UPDATE', 'DEVICE', id, String(req.ip || '127.0.0.1'));

    res.json({ success: true, message: 'Device updated successfully.', device: updated });
  } catch (error) {
    next(error);
  }
};
