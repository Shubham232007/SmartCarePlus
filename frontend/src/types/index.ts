export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type AlertType =
  | 'HIGH_HEART_RATE'
  | 'LOW_HEART_RATE'
  | 'LOW_SPO2'
  | 'HIGH_TEMPERATURE'
  | 'LOW_TEMPERATURE'
  | 'SOS'
  | 'MEDICINE_MISSED'
  | 'DEVICE_OFFLINE'
  | 'AI_REQUEST'
  | 'NURSE_CALL';

export type MedicineLogStatus = 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';
export type EmergencyTriggerType = 'SOS_BUTTON' | 'ABNORMAL_VITAL' | 'VOICE_REQUEST' | 'NURSE_CALL';
export type EmergencyStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  patientId?: string;
  humanPatientId?: string;
  doctorId?: string;
  humanDoctorId?: string;
}

export interface Patient {
  id: string;
  userId: string;
  patientId: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  phone?: string;
  address?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalConditions?: string;
  allergies?: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  devices?: Device[];
}

export interface Doctor {
  id: string;
  userId: string;
  doctorId: string;
  specialization: string;
  licenseNumber: string;
  department: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Device {
  id: string;
  deviceId: string;
  deviceName: string;
  patientId?: string;
  deviceType: string;
  firmwareVersion: string;
  macAddress?: string;
  deviceKey: string;
  status: DeviceStatus;
  lastSeen?: string;
  patient?: {
    patientId: string;
    user: { firstName: string; lastName: string };
  };
}

export interface VitalReading {
  id?: string;
  patientId: string;
  deviceId: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  recordedAt: string;
  device?: {
    deviceId: string;
    status: DeviceStatus;
  };
}

export interface Alert {
  id: string;
  patientId: string;
  deviceId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  heartRate?: number;
  spo2?: number;
  temperature?: number;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  status: AlertStatus;
  patient?: {
    patientId: string;
    user: { firstName: string; lastName: string };
  };
  device?: { deviceId: string };
}

export interface Medicine {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate: string;
  endDate?: string;
  schedules?: MedicineSchedule[];
  logs?: MedicineLog[];
}

export interface MedicineSchedule {
  id: string;
  medicineId: string;
  scheduledTime: string;
  daysOfWeek: string;
  isActive: boolean;
}

export interface MedicineLog {
  id: string;
  medicineId: string;
  patientId: string;
  scheduledAt: string;
  takenAt?: string;
  status: MedicineLogStatus;
  confirmedBy?: string;
  medicine?: Medicine;
}

export interface VoiceInteraction {
  id: string;
  patientId: string;
  deviceId?: string;
  transcript: string;
  aiResponse: string;
  timestamp: string;
  status: string;
}

export interface EmergencyEvent {
  id: string;
  patientId: string;
  deviceId?: string;
  triggerType: EmergencyTriggerType;
  description: string;
  createdAt: string;
  respondedAt?: string;
  respondedBy?: string;
  status: EmergencyStatus;
  patient?: {
    patientId: string;
    user: { firstName: string; lastName: string };
  };
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  doctor?: {
    user: { firstName: string; lastName: string };
  };
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  timestamp: string;
  user?: {
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
  };
}

export interface ThresholdConfig {
  id: string;
  minHeartRate: number;
  maxHeartRate: number;
  minSpo2Warning: number;
  minSpo2Critical: number;
  minTemp: number;
  maxTemp: number;
  updatedAt: string;
}
