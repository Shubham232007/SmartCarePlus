import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { DeviceRequest } from '../middleware/deviceAuthMiddleware';
import { evaluateVitalAlerts } from '../services/alertEvaluator';
import { broadcastVitalUpdate, broadcastDeviceStatus, broadcastEmergencyEvent, broadcastNewAlert } from '../sockets/socketManager';
import { processVoiceWithAIServer } from '../services/aiProxyService';

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

// ─── Device-Authenticated SOS (ESP32 physical SOS button — no JWT needed) ──
export const deviceTriggeredSOS = async (req: DeviceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.device) {
      res.status(401).json({ success: false, message: 'Device not authenticated.', errorCode: 'DEVICE_UNAUTHENTICATED' });
      return;
    }

    const { triggerType, description } = req.body;
    const patientId = req.device.patientId;

    if (!patientId) {
      res.status(400).json({ success: false, message: 'Device is not bound to a patient.', errorCode: 'UNBOUND_DEVICE' });
      return;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found.', errorCode: 'PATIENT_NOT_FOUND' });
      return;
    }

    const finalTrigger = triggerType || 'SOS_BUTTON';
    const finalDesc = description || `EMERGENCY SOS triggered by ${patient.user.firstName} ${patient.user.lastName} via bedside device`;

    const emergency = await prisma.emergencyEvent.create({
      data: {
        patientId,
        deviceId: req.device.id,
        triggerType: finalTrigger,
        description: finalDesc,
        status: 'PENDING',
      },
    });

    const createdAlert = await prisma.alert.create({
      data: {
        patientId,
        deviceId: req.device.id,
        type: 'SOS',
        severity: 'CRITICAL',
        title: '🔴 EMERGENCY SOS ALARM',
        message: `Patient ${patient.user.firstName} ${patient.user.lastName} triggered an immediate SOS from bedside device!`,
        status: 'ACTIVE',
      },
      include: {
        patient: { select: { patientId: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    broadcastEmergencyEvent({ ...emergency, patientName: `${patient.user.firstName} ${patient.user.lastName}`, patientHumanId: patient.patientId });
    broadcastNewAlert(createdAlert);

    console.log(`🔴 [IoT-SOS] Device ${req.device.deviceId} triggered SOS for patient ${patient.patientId}`);

    res.status(201).json({ success: true, message: 'SOS alert broadcast to all caregivers.', emergency, alert: createdAlert });
  } catch (error) {
    next(error);
  }
};

// ─── Device Voice Query (ESP32 sends text transcript, gets AI text back) ────
// ESP32 handles STT locally or via push-to-talk + sends text. Backend calls AI.
export const deviceVoiceQuery = async (req: DeviceRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.device) {
      res.status(401).json({ success: false, message: 'Device not authenticated.', errorCode: 'DEVICE_UNAUTHENTICATED' });
      return;
    }

    const { transcript } = req.body;
    const patientId = req.device.patientId;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      res.status(400).json({ success: false, message: 'transcript is required.', errorCode: 'MISSING_TRANSCRIPT' });
      return;
    }

    if (!patientId) {
      res.status(400).json({ success: false, message: 'Device not bound to a patient.', errorCode: 'UNBOUND_DEVICE' });
      return;
    }

    const aiReply = await processVoiceWithAIServer(patientId, transcript.trim());

    // Store voice interaction in DB
    const interaction = await prisma.voiceInteraction.create({
      data: {
        patientId,
        deviceId: req.device.id,
        transcript: transcript.trim(),
        aiResponse: aiReply,
        timestamp: new Date(),
        status: 'COMPLETED',
      },
    });

    console.log(`🎙️ [IoT-Voice] Device ${req.device.deviceId} voice query: "${transcript.trim().substring(0, 60)}..."`);

    res.json({ success: true, reply: aiReply, interactionId: interaction.id });
  } catch (error) {
    next(error);
  }
};
