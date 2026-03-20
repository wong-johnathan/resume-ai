import { existsSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: existsSync('.dev.env') ? '.dev.env' : '.env' });
import { execSync } from 'child_process';
import { createApp } from './app';
import { env } from './config/env';

// Sync schema to database on startup (creates tables if they don't exist)
try {
  console.log('Syncing database schema…');
  execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
  console.log('Database schema up to date.');
} catch (err) {
  console.error('Failed to sync database schema:', err);
  process.exit(1);
}

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
