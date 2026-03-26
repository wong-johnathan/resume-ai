import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { updateLastActive } from './middleware/updateLastActive';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import resumesRouter from './routes/resumes';
import jobsRouter from './routes/jobs';
import jobStatusesRouter from './routes/jobStatuses';
import aiRouter from './routes/ai';
import templatesRouter from './routes/templates';
import interviewPrepRouter from './routes/interviewPrep';
import toursRouter from './routes/tours';
import adminRouter from './routes/admin/index';
import billingRouter from './routes/billing';

const PgSession = connectPgSimple(session);

const sessionPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const userSession = session({
  name: 'connect.sid',
  store: new PgSession({ pool: sessionPool, createTableIfMissing: true }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

const adminSession = session({
  name: 'admin.sid',
  store: new PgSession({ pool: sessionPool, createTableIfMissing: true }),
  secret: env.ADMIN_SESSION_SECRET ?? env.SESSION_SECRET, // env.ADMIN_SESSION_SECRET should always be set in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

export function createApp() {
  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));

  // Multi-origin CORS: allow both the main client and admin panel
  const allowedOrigins = [env.CLIENT_URL];
  if (env.ADMIN_URL) allowedOrigins.push(env.ADMIN_URL);
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  app.use(morgan('dev'));
  // Conditional body parser: webhook needs raw Buffer; all other routes get JSON.
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/billing/webhook') {
      express.raw({ type: 'application/json' })(req, res, next);
    } else {
      express.json({ limit: '2mb' })(req, res, next);
    }
  });

  // Path-conditional session: admin routes use admin.sid, all others use connect.sid
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/admin')) {
      adminSession(req, res, next);
    } else {
      userSession(req, res, next);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Update lastActiveAt for authenticated user requests (throttled to once/hr)
  app.use(updateLastActive);

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/resumes', resumesRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/job-statuses', jobStatusesRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/interview-prep', interviewPrepRouter);
  app.use('/api/tours', toursRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/billing', billingRouter);

  app.use(errorHandler);

  return app;
}
