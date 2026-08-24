import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const getDoctorPatients = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctorId = req.user?.doctorId;
    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || 'ALL';

    if (!doctorId && req.user?.role !== 'ADMIN') {
      res.status(400).json({ success: false, message: 'Doctor profile missing.', errorCode: 'DOCTOR_MISSING' });
      return;
    }

    const whereAssignment = req.user?.role === 'ADMIN' ? {} : { doctorId, status: 'ACTIVE' };

    const assignments = await prisma.doctorPatientAssignment.findMany({
      where: whereAssignment,
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            devices: { select: { deviceId: true, status: true, lastSeen: true } },
            vitalReadings: {
              take: 1,
              orderBy: { recordedAt: 'desc' },
            },
            alerts: {
              where: { status: 'ACTIVE' },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    let patients = assignments.map((a) => {
      const p = a.patient;
      const latestVital = p.vitalReadings[0];
      const activeAlerts = p.alerts;
      const primaryDevice = p.devices[0];

      let healthStatus = 'NORMAL';
      if (activeAlerts.some((al) => al.severity === 'CRITICAL')) {
        healthStatus = 'CRITICAL';
      } else if (activeAlerts.some((al) => al.severity === 'WARNING')) {
        healthStatus = 'WARNING';
      }

      return {
        id: p.id,
        patientId: p.patientId,
        name: `${p.user.firstName} ${p.user.lastName}`,
        dob: p.dateOfBirth,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        phone: p.phone || p.user.phone,
        medicalConditions: p.medicalConditions,
        latestVitals: latestVital || { heartRate: 75, spo2: 98, temperature: 36.6, recordedAt: new Date() },
        deviceStatus: primaryDevice ? primaryDevice.status : 'OFFLINE',
        deviceName: primaryDevice ? primaryDevice.deviceId : 'No Device',
        healthStatus,
        activeAlertCount: activeAlerts.length,
        lastUpdated: latestVital ? latestVital.recordedAt : p.updatedAt,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      patients = patients.filter(
        (p) => p.name.toLowerCase().includes(q) || p.patientId.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      patients = patients.filter((p) => {
        if (statusFilter === 'NORMAL') return p.healthStatus === 'NORMAL';
        if (statusFilter === 'WARNING') return p.healthStatus === 'WARNING';
        if (statusFilter === 'CRITICAL') return p.healthStatus === 'CRITICAL';
        if (statusFilter === 'ONLINE') return p.deviceStatus === 'ONLINE';
        if (statusFilter === 'OFFLINE') return p.deviceStatus === 'OFFLINE';
        return true;
      });
    }

    res.json({ success: true, count: patients.length, patients });
  } catch (error) {
    next(error);
  }
};

export const getDoctorPatientDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetPatientId = String(req.params.patientId);

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [{ id: targetPatientId }, { patientId: targetPatientId }],
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        devices: true,
        vitalReadings: {
          take: 48,
          orderBy: { recordedAt: 'desc' },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        medicines: {
          include: {
            schedules: true,
            logs: {
              take: 10,
              orderBy: { scheduledAt: 'desc' },
            },
          },
        },
        voiceInteractions: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        emergencyEvents: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        clinicalNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient not found.', errorCode: 'PATIENT_NOT_FOUND' });
      return;
    }

    res.json({ success: true, patient });
  } catch (error) {
    next(error);
  }
};

export const getDoctorSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctorId = req.user?.doctorId;

    const assignments = await prisma.doctorPatientAssignment.findMany({
      where: req.user?.role === 'ADMIN' ? {} : { doctorId, status: 'ACTIVE' },
      select: { patientId: true },
    });

    const patientIds = assignments.map((a) => a.patientId);

    const totalPatients = patientIds.length;

    const onlineDevices = await prisma.device.count({
      where: {
        patientId: { in: patientIds },
        status: 'ONLINE',
      },
    });

    const criticalAlerts = await prisma.alert.count({
      where: {
        patientId: { in: patientIds },
        severity: 'CRITICAL',
        status: 'ACTIVE',
      },
    });

    const activeAlerts = await prisma.alert.count({
      where: {
        patientId: { in: patientIds },
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      summary: {
        totalPatients,
        onlineDevices,
        criticalAlerts,
        activeAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
};
