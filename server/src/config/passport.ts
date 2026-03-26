import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from './prisma';
import { env } from './env';
import { logActivity, ActivityAction } from '../services/activityLog';

type SerializedUser = { type: 'user' | 'admin'; id: string };

passport.serializeUser((user: any, done) => {
  done(null, { type: user._type ?? 'user', id: user.id } as SerializedUser);
});

passport.deserializeUser(async (serialized: string | SerializedUser, done) => {
  try {
    // Handle legacy sessions that stored just the id string
    if (typeof serialized === 'string') {
      const user = await prisma.user.findUnique({ where: { id: serialized } });
      done(null, user ? { ...user, _type: 'user' as const } : false);
      return;
    }

    if (serialized.type === 'admin') {
      const admin = await prisma.adminUser.findUnique({ where: { id: serialized.id } });
      done(null, admin ? { ...admin, _type: 'admin' as const } : false);
    } else {
      const user = await prisma.user.findUnique({ where: { id: serialized.id } });
      done(null, user ? { ...user, _type: 'user' as const } : false);
    }
  } catch (err) {
    done(err);
  }
});

async function upsertUser(
  provider: string,
  providerId: string,
  email: string,
  displayName: string | undefined,
  avatarUrl: string | undefined
) {
  return prisma.user.upsert({
    where: { provider_providerId: { provider, providerId } },
    update: { displayName, avatarUrl, email },
    create: { provider, providerId, email, displayName, avatarUrl },
  });
}

// ─── User: Google ─────────────────────────────────────────────────────────────

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@google.com`;
          const user = await upsertUser('google', profile.id, email, profile.displayName, profile.photos?.[0]?.value);
          logActivity(user.id, ActivityAction.LOGIN).catch(() => {});
          done(null, { ...user, _type: 'user' as const });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

// ─── User: GitHub ─────────────────────────────────────────────────────────────

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_CALLBACK_URL) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      async (_accessToken: string, _refreshToken: string, profile: any, done: Function) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@github.com`;
          const user = await upsertUser('github', profile.id, email, profile.displayName ?? profile.username, profile.photos?.[0]?.value);
          logActivity(user.id, ActivityAction.LOGIN).catch(() => {});
          done(null, { ...user, _type: 'user' as const });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

// ─── Admin: Google ────────────────────────────────────────────────────────────

if (env.ADMIN_GOOGLE_CLIENT_ID && env.ADMIN_GOOGLE_CLIENT_SECRET && env.ADMIN_GOOGLE_CALLBACK_URL) {
  passport.use(
    'google-admin',
    new GoogleStrategy(
      {
        clientID: env.ADMIN_GOOGLE_CLIENT_ID,
        clientSecret: env.ADMIN_GOOGLE_CLIENT_SECRET,
        callbackURL: env.ADMIN_GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@google.com`;

          // Validate email against allowlist before creating/upsert
          const allowedEmails = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
          if (!allowedEmails.includes(email)) {
            return done(null, false);
          }

          const admin = await prisma.adminUser.upsert({
            where: { provider_providerId: { provider: 'google', providerId: profile.id } },
            update: { displayName: profile.displayName, avatarUrl: profile.photos?.[0]?.value, email },
            create: {
              provider: 'google',
              providerId: profile.id,
              email,
              displayName: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
            },
          });

          // Note: admin logins are NOT logged in ActivityLog — ActivityLog tracks user activity only.
          // Admin users are in the AdminUser table, not User table, so logging their ID would
          // produce orphaned entries that show as "[deleted]" in the logs page.
          done(null, { ...admin, _type: 'admin' as const });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

export default passport;
