import { Router } from 'express';
import passport from '../config/passport';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { requireAuth, getUser } from '../middleware/requireAuth';

const router = Router();

// ─── Session info ────────────────────────────────────────────────────────────

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const userId = getUser(req).id;
    await prisma.user.delete({ where: { id: userId } });
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => res.json({ success: true }));
    });
  } catch (err) { next(err); }
});

// ─── Google ──────────────────────────────────────────────────────────────────

if (env.GOOGLE_CLIENT_ID) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: `${env.CLIENT_URL}/?error=auth` }),
    (_req, res) => res.redirect(`${env.CLIENT_URL}/dashboard`)
  );
}

// ─── GitHub ──────────────────────────────────────────────────────────────────

if (env.GITHUB_CLIENT_ID) {
  router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
  router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: `${env.CLIENT_URL}/?error=auth` }),
    (_req, res) => res.redirect(`${env.CLIENT_URL}/dashboard`)
  );
}

// ─── Dev Login (development only) ────────────────────────────────────────────

if (env.NODE_ENV === 'development') {
  router.post('/dev-login', async (req, res, next) => {
    try {
      const user = await prisma.user.upsert({
        where: { provider_providerId: { provider: 'dev', providerId: 'dummy' } },
        update: {},
        create: {
          provider: 'dev',
          providerId: 'dummy',
          email: 'dev@localhost',
          displayName: 'Dev User',
        },
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (err) {
      next(err);
    }
  });
}

export default router;
