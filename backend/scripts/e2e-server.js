/**
 * Starts the API against an in-memory MongoDB with seeded test data.
 * Used by Playwright (frontend/playwright.config.ts) and for local demos:
 *   node scripts/e2e-server.js [--port 5000]   (default: E2E_API_PORT or 5055)
 * All credentials below are throwaway test values for this in-memory database only.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-only-secret-not-for-production-0123456789abcdef';
process.env.JWT_EXPIRES_IN = '1d';
// Lets Playwright trigger the weekly-game jobs (POST /api/jobs/run). Test-only value.
process.env.JOB_SECRET = process.env.JOB_SECRET || 'e2e-job-secret';
process.env.CLIENT_URL =
  process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5180,http://localhost:5193';

const { createApp } = await import('../app.js');
const { seed } = await import('./seed.js');

// A generous launch timeout: on a busy machine mongod can need more than the default 10 s.
const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
await mongoose.connect(mongo.getUri());
await seed();

const portArg = process.argv.indexOf('--port');
const port = Number(portArg > -1 ? process.argv[portArg + 1] : process.env.E2E_API_PORT || 5055);
// Test-only: Playwright reads the in-memory outbox to open one-tap email links.
// This route exists only in this script, never in the deployed API.
const { default: express } = await import('express');
const { outbox } = await import('../services/mailer.js');
const outer = express();
outer.get('/__e2e/outbox', (req, res) => res.json({ messages: outbox.map(({ to, subject, text }) => ({ to, subject, text })) }));
outer.use(createApp());
const server = outer.listen(port, () => console.log(`E2E API listening on ${port}`));

const shutdown = async () => {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
