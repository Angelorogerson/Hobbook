# Engineering Prerequisites (Engineering Track)

> Date: 2026-11-16 · Baseline: [`PROJECT_SYSTEM_CONTEXT.md`](../../PROJECT_SYSTEM_CONTEXT.md) (issue IDs referenced). Principle: **improve existing → simplify → reuse → extend** before rewrite or new dependencies. This is a prerequisite list, not an implementation plan; that comes after discovery sign-off.

## E-00 Secrets hygiene — FOUNDATION, do first
- **Problem:** `README.md` contains what appears to be a real MongoDB Atlas connection string with credentials and a JWT secret, plus test-account passwords; `.env.example` has a static sample secret (ISSUE-SEC-01). Values are deliberately not repeated here.
- **Do:** rotate the DB user password and JWT secret; restrict Atlas network access; replace README values with placeholders; consider rewriting git history if the repo is or will be shared; make the server fail to start without a strong `JWT_SECRET`.
- **Reuse:** existing `dotenv` setup.

## E-01 Green build — FOUNDATION
- Fix `ignoreDeprecations`, add `vite-env.d.ts` (ImportMeta env + asset modules), fix `isAuthenticated`→`isLoggedIn`, VenueCard props, favorites typing, unused symbols (ISSUE-BUILD-01). Add ESLint as a dev dependency or drop the script.
- Make `npm run build` a CI gate (E-10).

## E-02 API contract alignment — FOUNDATION
- Password route/method, booking detail and venue update envelopes, `/users/me` helper (ISSUE-API-01).
- Decide on one response envelope convention for new endpoints (e.g. `{ data }` or the resource name) and document it; migrate touched endpoints only.
- Fix Home sport buttons sending title-case sport values; normalise sport enums in one shared constant.

## E-03 Atomic capacity + waitlist — FOUNDATION/MVP
- Replace read-push-save in `joinEvent` with a conditional atomic update, e.g. `findOneAndUpdate({ _id, status: {$in:[...]}, participants: {$ne: uid}, $expr: { $lt: [{ $size: "$participants" }, "$maxParticipants"] } }, { $push: { participants: uid } })`; on no match → push to `waitlist` atomically (ISSUE-EVENT-01).
- Leave → `$pull` + promote the first waitlisted user in the same conditional update pattern (or a short transaction; Atlas supports replica-set transactions).
- Recompute status in the update rather than in the `pre('save')` hook, which atomic updates bypass.
- If booking stays alive behind a flag: same treatment or leave it disabled (ISSUE-BOOK-01).

## E-04 Data model evolution — MVP
Evolve, don't replace:
- **Place** ← `Venue`: add `type` (`free_court|commercial|university|municipal|other`), `indoor`, `surface`, `lighting`, `usageHoursText`, `adultsAllowed`, `priceInfoText`, `externalBookingUrl`, `source`, `verifiedAt`; make `pricePerHour` and `capacity` optional; reconcile `status` vs. `isActive`. Keep the collection name for now to avoid migration churn (or alias the model).
- **Game** ← `ConnectEvent`: add `place` (ref Place, keep the embedded `location` as fallback during migration), `series` (ref), `minPlayers`, `decisionAt`, `waitlist[]`, `status` + `confirmed`, `formatTags[]`, `visibility` (`public|link`; map from existing `isPublic`), `costTotal`/`costNote` (V1), `lateDropouts[]`, `attendance[]` (V1).
- **Series** (new): organizer, co-organizers (V1), template fields, `rrule`-lite (weekday + time + timezone `Europe/Berlin`), `active`, `followers[]`.
- **Report** (new): reporter, target type/id, reason, text, status.
- **Favorites:** migrate `User.favorites` and the `Favorite` collection to follows; delete one store (ISSUE-FAV-01).
- Sport enum: decide on `both` for places vs. a single sport for games; keep lowercase canonical values.

## E-05 Public read API + optional auth — MVP
- `optionalAuth` middleware (decode token if present, never fail).
- Public `GET /games`, `GET /games/:id`, `GET /places`, `GET /places/:id`: no PII beyond first name + initial; server-side filters (city, sport, date range, level, tags) and pagination (PERF-01).
- Frontend: split `ProtectedRoute` so read pages are public and actions prompt login with a return URL.

## E-06 Scheduler + notifications — MVP
- Jobs: generate the next series instance; pre-decision nudge; go/no-go decision; reminders; post-game attendance prompt (V1).
- Smallest option: a persisted job collection polled by an in-process interval worker with idempotent handlers (e.g. a `jobs` collection with `runAt`, `lockedUntil`), or an established Mongo-backed scheduler (Agenda). Avoid adding Redis or another queue.
- Email: transactional provider with an EU data processing agreement; templates in German; `.ics` generation; per-series unsubscribe tokens.
- Note: the server currently starts listening before `connectDB()` resolves; fix that before adding workers.

## E-07 Security baseline — FOUNDATION
CORS allowlist from `CLIENT_URL` (already in `.env.example` but unused); auth rate limiting (login, register, reset, report, join); production-safe error messages (mount one error handler; remove the duplicate); escape the city regex input; restrict the venue/place update field allowlist; disable production source maps or keep them private; validate request bodies on new endpoints (a small schema library is acceptable, used only at the API edge).

## E-08 Privacy / legal (GDPR, TMG/DDG) — FOUNDATION
- Impressum and Datenschutzerklärung pages; account deletion (hard delete or anonymisation of games and participation); data export on request; data minimisation: stop collecting `phone` unless needed; never expose emails publicly.
- External fonts: `index.html` loads Google Fonts/Material Symbols from Google servers. Self-host them; loading Google Fonts from Google has been treated as a GDPR issue in German case law (LG München 2022). Get legal advice.
- No tracking cookies in MVP; if analytics are used, choose a cookieless, EU-hosted option.

## E-09 Tests — FOUNDATION → ongoing
- Backend: integration tests against an in-memory or containerised MongoDB for auth, ownership, join concurrency/waitlist, go/no-go decision, series generation (incl. DST), public endpoints without PII.
- Frontend: a few component tests + 1–2 E2E flows (shared link → join; create series → share).

## E-10 CI — FOUNDATION
Pipeline: install → typecheck → lint → tests → build, on every push/PR.

## E-11 Deployment & observability — before MVP launch
Hosting with EU region; HTTPS; health check that includes DB readiness; structured logs; error tracking; DB backups with a restore test. Topology is UNKNOWN today (no deployment config exists).

## E-12 Favorites consolidation — MVP (part of E-04)

## E-13 Feature flags — FOUNDATION
A simple env/config flag to hide booking, admin booking and the slot UI without deleting code.

## E-14 Content consistency — FOUNDATION
€ formatting via `Intl.NumberFormat('de-DE')`; consistent German labels; remove emoji from nav labels (screen readers read them aloud).

## E-15 Share previews for an SPA — MVP
WhatsApp and other link crawlers don't run JavaScript, so `/g/:id` needs server-rendered `<meta property="og:*">`. Smallest option: an Express route that serves `index.html` with injected meta tags for `/g/:id` and `/p/:id`, with the SPA taking over on load. No SSR framework is needed.

## Dependency order

```
E-00 → E-01 → E-02 → E-07/E-08/E-13/E-14 → E-09/E-10
                     ↘ E-03 → E-04 → E-05 → E-15
                                    ↘ E-06
E-11 before public launch
```

## What NOT to do
- No rewrite to another framework, no microservices, no Redis/queue infrastructure, no GraphQL.
- Don't extract a service layer everywhere; extract only for game/series logic, where tests need it.
- Don't build payment infrastructure before F-05 validation.
