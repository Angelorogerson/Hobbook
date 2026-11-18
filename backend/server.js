import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import { createApp } from './app.js';

function assertConfig() {
  const secret = process.env.JWT_SECRET || '';
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret) {
    console.error('JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
  }
  const weak = secret.length < 32 || /change[_-]?this|your[_-]?secret|example/i.test(secret);
  if (weak && isProd) {
    console.error('JWT_SECRET is too weak for production (min. 32 random characters). Refusing to start.');
    process.exit(1);
  }
  if (weak) console.warn('Warning: JWT_SECRET looks weak. Use a long random value outside local development.');
  if (!process.env.JWT_EXPIRES_IN) process.env.JWT_EXPIRES_IN = '7d';
}

async function start() {
  assertConfig();
  await connectDB();
  const app = createApp();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
  startJobTimer();
}

/**
 * While the server is awake it runs the weekly-game jobs itself every few
 * minutes. An external cron (POST /api/jobs/run) covers the time a free host
 * sleeps. Every step is idempotent, so both triggers can overlap safely.
 * Disable with JOBS_INTERVAL_MIN=0.
 */
function startJobTimer() {
  const minutes = Number(process.env.JOBS_INTERVAL_MIN ?? 5);
  if (!minutes) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { runJobs } = await import('./services/stammspiel.js');
      await runJobs(new Date());
    } catch (err) {
      console.error('[jobs] failed:', err.message);
    } finally {
      running = false;
    }
  };
  setInterval(tick, minutes * 60 * 1000).unref();
  setTimeout(tick, 15 * 1000).unref();
}

start();
