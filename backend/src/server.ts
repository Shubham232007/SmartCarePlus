import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env';
import { prisma } from './config/prisma';
import { initSocketIO, broadcastDeviceStatus } from './sockets/socketManager';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import doctorRoutes from './routes/doctorRoutes';
import iotRoutes from './routes/iotRoutes';
import alertRoutes from './routes/alertRoutes';
import medicineRoutes from './routes/medicineRoutes';
import voiceRoutes from './routes/voiceRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import clinicalNoteRoutes from './routes/clinicalNoteRoutes';
import deviceRoutes from './routes/deviceRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const server = http.createServer(app);

// Security & Middleware
app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP.', errorCode: 'RATE_LIMIT_EXCEEDED' },
});
app.use('/api/', limiter);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api', clinicalNoteRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/admin', adminRoutes);

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'SmartCare+ Backend Core API',
    timestamp: new Date(),
  });
});

// 404 Route
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API Route not found.', errorCode: 'NOT_FOUND' });
});

// Error Handler
app.use(errorHandler);

// Initialize Socket.IO
initSocketIO(server);

// Device Offline Monitor Background Service (runs every 60s)
setInterval(async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const staleDevices = await prisma.device.findMany({
      where: {
        status: 'ONLINE',
        lastSeen: { lte: fiveMinutesAgo },
      },
    });

    for (const dev of staleDevices) {
      await prisma.device.update({
        where: { id: dev.id },
        data: { status: 'OFFLINE' },
      });
      broadcastDeviceStatus({ deviceId: dev.deviceId, status: 'OFFLINE', lastSeen: dev.lastSeen || new Date() });
      console.log(`🔌 Device ${dev.deviceId} flagged as OFFLINE due to inactivity.`);
    }
  } catch (err) {
    console.error('Error in device offline monitor loop:', err);
  }
}, 60 * 1000);

const PORT = Number(ENV.PORT) || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🏥 SMARTCARE+ Backend Server Running on Port ${PORT}`);
    console.log(`📡 Real-Time Socket.IO Active`);
    console.log(`==================================================`);
  });
}

export { app, server };
