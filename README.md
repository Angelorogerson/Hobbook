# Hobbook – kostenlose Sport-Events in deiner Nähe

**Finde Sport in deiner Nähe. Sieh genau, wo es stattfindet. Mach mit – oder starte selbst ein Event.**

Hobbook ist eine kostenlose, stadtunabhängige Community-Plattform für Sport-Events. Es gibt keine Platzbuchung, keine Zahlungen und keine Preise. Produktumfang: [docs/product/FREE_SPORTS_EVENTS_USER_STORY.md](docs/product/FREE_SPORTS_EVENTS_USER_STORY.md).

## Funktionen

- **Entdecken ohne Anmeldung:** Liste und interaktive Karte zeigen dieselben Ergebnisse. Filter nach Stadt bzw. Kartenausschnitt („Diesen Bereich durchsuchen“), Sportart und Zeitraum. Filter stehen in der URL und sind teilbar.
- **3D-Karte:** MapLibre GL mit OpenFreeMap-Kacheln (OpenStreetMap). 3D-Gebäude lassen sich zuschalten (ab Zoomstufe 14). Ohne WebGL erscheint eine Ersatzansicht mit OpenStreetMap-Links.
- **Event-Details:** Sportart, Zeit (in der Zeitzone des Events), Ort mit Karte, Teilnehmende/Plätze, Niveau, Status (offen, voll, abgesagt, vorbei). Dazu Kalender-Export (.ics), Teilen und Melden.
- **Mitmachen / Austreten:** Anmeldung erst beim Mitmachen. Die Kapazität ist auch bei gleichzeitigen Anmeldungen sicher (atomare Updates).
- **Events erstellen, bearbeiten, absagen, löschen:**
  - Ort per Suche (Geocoding über den eigenen Server) oder per Pin auf der Karte.
  - Vorschau vor dem Veröffentlichen.
  - Änderungen an Zeit oder Ort werden den Teilnehmenden angezeigt.
  - Absagen bleibt sichtbar. Löschen geht nur, solange sich niemand sonst angemeldet hat.
- **Meine Events:** erstellte und beigetretene Events, anstehend und vergangen.
- **Moderation:** Meldungen bearbeiten, Events absagen oder löschen (Rolle `admin`).
- **Datenschutz:**
  - Öffentlich erscheint nur „Vorname N.“.
  - Teilnehmernamen sehen nur Beteiligte.
  - Konto löschen ist möglich.
  - Schriften werden selbst gehostet, es gibt keine Tracking-Cookies.

Sportarten sind zentral konfiguriert: `backend/config/sports.json`, gespiegelt in `frontend/src/constants/sports.json`. Ein Test prüft, dass beide gleich sind.

## Technik

| Bereich | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, React Router 6, MapLibre GL 4, lucide-react |
| Backend | Node.js (ESM), Express 4, Mongoose 8, zod, express-rate-limit, JWT, bcrypt |
| Datenbank | MongoDB (2dsphere-Index für Geo-Abfragen) |
| Tests | Vitest + Supertest + mongodb-memory-server (API), Vitest + Testing Library (UI), Playwright (E2E) |

## Schnellstart

Voraussetzungen: Node.js 20+ und eine MongoDB (lokal oder Atlas).

```bash
cd backend
cp .env.example .env      # MONGODB_URI und einen langen JWT_SECRET eintragen
npm install
npm run dev               # API auf http://localhost:5000
```

```bash
cd frontend
npm install
npm run dev               # App auf http://localhost:5173
```

### Demo ohne eigene Datenbank

Startet die API mit einer In-Memory-MongoDB und Beispieldaten (Testkonten siehe `backend/scripts/seed.js`):

```bash
cd backend
node scripts/e2e-server.js --port 5000
```

## Tests

```bash
cd backend && npm test            # 45 API-/Integrationstests inkl. 50 gleichzeitiger Beitritte
cd frontend && npm test           # UI-Tests (Liste↔Karte, Formulare, Join-Zustände)
cd frontend && npm run lint && npm run build
cd frontend && npm run e2e        # Playwright: Entdecken → Detail → Mitmachen, Erstellen → Bearbeiten → Absagen, Mobil
```

Falls das mitgelieferte Chromium auf einem Rechner nicht startet, kann ein installierter Browser genutzt werden: `PW_CHANNEL=msedge npm run e2e`.

## API (Auszug)

| Methode | Pfad | Zugriff |
|---|---|---|
| GET | `/api/events?city=&sport=&from=&to=&bbox=&near=&radiusKm=&page=&limit=` | öffentlich (eine Abfrage für Liste und Karte) |
| GET | `/api/events/:id` | öffentlich |
| GET | `/api/events/me` | angemeldet |
| POST | `/api/events` | angemeldet |
| PATCH | `/api/events/:id` | Organisator/Admin |
| POST | `/api/events/:id/cancel` | Organisator/Admin |
| DELETE | `/api/events/:id` | Organisator (ohne weitere Teilnehmende) / Admin |
| POST | `/api/events/:id/join`, `/api/events/:id/leave` | angemeldet |
| POST | `/api/reports` | angemeldet |
| GET, PATCH | `/api/reports`, `/api/reports/:id` | Admin |
| GET | `/api/geocode/search?q=`, `/api/geocode/reverse?lat=&lng=` | öffentlich, rate-limitiert, gecacht |
| POST/GET/PUT/DELETE | `/api/auth/*`, `/api/users/me*` | Konto |

## Bestehende Daten migrieren

Alte Connect-Events (Datum + Uhrzeit-Strings, Freitext-Ort) werden mit `npm run migrate:events` (Probelauf) bzw. `npm run migrate:events -- --apply` umgestellt. Koordinaten werden nie erfunden. Details stehen in [docs/LEGACY_CLEANUP.md](docs/LEGACY_CLEANUP.md).

## Vor dem öffentlichen Start

- **Zugangsdaten rotieren:** Frühere Versionen dieser README enthielten einen Datenbank-Connection-String und ein JWT-Secret. Beides muss geändert werden, und es lohnt sich zu prüfen, ob die Git-Historie bereinigt werden soll.
- Impressum und verantwortliche Stelle in der Datenschutzerklärung ergänzen (`frontend/src/pages/legal/LegalPages.tsx`) und rechtlich prüfen lassen.
- Die Nominatim-Nutzungsrichtlinie erlaubt nur geringe Last. Bei Wachstum `GEOCODER_URL` auf einen eigenen oder kommerziellen Dienst umstellen.
- Hosting, HTTPS, Backups und Monitoring einrichten (noch nicht vorhanden).

Weitere Hintergründe: [docs/CHANGES.md](docs/CHANGES.md), [docs/discovery/](docs/discovery/).
