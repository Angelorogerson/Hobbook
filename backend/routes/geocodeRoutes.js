import express from 'express';
import { z } from 'zod';
import { search, reverse, GeocoderUnavailableError } from '../services/geocoder.js';
import { validate } from '../middleware/validate.js';
import { geocodeLimiter } from '../middleware/rateLimits.js';

const router = express.Router();

const searchQuery = z.object({
  q: z.string().trim().min(3, 'Bitte mindestens 3 Zeichen eingeben').max(200),
});

const reverseQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const unavailable = (res) =>
  res.status(503).json({
    message: 'Die Ortssuche ist gerade nicht verfügbar. Setze den Pin auf der Karte und gib die Adresse selbst ein.',
  });

router.get('/search', geocodeLimiter, validate(searchQuery, 'query'), async (req, res) => {
  try {
    res.json({ results: await search(req.validated.query.q) });
  } catch (err) {
    if (err instanceof GeocoderUnavailableError) return unavailable(res);
    throw err;
  }
});

router.get('/reverse', geocodeLimiter, validate(reverseQuery, 'query'), async (req, res) => {
  try {
    const { lat, lng } = req.validated.query;
    res.json({ result: await reverse(lat, lng) });
  } catch (err) {
    if (err instanceof GeocoderUnavailableError) return unavailable(res);
    throw err;
  }
});

export default router;
