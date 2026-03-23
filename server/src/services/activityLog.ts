import { ActivityAction } from '@prisma/client';
import { prisma } from '../config/prisma';

export { ActivityAction };

export async function logActivity(
  userId: string,
  action: ActivityAction,
  metadata?: object
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, metadata: metadata ?? {} },
    });
  } catch {
    // Fire-and-forget: logging failures never break user-facing requests
  }
}
