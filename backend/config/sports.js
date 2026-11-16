import { readFileSync } from 'node:fs';

// Canonical sport list. The frontend keeps an identical copy in
// frontend/src/constants/sports.json; a backend test asserts both stay in sync.
export const SPORTS = JSON.parse(readFileSync(new URL('./sports.json', import.meta.url), 'utf8'));

export const SPORT_KEYS = SPORTS.map((s) => s.key);
