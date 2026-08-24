import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';

export interface DeviceRequest extends Request {
  device?: {
    id: string;
    deviceId: string;
    patientId: string | null;
  };
}

export const validateDeviceKey = async (req: DeviceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deviceKeyHeader = req.headers['x-device-key'] as string;
    const { deviceId } = req.body;

    if (!deviceKeyHeader) {
      res.status(401).json({
        success: false,
        message: 'Device authentication failed. Missing X-Device-Key header.',
        errorCode: 'MISSING_DEVICE_KEY',
      });
      return;
    }

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: 'Invalid IoT payload. deviceId is required.',
        errorCode: 'MISSING_DEVICE_ID',
      });
      return;
    }

    // Lookup device in DB
    const device = await prisma.device.findUnique({
      where: { deviceId },
    });

    // Check if device matches key or master key
    if (!device) {
      res.status(401).json({
        success: false,
        message: `Device '${deviceId}' is not registered in SmartCare+.`,
        errorCode: 'UNREGISTERED_DEVICE',
      });
      return;
    }

    if (deviceKeyHeader !== device.deviceKey && deviceKeyHeader !== ENV.DEVICE_MASTER_KEY) {
      res.status(401).json({
        success: false,
        message: 'Device authentication failed. Invalid device key secret.',
        errorCode: 'INVALID_DEVICE_KEY',
      });
      return;
    }

    req.device = {
      id: device.id,
      deviceId: device.deviceId,
      patientId: device.patientId,
    };

    next();
  } catch (error) {
    next(error);
  }
};
