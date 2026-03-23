import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

const ONE_HOUR_MS = 60 * 60 * 1000;

export function updateLastActive(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user?.id || user?._type !== 'user') return next();

  const lastActive: Date | null = user.lastActiveAt ?? null;
  const now = new Date();

  if (!lastActive || now.getTime() - lastActive.getTime() > ONE_HOUR_MS) {
    // Fire-and-forget: don't block the request
    prisma.user
      .update({ where: { id: user.id }, data: { lastActiveAt: now } })
      .catch(() => {});
  }

  next();
}
