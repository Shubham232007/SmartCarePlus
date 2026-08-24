import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { processVoiceWithAIServer } from '../services/aiProxyService';
import { broadcastVoiceInteraction } from '../sockets/socketManager';

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

    // Proxy request to Flask AI Server with graceful fallback
    const aiResponse = await processVoiceWithAIServer(resolvedId, transcript);

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

    res.status(201).json({ success: true, interaction });
  } catch (error) {
    next(error);
  }
};
