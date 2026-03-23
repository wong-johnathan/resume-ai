import { Router } from 'express';
import passport from '../../config/passport';
import { env } from '../../config/env';
import { requireAdmin, getAdmin } from '../../middleware/requireAdmin';

const router = Router();

router.get('/google', passport.authenticate('google-admin', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google-admin', { failureRedirect: `${env.ADMIN_URL ?? 'http://localhost:5174'}/login?error=auth` }),
  (req, res) => {
    res.redirect(`${env.ADMIN_URL ?? 'http://localhost:5174'}/dashboard`);
  }
);

router.get('/me', requireAdmin, (req, res) => {
  const admin = getAdmin(req);
  res.json({ id: admin.id, email: admin.email, displayName: admin.displayName });
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ success: true }));
  });
});

export default router;
