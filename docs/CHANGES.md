# Changes: Free Community Sports Events (2026-11-16)

Implements [product/FREE_SPORTS_EVENTS_USER_STORY.md](product/FREE_SPORTS_EVENTS_USER_STORY.md) on branch `feature/free-sports-events`.

## What changed

### Backend
- **App structure:** `app.js` builds the Express app (testable). `server.js` validates config, waits for MongoDB, then listens. It refuses to start without `JWT_SECRET`, and in production with a weak one.
- **Security:** CORS allowlist from `CLIENT_URL`; rate limits on auth, writes, reports and geocoding; one error handler that hides internals outside development; 100 kB JSON limit; malformed IDs → 404.
- **Event contract** (`models/ConnectEvent.js`, `validation/eventSchemas.js`):
  - `startAt`/`endAt` (UTC) + `timezone`.
  - `location { placeName, address, city, cityKey, countryCode, point }` with a 2dsphere index.
  - `visibility` (public/unlisted), `level`, `status` (open/full/cancelled/completed; "completed" is derived from `endAt`), `changedAt`, `cancelledReason`.
  - The sport list is central (`config/sports.json`).
  - zod validation whitelists fields, so mass-assignment is no longer possible, and strips HTML.
- **Canonical query:** `GET /api/events` with city, sport, date range, bbox/near and pagination. List and map use the same call.
- **Join/leave:** single atomic `findOneAndUpdate` pipelines (capacity, duplicates and status in one operation), idempotent.
- **Ownership:** organizer/admin for `PATCH`, `cancel` and `DELETE`. Hard delete only without other participants; otherwise cancel.
- **Privacy:** public payloads expose "Vorname N." only; participant names only for organizer, participants and admins.
- **Reports:** `models/Report.js`; users report once per event; admins resolve or dismiss, optionally cancelling the event.
- **Geocoding proxy:** Nominatim with 1 req/s queue, 24 h cache, generic User-Agent, 503 fallback.
- **Account deletion** (`DELETE /api/users/me`); profile updates restricted to name/city/sports; password change route aligned.
- Email validation fixed (TLDs longer than 3 characters were rejected).
- **Scripts:** `scripts/migrate-events.js` (dry-run default, DST-correct, never fabricates coordinates), `scripts/seed.js`, `scripts/e2e-server.js`.

### Frontend
- **Public routes** (`/`, `/karte`, `/events/:id`); sign-in is only required for actions, and the login returns to the original page.
- **Discover:** one result set rendered as list + MapLibre map (OpenFreeMap). Card ↔ marker selection sync, "Diesen Bereich durchsuchen", URL-synced filters, empty/loading/error states, unmappable events labelled.
- **3D:** verified that the OpenFreeMap "liberty" style contains the `building-3d` fill-extrusion layer (minzoom 14). The toggle switches pitch + layer visibility, with a hint below zoom 14. WebGL failure → fallback with OSM links.
- **Event detail:** truthful join/leave states (updates only after server confirmation), change notice, cancel dialog, report dialog, .ics export, share.
- **Create/edit form:** geocoding search or map pin with reverse geocoding, editable address, preview step, inline German errors, diff-only updates.
- **My Events, Profile** (sports chips, password, account deletion), **Moderation** (reports queue, all events).
- Navigation: Entdecken, Karte, Erstellen (prominent; mobile FAB), Meine Events, Profil.
- Self-hosted Inter font. The Google Fonts and Material Symbols CDNs were removed.
- Draft privacy and imprint pages: they state what the code does, and the operator details are still marked as missing.

## Removed from scope (UX)
Venue marketplace, price per hour, bookings, payments/refunds, favorites, About/Dashboard in the main navigation, fake ratings, "50.000 Sportler" claim, admin pre-approval. The files are kept and listed in [LEGACY_CLEANUP.md](LEGACY_CLEANUP.md).

## Evidence (all run on 2026-11-16)

| Check | Result |
|---|---|
| `backend: npm test` | 45/45 passed (includes 50 concurrent joins on capacity 10 → exactly 10 participants; `$`-string injection guard; no PII in public payloads) |
| `frontend: npx tsc --noEmit` | 0 errors |
| `frontend: npm run lint` | 0 errors, 0 warnings |
| `frontend: npm run build` | success (JS bundle ~1.1 MB / 313 kB gzip, mostly MapLibre) |
| `frontend: npm test` | 21/21 passed |
| `frontend: PW_CHANNEL=msedge npm run e2e` | 5/5 passed (desktop + Pixel 7). Caught and fixed a mobile layout bug: the bottom nav overlapped the list/map toggle. |
| Manual (built-in browser) | Map tiles + markers render; list↔map selection; "search this area"; 3D buildings visible on the detail map; real Nominatim search → pin + address |

The bundled Playwright Chromium could not start on this Windows machine (Windows "side-by-side configuration" error, affecting every Chromium build installed here). The E2E suite was therefore run with the installed Microsoft Edge (`PW_CHANNEL=msedge`).

## Remaining risks / not done
- **Credentials:** the old README exposed a DB connection string and JWT secret. They are now replaced with placeholders, but the **real credentials still need rotating** (owner action), and git history may still contain them.
- **Migration:** not run against the real database (needs explicit OK; run the dry run first).
- **Legal:** imprint and controller details are missing; the privacy text needs legal review.
- **Geocoding:** Nominatim's usage policy limits load; swap `GEOCODER_URL` for production traffic.
- **Cold start:** a city-agnostic map will be empty in most cities at launch. Empty states invite people to create events, but this is a product risk.
- **Not built:** no notifications (email/push) for changes or cancellations (participants see a notice on the event page), no password reset, no lazy-loading of the map bundle.
- **No deployment config, monitoring or backups yet.**

# Changes: UX redesign v2 (2026-11-18)

Branch `redesign/ux-v2`. Design system: [DESIGN.md](DESIGN.md).

## What changed
- **Flows:** event cards open the event on tap; joining, reporting or saving as a guest continues by itself after sign-in; the join button is a fixed bar on phones; publishing an event confirms and offers sharing.
- **Identity:** new tokens (warm neutrals, court blue, volt lime, Bricolage Grotesque), pill buttons, new brand mark; toast, avatar and confirm-dialog components; dialogs trap focus.
- **Navigation:** Start · Entdecken · Meine Events · Profil in both the top bar and the tab bar; `/karte` is the map view of Discover; personal home for signed-in users; new `/regeln`; "So funktioniert Hobbook" with FAQ.
- **Discover:** one-tap filter chips, "Plätze frei" (`?frei=1`), distance on cards, last searched place remembered on the device.
- **Events:** saved events ("Gemerkt"), optional "Mitbringen", Route button, organizer line with member year and events hosted, quiet safety and report line.
- **Map:** clustering, own-position dot and recenter, loading and empty hints, preview card on phones.
- **Create:** three numbered sections with sport grid, day and duration shortcuts, suggested title, participant stepper, optional fields under "Mehr Optionen", live preview, one publish button.
- **Landing:** rewritten around real events with the "Der Ball rollt" motion concept.

## Backend (additive only)
- `ConnectEvent.bring` (optional, ≤200 characters) in model, validation and payload.
- `User.savedEvents`; `POST` / `DELETE /api/events/:id/save`; `saved` per viewer on every event; `saved` list in `GET /api/events/me`. Bookmarks are private and removed when an event is deleted.
- Detail view only: `organizer.memberSince` (year) and `organizer.eventsHosted`.
- No existing field, route or response was renamed or removed.

## Not built
- Notifications, password reset and e-mail verification (all need an e-mail service).
- Organizer profile pages, event photos, chat, an English translation.
