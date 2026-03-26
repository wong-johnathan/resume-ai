import { User as PrismaUser, AdminUser as PrismaAdminUser } from '@prisma/client';

type AuthenticatedUser = (PrismaUser & { _type: 'user' }) | (PrismaAdminUser & { _type: 'admin' });

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthenticatedUser {}
  }
}

export {};
