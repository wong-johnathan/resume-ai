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
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import resumesRouter from './routes/resumes';
import jobsRouter from './routes/jobs';
import jobStatusesRouter from './routes/jobStatuses';
import aiRouter from './routes/ai';
import templatesRouter from './routes/templates';

const PgSession = connectPgSimple(session);

const sessionPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '2mb' }));

  app.use(
    session({
      store: new PgSession({ pool: sessionPool, createTableIfMissing: true }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/resumes', resumesRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/job-statuses', jobStatusesRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/templates', templatesRouter);

  app.use(errorHandler);

  return app;
}
