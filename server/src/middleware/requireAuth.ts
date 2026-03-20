import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Returns req.user cast to the Prisma User shape (after Prisma generation)
export function getUser(req: Request): { id: string; email: string; displayName: string | null; avatarUrl: string | null; provider: string; providerId: string; createdAt: Date; updatedAt: Date } {
  return req.user as any;
}
