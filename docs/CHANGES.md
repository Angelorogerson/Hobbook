# Changes: ten smaller features (2026-11-20)

Branch `feature/ten-features`. Built in parallel on a shared skeleton (database fields, empty routers, placeholder pages), then merged and tested together.

- **Password reset by email:** "Passwort vergessen?" on the login page → `POST /api/auth/forgot` (always the same answer) → emailed one-time link (60 min, only a hash is stored) → `/passwort-neu/:token` → signed in. Sessions issued before a password change stop working; changing the password in the profile returns a fresh session for that device.
- **Email confirmation (soft):** sign-up sends a link (`/email-bestaetigen/:token`, 7 days). Nothing is blocked without it; the profile shows a notice with "Link erneut senden". `emailVerified` is part of the session user.
- **Calendar subscription:** profile section "Kalender-Abo" gives a personal `.ics` address (`/api/calendar/feed/<token>.ics`) with all games the person is in or organizes; "Link erneuern" revokes the old address. No names of other people in the feed.
- **Data export:** profile section "Deine Daten" downloads a JSON copy of everything stored about the account (`GET /api/users/me/export`).
- **Fragen & Infos on events:** anyone signed in can ask under an event; hosts can answer and tick "An alle Teilnehmenden senden" (in-app notice, email, push). Askers are told about answers. Authors, hosts and moderators can delete. `Comment` model, `/api/events/:id/comments`.
- **Printable poster ("Aushang"):** `/events/:id/aushang` and `/stammspiel/:key/aushang` render one A4 page with time, place and a QR code generated in the browser (`qrcode-generator`). Linked for hosts on the event and Stammspiel pages.
- **Search alerts ("Sag mir Bescheid"):** offered when a city search finds nothing (and quietly below results); stored on the user (max 5); a new public event or Stammspiel in that city notifies once. Matching follows Discover's prefix search ("Frankfurt" → "Frankfurt am Main"). Managed in the profile under "Such-Alarme".
- **Discover text search and level filter:** `GET /api/events?q=&level=`; URL params `suche` and `niveau`.
- **Host again + recent places:** "Nochmal veranstalten" opens the create form as a copy (`/events/neu?kopie=<id>`) with the next future date on the same weekday; the create form offers "Zuletzt genutzt" places (`GET /api/places/mine`).
- **Feedback with admin inbox:** `/feedback` (guests too, honeypot, rate-limited) → moderation tab "Feedback" (`/admin/feedback`). The page the person came from is recorded; no email address is shown.
- **Account deletion** also removes the person's comments and alerts and unlinks their feedback. The privacy page describes all of the above.
- **Tests:** new backend files `account`, `calendar-export`, `comments`, `alerts-search`, `places-feedback`, `integration-features`; new frontend component tests; E2E `new-features.spec.ts` (9 flows with accessibility checks).

Not built: English/French translation, "+1" guests, event photos, comment threads or live updates.

# Changes: Stammspiel gaps closed (2026-11-18, second pass)

- **Account deletion:** a Stammspiel goes to the longest-serving co-host (notice `handover`), or ends and its open game is called off. Memberships, co-host roles, blocks, answers, waiting-list places, no-show marks and notifications are removed; freed spots go to the waiting list.
- **Email links need a tap:** `/antwort/:token` shows the game first (`POST /api/links/preview`) and answers only on tap. `/stumm/:token` asks before muting. Scanners that open links can no longer answer for anyone.
- **Moving up shortly before kick-off:** within 6 h of the start a promoted person holds the spot for 30 min and must confirm ("Ich komme" / "Doch nicht", also from email). Unconfirmed spots pass on via the new job step `expirePromotions` (`services/promotion.js`). Earlier promotions stay automatic.
- **Onboarding:** after sign-up, `/willkommen` asks for city and sports (prefilled from the invite's Stammspiel or the last searched city), then continues to where the person was going.
- **Stammspiele in Discover:** "Stammspiele" filter chip (`?stamm=1`, API `series=true`); public listing `GET /api/groups?city|near|sport`; Home shows "Stammspiele in {Stadt}".
- **Edit scope:** editing a Stammspiel with an open game asks "Nur ab nächster Woche" / "Auch für {Termin}". The open game moves within its week; participants are told about time or place changes; impossible moves give a clear 409.
- **Late cancellations on single events** now count for reliability (only when a real spot was given up, never for leaving the waiting list).
- **People:** hosts remove and optionally block members (blocked people can't rejoin, answer or use email links; hosts can lift blocks). "Person melden" on public profiles; moderation can block accounts ("Konto sperren"), which are then signed out and can't log in.
- **Handover:** the organizer can hand a Stammspiel to any member; they become co-host.
- **Tests:** `backend/tests/gaps.test.js` (17 tests), `frontend/src/pages/main/gaps.test.tsx`, Discover chip test, E2E `stammspiel-people.spec.ts` (invite sign-up with welcome step; remove and block), email link tap in `stammspiel.spec.ts`, axe on the welcome and answer pages.

# Changes: Stammspiel – the weekly game that organizes itself (2026-11-18)

Implements all phases of [product/NEXT_BIG_IMPROVEMENT.md](product/NEXT_BIG_IMPROVEMENT.md).

- **Backend:** `Group` (weekly Stammspiel, members, co-hosts, skip dates, invite code) and `Notification` models; `ConnectEvent` gains the game fields (`group`, `occurrenceKey`, `minPlayers`, `deadlineAt`, `decision`, `responses`, `waitlist`, `weather`, `noShows`, job flags). Time-zone-safe weekly generation (`utils/time.js`, DST-tested). Idempotent jobs (`services/stammspiel.js`): generate → invite → nudge non-responders → decide at the deadline → remind 2 h before → weather. Triggered in-process every 5 min, by `POST /api/jobs/run` (secret) and `.github/workflows/jobs.yml`. Atomic waitlist with auto-promotion for all events (`services/attendance.js`). Delivery: in-app notices, email (Brevo driver, `services/mailer.js`), web push (`services/push.js`); per-group mute; changes and cancellations always delivered. Signed one-tap email links (`utils/linkToken.js`). Host tools: remind, skip a week, decide early, cancel for weather, co-hosts, end. No-show marking (24 h) with dispute, reliability facts, public mini profile, admin metrics.
- **Frontend:** "Jede Woche wiederholen" in the existing create form; Stammspiel page with invite step (WhatsApp, copy), answer card, roster, host tools, members, history and mute; answer card on the event page; waiting list for full events; Home "Deine Woche"; Stammspiele in My Events (default tab = first non-empty); bell + notifications page; email link pages (`/antwort/:token`, `/stumm/:token`); public profiles (`/leute/:id`); notification settings and own reliability in Profile; admin "Kennzahlen"; service worker and manifest for push. Fixes: saving and joining resume after sign-in; one capacity wording ("9 von 12 dabei").
- **Edge:** `worker/index.js` adds Open Graph previews for `/s/*`, `/stammspiel/*`, `/events/*`.
- **Tests:** 25 new backend tests (loop, DST, idempotency, tokens, waitlist, privacy, reliability); new frontend tests (answer card, WhatsApp status, bell); E2E `stammspiel.spec.ts` (create → invite → answer in app and from email → automatic decision) and axe checks for the new pages.

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
