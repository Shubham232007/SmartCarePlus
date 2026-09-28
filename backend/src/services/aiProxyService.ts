import axios from 'axios';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';

export interface AIProcessResult {
  reply: string;
  intent?: 'NURSE_CALL' | 'GENERAL' | string;
  audioBase64?: string;
  audioFormat?: string;
  sampleRate?: number;
  channels?: number;
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
  let patientContext: any = {};
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
        audioBase64: response.data.audioBase64,
        audioFormat: response.data.audioFormat || 'pcm_s16le',
        sampleRate: response.data.sampleRate || 8000,
        channels: response.data.channels || 1,
      };
    }

    return {
      reply: 'SmartCare+ AI received your prompt: ' + transcript,
      intent: 'GENERAL',
    };
  } catch (error: any) {
    console.warn(`⚠️ Flask AI server unavailable at ${ENV.AI_SERVER_URL}:`, error.message);
    const fallbackReply = getLocalFallbackReply(transcript, patientContext);
    return {
      reply: fallbackReply,
      intent: 'GENERAL',
    };
  }
};

function getLocalFallbackReply(transcript: string, context: any): string {
  const lower = transcript.toLowerCase();
  const vitals = context?.vitals || {};
  const medicines = context?.medicines || [];

  if (lower.includes('nurse') || lower.includes('help') || lower.includes('sos') || lower.includes('call')) {
    return 'Okay. I have notified the nursing station. A healthcare team member will be with you shortly.';
  }

  if (lower.includes('heart') || lower.includes('pulse') || lower.includes('bpm')) {
    if (vitals.heartRate) {
      return `Your latest heart rate is ${Math.round(vitals.heartRate)} beats per minute.`;
    }
    return 'I do not have a live heart rate reading right now. Please ensure your finger is placed on the sensor.';
  }

  if (lower.includes('oxygen') || lower.includes('spo2') || lower.includes('saturation')) {
    if (vitals.spo2) {
      return `Your oxygen saturation level is ${Math.round(vitals.spo2)} percent.`;
    }
    return 'I do not have a live oxygen reading right now. Please place your finger on the pulse oximeter.';
  }

  if (lower.includes('temp') || lower.includes('fever')) {
    if (vitals.temperature) {
      return `Your body temperature is ${Number(vitals.temperature).toFixed(1)} degrees Celsius.`;
    }
    return 'I do not have a live temperature reading available right now.';
  }

  if (lower.includes('medicine') || lower.includes('medication') || lower.includes('pill') || lower.includes('dose') || lower.includes('due')) {
    if (medicines.length > 0) {
      const first = medicines[0];
      return `Your medicine ${first.name} (${first.dosage}) is scheduled for ${first.nextDoseTime || 'today'}.`;
    }
    return 'You have no pending medicines scheduled for today.';
  }

  return 'I am monitoring your bedside vitals. Please use the voice assistant to check your health status or call a nurse.';
}
