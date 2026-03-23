import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (req.isAuthenticated() && user?._type === 'admin') return next();
  res.status(401).json({ error: 'Unauthorized' });
}

export function getAdmin(req: Request): { id: string; email: string; displayName: string | null } {
  return req.user as any;
}
