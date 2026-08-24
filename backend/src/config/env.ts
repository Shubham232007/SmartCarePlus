import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'smartcare_jwt_super_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  AI_SERVER_URL: process.env.AI_SERVER_URL || 'http://localhost:5001',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DEVICE_MASTER_KEY: process.env.DEVICE_MASTER_KEY || 'device_secret_smartcare_2026',
  MIN_HEART_RATE: Number(process.env.MIN_HEART_RATE || 50),
  MAX_HEART_RATE: Number(process.env.MAX_HEART_RATE || 120),
  MIN_SPO2_WARNING: Number(process.env.MIN_SPO2_WARNING || 94),
  MIN_SPO2_CRITICAL: Number(process.env.MIN_SPO2_CRITICAL || 90),
  MIN_TEMP: Number(process.env.MIN_TEMP || 36.0),
  MAX_TEMP: Number(process.env.MAX_TEMP || 38.0),
};
