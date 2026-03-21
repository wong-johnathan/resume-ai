import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from './prisma';
import { env } from './env';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

async function upsertUser(provider: string, providerId: string, email: string, displayName: string | undefined, avatarUrl: string | undefined) {
  return prisma.user.upsert({
    where: { provider_providerId: { provider, providerId } },
    update: { displayName, avatarUrl, email },
    create: { provider, providerId, email, displayName, avatarUrl },
  });
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
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
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_CALLBACK_URL) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: Function) => {
        try {
          const email = profile.emails?.[0]?.value ?? `${profile.id}@github.com`;
          const user = await upsertUser('github', profile.id, email, profile.displayName ?? profile.username, profile.photos?.[0]?.value);
          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
}

export default passport;
