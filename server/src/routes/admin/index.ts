import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import authRouter from './auth';
import statsRouter from './stats';
import usersRouter from './users';
import resumesRouter from './resumes';
import logsRouter from './logs';

const router = Router();

// Auth routes: no requireAdmin (these handle login/logout themselves)
router.use('/auth', authRouter);

// All other admin routes require authentication
router.use('/stats', requireAdmin, statsRouter);
router.use('/users', requireAdmin, usersRouter);
router.use('/resumes', requireAdmin, resumesRouter);
router.use('/logs', requireAdmin, logsRouter);

export default router;
