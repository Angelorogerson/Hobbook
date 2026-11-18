import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import connectEventRoutes from './routes/connectEventRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import { notificationRoutes, linkRoutes, jobRoutes, pushRoutes, adminRoutes } from './routes/loopRoutes.js';
import { SPORTS } from './config/sports.js';

// Legacy venue/booking/favorite routes are intentionally not mounted: the product
// is a free community-events platform (see docs/LEGACY_CLEANUP.md).

export function createApp() {
  const app = express();

  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);

  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin/non-browser requests have no Origin header.
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
    })
  );
  if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (req, res) => {
    const db = mongoose.connection.readyState === 1 ? 'up' : 'down';
    res.status(db === 'up' ? 200 : 503).json({ status: db === 'up' ? 'OK' : 'DEGRADED', db, timestamp: new Date().toISOString() });
  });

  app.get('/api/sports', (req, res) => res.json({ sports: SPORTS }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/events', connectEventRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/geocode', geocodeRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/links', linkRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((req, res) => res.status(404).json({ message: 'Route nicht gefunden' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Ungültiges JSON' });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ message: 'Anfrage zu groß' });
    }
    if (err instanceof mongoose.Error.ValidationError) {
      const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
      return res.status(400).json({ message: Object.values(errors)[0] || 'Ungültige Eingabe', errors });
    }
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Ungültiger Wert' });
    }
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Eintrag existiert bereits' });
    }

    const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error(err);
    const expose = process.env.NODE_ENV === 'development' || status < 500;
    return res.status(status).json({
      message: expose ? err.message || 'Fehler' : 'Interner Serverfehler',
      ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack }),
    });
  });

  return app;
}

export default createApp;
