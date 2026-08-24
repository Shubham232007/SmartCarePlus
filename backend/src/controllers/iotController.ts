import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { DeviceRequest } from '../middleware/deviceAuthMiddleware';
import { evaluateVitalAlerts } from '../services/alertEvaluator';
import { broadcastVitalUpdate, broadcastDeviceStatus } from '../sockets/socketManager';

export const submitVitalReadings = async (req: DeviceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { deviceId, patientId, heartRate, spo2, temperature, timestamp } = req.body;

    if (heartRate == null || spo2 == null || temperature == null) {
      res.status(400).json({
        success: false,
        message: 'Invalid sensor readings. heartRate, spo2, and temperature are required.',
        errorCode: 'INVALID_SENSOR_DATA',
      });
      return;
    }

    let resolvedPatientId = req.device?.patientId;
    if (patientId && typeof patientId === 'string') {
      const p = await prisma.patient.findFirst({
        where: { OR: [{ id: patientId }, { patientId }] },
      });
      if (p) {
        resolvedPatientId = p.id;
      }
    }

    if (!resolvedPatientId) {
      res.status(400).json({
        success: false,
        message: `Device '${deviceId}' is not currently bound to any active patient.`,
        errorCode: 'UNBOUND_DEVICE',
      });
      return;
    }

    const recordedAt = timestamp ? new Date(timestamp) : new Date();

    const reading = await prisma.vitalReading.create({
      data: {
        patientId: resolvedPatientId,
        deviceId: req.device!.id,
        heartRate: Number(heartRate),
        spo2: Number(spo2),
        temperature: Number(temperature),
        recordedAt,
      },
    });

    const updatedDevice = await prisma.device.update({
      where: { id: req.device!.id },
      data: {
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });

    broadcastDeviceStatus({
      deviceId: updatedDevice.deviceId,
      status: 'ONLINE',
      lastSeen: updatedDevice.lastSeen!,
    });

    broadcastVitalUpdate({
      patientId: resolvedPatientId,
      deviceId: updatedDevice.deviceId,
      heartRate: reading.heartRate,
      spo2: reading.spo2,
      temperature: reading.temperature,
      recordedAt: reading.recordedAt,
    });

    await evaluateVitalAlerts(resolvedPatientId, req.device!.id, reading.heartRate, reading.spo2, reading.temperature);

    res.status(201).json({
      success: true,
      message: 'Reading stored',
      readingId: reading.id,
      recordedAt: reading.recordedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const deviceHeartbeat = async (req: DeviceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.device) {
      res.status(400).json({ success: false, message: 'Device not authenticated.', errorCode: 'DEVICE_UNAUTHENTICATED' });
      return;
    }

    const updated = await prisma.device.update({
      where: { id: req.device.id },
      data: {
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });

    broadcastDeviceStatus({
      deviceId: updated.deviceId,
      status: 'ONLINE',
      lastSeen: updated.lastSeen!,
    });

    res.json({ success: true, message: 'Heartbeat acknowledged.', status: updated.status, lastSeen: updated.lastSeen });
  } catch (error) {
    next(error);
  }
};

export const getDeviceStatus = async (req: DeviceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deviceId = String(req.params.deviceId);
    const device = await prisma.device.findUnique({
      where: { deviceId },
      include: { patient: { select: { patientId: true, user: { select: { firstName: true, lastName: true } } } } },
    });

    if (!device) {
      res.status(404).json({ success: false, message: 'Device not found.', errorCode: 'DEVICE_NOT_FOUND' });
      return;
    }

    res.json({ success: true, device });
  } catch (error) {
    next(error);
  }
};
