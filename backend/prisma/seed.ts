import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SmartCare+ Database Seeding...');

  // Clear existing records
  await prisma.auditLog.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.emergencyEvent.deleteMany();
  await prisma.voiceInteraction.deleteMany();
  await prisma.medicineLog.deleteMany();
  await prisma.medicineSchedule.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.vitalReading.deleteMany();
  await prisma.device.deleteMany();
  await prisma.doctorPatientAssignment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.thresholdConfig.deleteMany();

  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const docPasswordHash = await bcrypt.hash('Doctor@123456', 10);
  const patPasswordHash = await bcrypt.hash('Patient@123456', 10);

  // 1. Seed Threshold Config
  await prisma.thresholdConfig.create({
    data: {
      id: 'default',
      minHeartRate: 50,
      maxHeartRate: 120,
      minSpo2Warning: 94,
      minSpo2Critical: 90,
      minTemp: 36.0,
      maxTemp: 38.0,
    },
  });

  // 2. Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@smartcare.local',
      passwordHash,
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+1-800-555-0199',
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // 3. Doctor Users & Doctor Records
  const doctorData = [
    {
      email: 'dr.smith@smartcare.local',
      firstName: 'Alexander',
      lastName: 'Smith',
      doctorId: 'DOC-1001',
      specialization: 'Cardiology',
      licenseNumber: 'LIC-CARD-001',
      department: 'Cardiology Unit',
    },
    {
      email: 'dr.sharma@smartcare.local',
      firstName: 'Priya',
      lastName: 'Sharma',
      doctorId: 'DOC-1002',
      specialization: 'Pulmonology',
      licenseNumber: 'LIC-PULM-002',
      department: 'Respiratory Care',
    },
    {
      email: 'dr.patel@smartcare.local',
      firstName: 'Rajesh',
      lastName: 'Patel',
      doctorId: 'DOC-1003',
      specialization: 'Internal Medicine',
      licenseNumber: 'LIC-GEN-003',
      department: 'General Medicine',
    },
  ];

  const doctors = [];
  for (const d of doctorData) {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: docPasswordHash,
        role: 'DOCTOR',
        firstName: d.firstName,
        lastName: d.lastName,
        phone: '+1-555-0100',
      },
    });

    const doc = await prisma.doctor.create({
      data: {
        userId: user.id,
        doctorId: d.doctorId,
        specialization: d.specialization,
        licenseNumber: d.licenseNumber,
        department: d.department,
      },
    });
    doctors.push(doc);
    console.log(`✅ Doctor created: ${d.firstName} ${d.lastName} (${d.doctorId})`);
  }

  // 4. Patient Users & Patient Records
  const patientSeeds = [
    {
      email: 'patient@smartcare.local',
      firstName: 'Rahul',
      lastName: 'Sharma',
      patientId: 'PAT-1001',
      dob: '1988-04-12',
      gender: 'Male',
      bloodGroup: 'B+',
      conditions: 'Hypertension, Mild Asthma',
      allergies: 'Penicillin',
      deviceMac: '24:0AC4:00:01',
    },
    {
      email: 'rahul@smartcare.local',
      firstName: 'Sneha',
      lastName: 'Kapoor',
      patientId: 'PAT-1002',
      dob: '1992-08-25',
      gender: 'Female',
      bloodGroup: 'A+',
      conditions: 'Type 2 Diabetes',
      allergies: 'Sulfa Drugs',
      deviceMac: '24:0AC4:00:02',
    },
    {
      email: 'amitabh@smartcare.local',
      firstName: 'Amitabh',
      lastName: 'Verma',
      patientId: 'PAT-1003',
      dob: '1955-11-03',
      gender: 'Male',
      bloodGroup: 'O+',
      conditions: 'Post-Cardiac Surgery Recovery',
      allergies: 'Aspirin',
      deviceMac: '24:0AC4:00:03',
    },
    {
      email: 'ananya@smartcare.local',
      firstName: 'Ananya',
      lastName: 'Roy',
      patientId: 'PAT-1004',
      dob: '1996-01-19',
      gender: 'Female',
      bloodGroup: 'AB+',
      conditions: 'Arrhythmia',
      allergies: 'None',
      deviceMac: '24:0AC4:00:04',
    },
    {
      email: 'vikram@smartcare.local',
      firstName: 'Vikram',
      lastName: 'Malhotra',
      patientId: 'PAT-1005',
      dob: '1974-06-30',
      gender: 'Male',
      bloodGroup: 'O-',
      conditions: 'COPD',
      allergies: 'Dust, Latex',
      deviceMac: '24:0AC4:00:05',
    },
    {
      email: 'sunita@smartcare.local',
      firstName: 'Sunita',
      lastName: 'Rao',
      patientId: 'PAT-1006',
      dob: '1968-09-14',
      gender: 'Female',
      bloodGroup: 'B-',
      conditions: 'Congestive Heart Failure',
      allergies: 'Iodine',
      deviceMac: '24:0AC4:00:06',
    },
    {
      email: 'karan@smartcare.local',
      firstName: 'Karan',
      lastName: 'Johar',
      patientId: 'PAT-1007',
      dob: '1982-12-05',
      gender: 'Male',
      bloodGroup: 'A-',
      conditions: 'Recovery from Pneumonia',
      allergies: 'None',
      deviceMac: '24:0AC4:00:07',
    },
    {
      email: 'meera@smartcare.local',
      firstName: 'Meera',
      lastName: 'Nair',
      patientId: 'PAT-1008',
      dob: '1990-03-22',
      gender: 'Female',
      bloodGroup: 'O+',
      conditions: 'Post-Op Knee Replacement',
      allergies: 'Codeine',
      deviceMac: '24:0AC4:00:08',
    },
    {
      email: 'rajesh@smartcare.local',
      firstName: 'Rajesh',
      lastName: 'Khanna',
      patientId: 'PAT-1009',
      dob: '1961-07-08',
      gender: 'Male',
      bloodGroup: 'AB-',
      conditions: 'Coronary Artery Disease',
      allergies: 'Statins',
      deviceMac: '24:0AC4:00:09',
    },
    {
      email: 'deepika@smartcare.local',
      firstName: 'Deepika',
      lastName: 'Padukone',
      patientId: 'PAT-1010',
      dob: '1986-05-18',
      gender: 'Female',
      bloodGroup: 'A+',
      conditions: 'Thyroiditis, Migraine',
      allergies: 'NSAIDs',
      deviceMac: '24:0AC4:00:10',
    },
  ];

  const patients = [];
  const devices = [];

  for (let i = 0; i < patientSeeds.length; i++) {
    const p = patientSeeds[i];
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash: patPasswordHash,
        role: 'PATIENT',
        firstName: p.firstName,
        lastName: p.lastName,
        phone: `+1-555-020${i}`,
      },
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientId: p.patientId,
        dateOfBirth: p.dob,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        phone: `+1-555-020${i}`,
        address: `${100 + i} Bedside Pavilion Way, Suite ${i + 1}`,
        emergencyContactName: `Emergency Contact for ${p.firstName}`,
        emergencyContactPhone: `+1-555-990${i}`,
        medicalConditions: p.conditions,
        allergies: p.allergies,
      },
    });
    patients.push(patient);

    const devNum = (i + 1).toString().padStart(3, '0');
    const device = await prisma.device.create({
      data: {
        deviceId: `SC-ESP32-${devNum}`,
        deviceName: `SmartCare Bedside ${p.firstName}`,
        patientId: patient.id,
        deviceType: 'ESP32_BEDSIDE',
        firmwareVersion: '1.2.0',
        macAddress: p.deviceMac,
        deviceKey: `device_secret_${p.patientId}`,
        status: i === 4 ? 'OFFLINE' : 'ONLINE',
        lastSeen: new Date(),
      },
    });
    devices.push(device);

    console.log(`✅ Patient created: ${p.firstName} ${p.lastName} (${p.patientId}) with Device ${device.deviceId}`);
  }

  // 5. Doctor-Patient Assignments
  for (let i = 0; i < 4; i++) {
    await prisma.doctorPatientAssignment.create({
      data: { doctorId: doctors[0].id, patientId: patients[i].id, status: 'ACTIVE' },
    });
  }

  await prisma.doctorPatientAssignment.create({
    data: { doctorId: doctors[1].id, patientId: patients[0].id, status: 'ACTIVE' },
  });
  for (let i = 4; i < 7; i++) {
    await prisma.doctorPatientAssignment.create({
      data: { doctorId: doctors[1].id, patientId: patients[i].id, status: 'ACTIVE' },
    });
  }

  for (let i = 7; i < 10; i++) {
    await prisma.doctorPatientAssignment.create({
      data: { doctorId: doctors[2].id, patientId: patients[i].id, status: 'ACTIVE' },
    });
  }
  console.log('✅ Doctor-Patient assignments configured');

  // 6. 24-Hour Vitals History
  const now = new Date();
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    const device = devices[i];

    for (let j = 48; j >= 0; j--) {
      const time = new Date(now.getTime() - j * 30 * 60 * 1000);
      let baseHr = 75 + Math.sin(j * 0.5) * 8;
      let baseSpo2 = 98 - (j % 5 === 0 ? 1 : 0);
      let baseTemp = 36.6 + Math.cos(j * 0.3) * 0.4;

      if (patient.patientId === 'PAT-1001' && j < 4) {
        baseHr = 124;
        baseSpo2 = 93;
        baseTemp = 38.3;
      }

      await prisma.vitalReading.create({
        data: {
          patientId: patient.id,
          deviceId: device.id,
          heartRate: Math.round(baseHr * 10) / 10,
          spo2: Math.round(baseSpo2 * 10) / 10,
          temperature: Math.round(baseTemp * 10) / 10,
          recordedAt: time,
        },
      });
    }
  }

  // 7. Active Alerts
  await prisma.alert.create({
    data: {
      patientId: patients[0].id,
      deviceId: devices[0].id,
      type: 'HIGH_HEART_RATE',
      severity: 'CRITICAL',
      title: 'Elevated Heart Rate Warning',
      message: 'Patient heart rate spiked to 124 BPM (threshold: >120 BPM)',
      heartRate: 124,
      spo2: 93,
      temperature: 38.3,
      status: 'ACTIVE',
    },
  });

  await prisma.alert.create({
    data: {
      patientId: patients[0].id,
      deviceId: devices[0].id,
      type: 'LOW_SPO2',
      severity: 'WARNING',
      title: 'Borderline SpO2 Reading',
      message: 'Oxygen saturation dipped to 93% (warning threshold: <94%)',
      heartRate: 110,
      spo2: 93,
      temperature: 37.1,
      status: 'ACTIVE',
    },
  });

  await prisma.alert.create({
    data: {
      patientId: patients[4].id,
      deviceId: devices[4].id,
      type: 'DEVICE_OFFLINE',
      severity: 'WARNING',
      title: 'IoT Device Offline',
      message: 'Device SC-ESP32-005 has not sent telemetry in over 15 minutes',
      status: 'ACTIVE',
    },
  });

  // 8. Medicines & Schedules
  const meds = [
    { name: 'Lisinopril', dosage: '10 mg', freq: 'Once daily in morning', instr: 'Take with food' },
    { name: 'Amoxicillin', dosage: '500 mg', freq: 'Twice daily', instr: 'Complete full course' },
    { name: 'Metformin', dosage: '850 mg', freq: 'Twice daily', instr: 'Take with meals' },
  ];

  for (const p of patients) {
    for (const m of meds) {
      const med = await prisma.medicine.create({
        data: {
          patientId: p.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.freq,
          instructions: m.instr,
          startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.medicineSchedule.create({
        data: {
          medicineId: med.id,
          scheduledTime: '08:00',
          daysOfWeek: 'MON,TUE,WED,THU,FRI,SAT,SUN',
          isActive: true,
        },
      });

      const morningTime = new Date(now);
      morningTime.setHours(8, 0, 0, 0);

      await prisma.medicineLog.create({
        data: {
          medicineId: med.id,
          patientId: p.id,
          scheduledAt: morningTime,
          takenAt: morningTime,
          status: 'TAKEN',
          confirmedBy: 'PATIENT_BEDSIDE_BUTTON',
        },
      });

      const eveningTime = new Date(now);
      eveningTime.setHours(20, 0, 0, 0);
      await prisma.medicineLog.create({
        data: {
          medicineId: med.id,
          patientId: p.id,
          scheduledAt: eveningTime,
          status: 'PENDING',
        },
      });
    }
  }

  // 9. Voice Interactions
  await prisma.voiceInteraction.create({
    data: {
      patientId: patients[0].id,
      deviceId: devices[0].id,
      transcript: 'SmartCare, what is my current heart rate and temperature?',
      aiResponse: 'Your current heart rate is 124 BPM and body temperature is 38.3°C. Dr. Smith has been notified of your elevated readings.',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000),
      status: 'COMPLETED',
    },
  });

  // 10. Clinical Notes
  await prisma.clinicalNote.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctors[0].id,
      note: 'Patient Rahul Sharma presented with mild tachycardia and temperature elevation. Adjusted fluid intake guidelines and requested 24-hour continuous ECG monitor review.',
    },
  });

  // 11. Audit Log Entry
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED',
      entityType: 'SYSTEM',
      entityId: 'ROOT',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✅ SmartCare+ Database Seeding Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
