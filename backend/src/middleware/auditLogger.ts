import { prisma } from '../config/prisma';

export const logAudit = async (
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId || null,
        ipAddress: ipAddress || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('Failed to create audit log entry:', err);
  }
};
