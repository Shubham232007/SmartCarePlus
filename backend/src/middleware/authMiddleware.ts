import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';

export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  patientId?: string;
  doctorId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateJwt = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.', errorCode: 'UNAUTHORIZED' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { patient: true, doctor: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User account is inactive or no longer exists.', errorCode: 'ACCOUNT_INACTIVE' });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      patientId: user.patient?.id,
      doctorId: user.doctor?.id,
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.', errorCode: 'INVALID_TOKEN' });
  }
};

export const authorizeRoles = (...roles: (Role | string)[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated user.', errorCode: 'UNAUTHORIZED' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to perform this action.`,
        errorCode: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};

export const authorizeDoctorPatientAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated user.', errorCode: 'UNAUTHORIZED' });
      return;
    }

    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const targetPatientId = req.params.id || req.params.patientId || req.query.patientId;

    if (!targetPatientId) {
      res.status(400).json({ success: false, message: 'Patient identifier required.', errorCode: 'MISSING_PATIENT_ID' });
      return;
    }

    if (req.user.role === 'PATIENT') {
      if (req.user.patientId !== targetPatientId) {
        const patient = await prisma.patient.findUnique({ where: { id: req.user.patientId } });
        if (!patient || (patient.id !== targetPatientId && patient.patientId !== targetPatientId)) {
          res.status(403).json({ success: false, message: 'Access denied. Patients may only view their own health records.', errorCode: 'PATIENT_ACCESS_DENIED' });
          return;
        }
      }
      next();
      return;
    }

    if (req.user.role === 'DOCTOR') {
      if (!req.user.doctorId) {
        res.status(403).json({ success: false, message: 'Doctor profile not found.', errorCode: 'DOCTOR_PROFILE_MISSING' });
        return;
      }

      let resolvedPatientDbId = targetPatientId as string;
      if (targetPatientId.startsWith('PAT-')) {
        const p = await prisma.patient.findUnique({ where: { patientId: targetPatientId } });
        if (!p) {
          res.status(404).json({ success: false, message: 'Patient not found.', errorCode: 'PATIENT_NOT_FOUND' });
          return;
        }
        resolvedPatientDbId = p.id;
      }

      const assignment = await prisma.doctorPatientAssignment.findFirst({
        where: {
          doctorId: req.user.doctorId,
          patientId: resolvedPatientDbId,
          status: 'ACTIVE',
        },
      });

      if (!assignment) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this patient.',
          errorCode: 'DOCTOR_PATIENT_NOT_ASSIGNED',
        });
        return;
      }

      next();
      return;
    }

    res.status(403).json({ success: false, message: 'Access denied.', errorCode: 'FORBIDDEN' });
  } catch (error) {
    next(error);
  }
};
