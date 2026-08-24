import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { processVoiceWithAIServerFull } from '../services/aiProxyService';
import { broadcastVoiceInteraction, broadcastEmergencyEvent, broadcastNewAlert } from '../sockets/socketManager';
import { logAudit } from '../middleware/auditLogger';

export const getVoiceInteractions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

    const interactions = await prisma.voiceInteraction.findMany({
      where: { patientId: resolvedId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    res.json({ success: true, count: interactions.length, interactions });
  } catch (error) {
    next(error);
  }
};

export const createVoiceInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, transcript, deviceId } = req.body;

    let resolvedId = patientId || req.user?.patientId;
    if (resolvedId?.startsWith('PAT-')) {
      const p = await prisma.patient.findUnique({ where: { patientId: resolvedId } });
      if (p) resolvedId = p.id;
    }

    if (!resolvedId || !transcript) {
      res.status(400).json({ success: false, message: 'Patient ID and voice transcript are required.', errorCode: 'MISSING_FIELDS' });
      return;
    }

    // Proxy request to Flask AI Server with full context & intent analysis
    const aiResult = await processVoiceWithAIServerFull(resolvedId, transcript);
    const aiResponse = aiResult.reply;

    const interaction = await prisma.voiceInteraction.create({
      data: {
        patientId: resolvedId,
        deviceId: deviceId || null,
        transcript,
        aiResponse,
        timestamp: new Date(),
        status: 'COMPLETED',
      },
    });

    broadcastVoiceInteraction(interaction);

    // If intent is NURSE_CALL, trigger emergency alert to doctors/nurses
    let nurseCallTriggered = false;
    if (aiResult.intent === 'NURSE_CALL') {
      try {
        const patient = await prisma.patient.findUnique({
          where: { id: resolvedId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });

        if (patient) {
          const emergency = await prisma.emergencyEvent.create({
            data: {
              patientId: resolvedId,
              deviceId: deviceId || null,
              triggerType: 'VOICE_REQUEST',
              description: `Nurse call requested via SmartCare+ AI voice interaction by ${patient.user.firstName} ${patient.user.lastName}: "${transcript}"`,
              status: 'PENDING',
            },
          });

          const createdAlert = await prisma.alert.create({
            data: {
              patientId: resolvedId,
              deviceId: deviceId || null,
              type: 'NURSE_CALL',
              severity: 'WARNING',
              title: '🟡 NURSE CALL REQUEST (Voice)',
              message: `Patient ${patient.user.firstName} ${patient.user.lastName} requested nursing assistance via bedside voice assistant.`,
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

          await logAudit(
            req.user?.userId || null,
            'VOICE_NURSE_CALL',
            'EMERGENCY',
            emergency.id,
            String(req.ip || '127.0.0.1')
          );

          broadcastEmergencyEvent({
            ...emergency,
            patientName: `${patient.user.firstName} ${patient.user.lastName}`,
            patientHumanId: patient.patientId,
          });
          broadcastNewAlert(createdAlert);
          nurseCallTriggered = true;
        }
      } catch (nurseCallErr) {
        console.error('Failed to trigger nurse call from voice interaction:', nurseCallErr);
      }
    }

    res.status(201).json({
      success: true,
      interaction,
      intent: aiResult.intent,
      nurseCallTriggered,
    });
  } catch (error) {
    next(error);
  }
};
