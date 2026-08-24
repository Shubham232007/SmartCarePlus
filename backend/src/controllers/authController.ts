import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { logAudit } from '../middleware/auditLogger';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.', errorCode: 'MISSING_CREDENTIALS' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { patient: true, doctor: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid email or password.', errorCode: 'INVALID_CREDENTIALS' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password.', errorCode: 'INVALID_CREDENTIALS' });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        patientId: user.patient?.id,
        doctorId: user.doctor?.id,
      },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.id, 'LOGIN', 'USER', user.id, req.ip);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        patientId: user.patient?.id,
        humanPatientId: user.patient?.patientId,
        doctorId: user.doctor?.id,
        humanDoctorId: user.doctor?.doctorId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      res.status(400).json({ success: false, message: 'Missing required user fields.', errorCode: 'MISSING_FIELDS' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User with this email already exists.', errorCode: 'EMAIL_EXISTS' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        firstName,
        lastName,
        phone,
      },
    });

    await logAudit(newUser.id, 'REGISTER', 'USER', newUser.id, req.ip);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHORIZED' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        patient: {
          include: {
            devices: true,
          },
        },
        doctor: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found', errorCode: 'USER_NOT_FOUND' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        patient: user.patient,
        doctor: user.doctor,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      await logAudit(req.user.userId, 'LOGOUT', 'USER', req.user.userId, req.ip);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};
