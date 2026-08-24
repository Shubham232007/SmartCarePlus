import request from 'supertest';
import { app } from '../server';
import { prisma } from '../config/prisma';

describe('SMARTCARE+ Backend System Integration Tests', () => {
  beforeAll(async () => {
    // Generate DB schema and tables if needed
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. GET /api/health should return ONLINE status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ONLINE');
  });

  it('2. Login with invalid credentials should return 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'invalid@smartcare.local',
      password: 'WrongPassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3. IoT Reading POST without X-Device-Key header should fail with 401', async () => {
    const res = await request(app).post('/api/iot/readings').send({
      deviceId: 'SC-ESP32-001',
      patientId: 'PAT-1001',
      heartRate: 78,
      spo2: 98,
      temperature: 36.7,
    });
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('MISSING_DEVICE_KEY');
  });

  it('4. Protected route /api/patients/me without JWT token should return 401', async () => {
    const res = await request(app).get('/api/patients/me');
    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe('UNAUTHORIZED');
  });
});
