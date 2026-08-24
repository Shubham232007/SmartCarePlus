import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { JwtPayload } from '../middleware/authMiddleware';

let io: Server | null = null;

export const initSocketIO = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: ENV.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow unauthenticated connection with limited public/device scope if necessary or reject
        return next();
      }

      const decoded = jwt.verify(token as string, ENV.JWT_SECRET) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      // Allow connection but unauthenticated
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload | undefined;
    console.log(`⚡ Socket client connected [ID: ${socket.id}] Role: ${user?.role || 'Guest'}`);

    if (user) {
      if (user.role === 'PATIENT' && user.patientId) {
        socket.join(`patient:${user.patientId}`);
        console.log(`   -> Socket ${socket.id} joined room patient:${user.patientId}`);
      }

      if (user.role === 'DOCTOR' && user.doctorId) {
        socket.join(`doctor:${user.doctorId}`);
        console.log(`   -> Socket ${socket.id} joined room doctor:${user.doctorId}`);
      }

      if (user.role === 'ADMIN') {
        socket.join('admin:all');
        console.log(`   -> Socket ${socket.id} joined room admin:all`);
      }
    }

    socket.on('join:patient', (patientId: string) => {
      // Doctor/Admin joining patient room for monitoring
      socket.join(`patient:${patientId}`);
      console.log(`   -> Socket ${socket.id} explicitly joined room patient:${patientId}`);
    });

    socket.on('leave:patient', (patientId: string) => {
      socket.leave(`patient:${patientId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket client disconnected [ID: ${socket.id}]`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};

// Event Broadcasters
export const broadcastVitalUpdate = (data: {
  patientId: string;
  deviceId: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  recordedAt: Date;
}) => {
  if (!io) return;
  io.to(`patient:${data.patientId}`).emit('vital:update', data);
  io.to('admin:all').emit('vital:update', data);
};

export const broadcastNewAlert = (alertData: any) => {
  if (!io) return;
  io.to(`patient:${alertData.patientId}`).emit('alert:new', alertData);
  io.to('admin:all').emit('alert:new', alertData);
  io.emit('alert:new', alertData); // Broadcast all alerts to active doctor dashboards
};

export const broadcastAlertUpdated = (alertData: any) => {
  if (!io) return;
  io.to(`patient:${alertData.patientId}`).emit('alert:updated', alertData);
  io.to('admin:all').emit('alert:updated', alertData);
  io.emit('alert:updated', alertData);
};

export const broadcastDeviceStatus = (deviceData: { deviceId: string; status: string; lastSeen: Date }) => {
  if (!io) return;
  io.emit('device:status', deviceData);
};

export const broadcastEmergencyEvent = (emergencyData: any) => {
  if (!io) return;
  io.to(`patient:${emergencyData.patientId}`).emit('emergency:new', emergencyData);
  io.to('admin:all').emit('emergency:new', emergencyData);
  io.emit('emergency:new', emergencyData);
};

export const broadcastVoiceInteraction = (voiceData: any) => {
  if (!io) return;
  io.to(`patient:${voiceData.patientId}`).emit('voice:new', voiceData);
};
