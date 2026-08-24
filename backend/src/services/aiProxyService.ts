import axios from 'axios';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';

export interface AIProcessResult {
  reply: string;
  intent?: 'NURSE_CALL' | 'GENERAL' | string;
}

export const processVoiceWithAIServer = async (
  patientId: string,
  transcript: string
): Promise<string> => {
  const result = await processVoiceWithAIServerFull(patientId, transcript);
  return result.reply;
};

export const processVoiceWithAIServerFull = async (
  patientId: string,
  transcript: string
): Promise<AIProcessResult> => {
  try {
    // 1. Fetch latest vital readings for this patient
    const latestVital = await prisma.vitalReading.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });

    // 2. Fetch patient info
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        medicines: {
          include: {
            schedules: { where: { isActive: true } },
            logs: {
              where: { status: 'PENDING' },
              orderBy: { scheduledAt: 'asc' },
              take: 2,
            },
          },
        },
      },
    });

    // 3. Format patient context
    const patientContext: any = {};

    if (patient) {
      patientContext.patientName = `${patient.user.firstName} ${patient.user.lastName}`;
    }

    if (latestVital) {
      patientContext.vitals = {
        heartRate: latestVital.heartRate,
        spo2: latestVital.spo2,
        temperature: latestVital.temperature,
        recordedAt: latestVital.recordedAt.toISOString(),
      };
    }

    if (patient?.medicines && patient.medicines.length > 0) {
      patientContext.medicines = patient.medicines.map((m) => {
        const nextSchedule = m.schedules[0]?.scheduledTime || '';
        const pendingLog = m.logs[0];
        return {
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          instructions: m.instructions || '',
          nextDoseTime: nextSchedule,
          pendingStatus: pendingLog ? 'Pending dose' : 'Taken / On schedule',
        };
      });
    }

    // 4. Send to Flask AI server
    const response = await axios.post(
      `${ENV.AI_SERVER_URL}/api/voice`,
      {
        patientId,
        transcript,
        patientContext,
      },
      { timeout: 15000 }
    );

    if (response.data && response.data.reply) {
      return {
        reply: response.data.reply,
        intent: response.data.intent || 'GENERAL',
      };
    }

    return {
      reply: 'SmartCare+ AI received your prompt: ' + transcript,
      intent: 'GENERAL',
    };
  } catch (error: any) {
    console.warn(`⚠️ Flask AI server unavailable at ${ENV.AI_SERVER_URL}:`, error.message);
    return {
      reply: 'AI service currently unavailable. Please contact nursing staff for urgent assistance.',
      intent: 'GENERAL',
    };
  }
};
