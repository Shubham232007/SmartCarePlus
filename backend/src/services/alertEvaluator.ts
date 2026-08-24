import { prisma } from '../config/prisma';
import { broadcastNewAlert } from '../sockets/socketManager';

export const evaluateVitalAlerts = async (
  patientId: string,
  deviceId: string,
  heartRate: number,
  spo2: number,
  temperature: number
) => {
  try {
    let threshold = await prisma.thresholdConfig.findUnique({ where: { id: 'default' } });
    if (!threshold) {
      threshold = {
        id: 'default',
        minHeartRate: 50,
        maxHeartRate: 120,
        minSpo2Warning: 94,
        minSpo2Critical: 90,
        minTemp: 36.0,
        maxTemp: 38.0,
        updatedAt: new Date(),
      };
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const alertsToTrigger: {
      type: string;
      severity: string;
      title: string;
      message: string;
    }[] = [];

    // Evaluate Heart Rate
    if (heartRate > threshold.maxHeartRate) {
      alertsToTrigger.push({
        type: 'HIGH_HEART_RATE',
        severity: 'CRITICAL',
        title: 'High Heart Rate Alert',
        message: `Heart rate recorded at ${heartRate} BPM (configured limit: >${threshold.maxHeartRate} BPM).`,
      });
    } else if (heartRate < threshold.minHeartRate) {
      alertsToTrigger.push({
        type: 'LOW_HEART_RATE',
        severity: 'WARNING',
        title: 'Low Heart Rate Alert',
        message: `Heart rate recorded at ${heartRate} BPM (configured limit: <${threshold.minHeartRate} BPM).`,
      });
    }

    // Evaluate SpO2
    if (spo2 < threshold.minSpo2Critical) {
      alertsToTrigger.push({
        type: 'LOW_SPO2',
        severity: 'CRITICAL',
        title: 'Critical SpO2 Drop',
        message: `Blood oxygen level dropped critically to ${spo2}% (critical limit: <${threshold.minSpo2Critical}%).`,
      });
    } else if (spo2 < threshold.minSpo2Warning) {
      alertsToTrigger.push({
        type: 'LOW_SPO2',
        severity: 'WARNING',
        title: 'SpO2 Warning Level',
        message: `Blood oxygen level dropped to ${spo2}% (warning limit: <${threshold.minSpo2Warning}%).`,
      });
    }

    // Evaluate Temperature
    if (temperature > threshold.maxTemp) {
      alertsToTrigger.push({
        type: 'HIGH_TEMPERATURE',
        severity: 'WARNING',
        title: 'Elevated Body Temperature',
        message: `Body temperature recorded at ${temperature}°C (limit: >${threshold.maxTemp}°C).`,
      });
    } else if (temperature < threshold.minTemp) {
      alertsToTrigger.push({
        type: 'LOW_TEMPERATURE',
        severity: 'WARNING',
        title: 'Low Body Temperature',
        message: `Body temperature recorded at ${temperature}°C (limit: <${threshold.minTemp}°C).`,
      });
    }

    // Process alerts with cooldown/debouncing
    for (const item of alertsToTrigger) {
      const recentExisting = await prisma.alert.findFirst({
        where: {
          patientId,
          type: item.type,
          createdAt: { gte: twoMinutesAgo },
          status: 'ACTIVE',
        },
      });

      if (!recentExisting) {
        const createdAlert = await prisma.alert.create({
          data: {
            patientId,
            deviceId,
            type: item.type,
            severity: item.severity,
            title: item.title,
            message: item.message,
            heartRate,
            spo2,
            temperature,
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

        console.log(`🚨 Triggered Alert [${createdAlert.type}] for Patient ${createdAlert.patient.patientId}`);
        broadcastNewAlert(createdAlert);
      }
    }
  } catch (error) {
    console.error('Error evaluating vital alerts:', error);
  }
};
