# Hobbook: audit and improvement plan

Labels used throughout: **[F]** fact I observed in code or the running demo · **[U]** your statement · **[A]** my assumption (not verified) · **[R]** my recommendation.

> **Update 2026-11-18:** the next big improvement was chosen and built as one piece: the **Stammspiel** (see [NEXT_BIG_IMPROVEMENT.md](NEXT_BIG_IMPROVEMENT.md)). It covers B-05 (notifications: bell, email, push), B-06 (groups with weekly series), B-08 (answers, nudges, deadline decision), B-09 (weather on the game and a host warning; Hobbook never cancels by itself), B-07 (link previews via `worker/index.js`), the waiting list, the B-10/B-12 groundwork as reliability *facts* (no score), a public mini profile and B-15 light (admin "Kennzahlen"). Still open from this backlog: B-01 go-live, B-04 password reset and email verification, B-11, B-13, B-14, B-16, B-18.

## Context

Hobbook is a free community sports-event web app (React/Vite + Express + MongoDB). You asked for a critical audit and an improvement plan. Discovery gave these fixed points [U]:

- Solo developer with Claude Code; a mix of real product and portfolio project (private repo shown to employers).
- Everything must be free at the start. **Online and reachable within 7 days.**
- Start: Kaiserslautern, then Mannheim and Saarbrücken. Football and basketball first; other sports stay.
- You play in two groups (20+ people each, fixed weekly time, free public courts, organized on WhatsApp, strangers welcome). Problems: late arrivals and no-shows, weather, communication.
- Wanted: groups with posts and member chat (iteratively), in-app and email notifications, attendance confirmation, weather info, public profiles, a weighted trust rating out of 10 for people and events, German/English/French, 16+, a "support me" button, legacy code deleted. Account required to join. You moderate alone within 48 h. You are the legal operator.

The outcome this plan aims for: a live site in 7 days that your two groups can actually use, then a sequence of small releases that turn it from "list of one-off events" into "the place where a weekly game is organized".

---

## 1. Executive assessment

- **The foundation is sound.** [F] Atomic join/leave, zod validation, rate limits, CORS allowlist, privacy-preserving serializer, public browsing, report queue, account deletion, a consistent design system with dark mode and a working mobile layout. 45 API, 21 UI and 5 E2E tests are documented as passing (not re-run by me).
- **The product does not yet fit how your groups play.** [F] It only has one-off events, and it tells nobody when something changes. [U] Your games are weekly, and your pain is communication, weather and no-shows. An organizer would have to recreate the event every week, and a rain cancellation reaches no one.
- **It cannot launch as it stands.** [F] No deployment, CI, monitoring or backups; no password reset or email verification; imprint and privacy text are drafts; credentials once committed in the README are not confirmed rotated; one login injection weakness (see 7).
- **The biggest risk is an empty map, not missing features.** [A] An "everywhere" map is empty everywhere on day one. Your two groups in one city are the real asset, so launch is built around them.

## 2. Strengths and weaknesses

| Strengths [F] | Weaknesses [F] |
|---|---|
| Public discovery without login; list and map share one query | No recurring events, groups, follow, waitlist |
| Capacity is race-safe (tested with 50 concurrent joins) | No notifications of any kind (email, push, in-app) |
| Privacy by default ("Vorname N.", participants hidden from outsiders) | No password reset, no email verification |
| Link-only events, `.ics` export, share, report | No link preview for WhatsApp (client-rendered SPA, no Open Graph tags) |
| Moderation queue with cancel/delete | No "near me"; discovery starts with typing a city |
| Design tokens, dark mode, skip link, mobile bottom nav | German only; all strings hard-coded |
| Self-hosted fonts, no tracking | No profiles, no trust signal beyond a short name; users can't report people |
| Tests at three levels | No deployment, CI, monitoring, backups, analytics; legacy venue/booking code still in repo |

To verify: in my demo screenshots the map showed markers but no base tiles. This may be a preview artifact; it must be checked on the deployed site.

## 3. Key user problems and opportunities

| # | Problem | Evidence | Opportunity |
|---|---|---|---|
| P1 | The weekly game must be re-announced every week; "who's in?" is asked in chat | [U] fixed weekly games on WhatsApp | Recurring game with a stable link |
| P2 | Cancellations and changes (weather) don't reach everyone | [U] | Notifications + one-tap weather cancel |
| P3 | People come late or not at all | [U] | Confirm-attendance request; factual reliability |
| P4 | Newcomers in a city can't see where and when people play | [U] strangers welcome; [A] demand from newcomers | Public map fed by real groups |
| P5 | Joining a stranger's game needs some trust | [U] you want ratings | Trust score built from what actually happened |
| P6 | Kaiserslautern and Saarbrücken have many non-German speakers | [A] students, US community, French border | DE/EN/FR |

## 4. Features: improve, simplify, remove, add

- **Remove:** legacy venue/booking/favorites code and unused `User.favorites`, `phone`, `avatar` fields [U].
- **Simplify:** two nav entries "Entdecken" and "Karte" point to the same page with a different default view; merge into one with the existing list/map toggle [R].
- **Improve:** event detail (weather, link preview, participant confirmation state), discovery (near me, default city from profile), auth (reset, verification), profile (public view).
- **Add, in this order:** deployment → notifications → recurring games and groups → attendance confirmation → trust score → i18n → posts → chat.

### Where I disagree with your answers [R]

1. **Rating: no default of 10 for new accounts.** A new or fake account would look like the most trustworthy one. New profiles and events show "Neu" until there are at least 3 completed events; then the score appears.
2. **Rating: built mainly from facts, not opinions.** Score out of 10 from: events held as announced vs. cancelled late, confirmed attendance vs. no-shows, and a one-tap attendee answer "Did it take place as described?". Weighted (Bayesian) average so 2 ratings can't produce a 10 or a 0. Free-text comments come later and only with report/removal, because public comments about named people create defamation and moderation load for a solo moderator.
3. **Chat last.** Chat needs realtime infrastructure, abuse handling and more privacy obligations, and WhatsApp already does it for free. First build organizer announcements and simple event comments; measure whether groups still ask for chat.
4. **A domain is the one cost worth paying (about €10/year).** Without your own domain, email (password reset, cancellations) is likely to land in spam or be refused by free email providers, and a `*.pages.dev` address looks less trustworthy when shared. The 7-day launch works without it; decide before email goes live.

## 5. UX and flow improvements

| Flow | Change |
|---|---|
| Shared link in WhatsApp | Preview card with title, time, place, free spots (B-07) |
| Join | After signup return to the event and join in one step (login-return exists [F]; verify after signup) |
| Weekly game | Create once as a series in a group; next week's event opens automatically (B-06) |
| Cancel | Reason presets including "Wetter"; all participants are notified (B-05, B-09) |
| Before the game | "Still coming?" request 24 h before; a "no" frees the spot (B-08) |
| Discover | "In meiner Nähe" button (browser geolocation, asked only on click); remembered city (B-11) |
| First visit while server wakes up | Clear "Server startet, einen Moment…" state instead of an error (B-01) |

## 6. Technical and architectural improvements

- **Hosting (free) [R]:** frontend on Cloudflare Pages, API on Render free tier (Frankfurt), database on MongoDB Atlas M0 (Frankfurt). Reason: Cloudflare Pages has no non-commercial restriction (relevant for the support button); Render runs the existing Express app unchanged. Known limits: the Render free instance sleeps after inactivity (first request takes up to about a minute); Atlas M0 has 512 MB and no automated backups. Provider terms change, so check them on signup day.
- **Scheduled work without a paid worker [R]:** one protected endpoint `POST /api/jobs/run` (secret header) that performs due jobs idempotently (reminders, series generation, confirmation requests), triggered by a free external cron. No Redis, no queue.
- **Notifications:** a `Notification` collection + bell in the navbar (free, no provider); email through a free transactional tier; web push later via PWA.
- **Data model additions:** `Group`, `Series`, `Notification`, `Attendance` (on the event), `Feedback`; `Report` gains a user target.
- **CI:** GitHub Actions running backend tests, frontend typecheck, lint, tests and build on every push.
- **Backups:** weekly `mongodump` via scheduled GitHub Action to a private artifact (M0 has none).
- **Performance:** MapLibre is already lazy-loaded [F]; nothing else is needed at this scale.

## 7. Security, privacy, accessibility, moderation

| Item | Status | Action |
|---|---|---|
| Leaked DB password and JWT secret (old README) | [F] placeholders now; rotation not confirmed; repo will be shown to employers | Rotate both before launch (B-01). Rotation makes the old history harmless |
| Login accepts non-string `email` (`User.findOne({ email })` in `backend/controllers/authController.js`) | [F] operator-injection weakness | Validate auth bodies with zod like the event routes (B-01) |
| Password length: model says 6, controller says 8 | [F] | Align on 8 |
| Token in `localStorage` | [F] acceptable with separate frontend/API hosts | Keep; add a strict Content-Security-Policy header on the frontend host |
| No password reset / email verification | [F] | B-04 |
| Atlas network access | Render free has no fixed IP [A] | Allow all IPs with a long random password; accept and document |
| Imprint, privacy text | [F] drafts | Fill in your name and address; add hosting providers, email provider, weather API, geolocation, profiles and ratings as they ship. **Needs human/legal check** |
| 16+ | [U] | Required checkbox at signup; stated in terms |
| Donations | [U] | External link only (no payment handling in the app). Tax treatment of donations to a private person: **verify yourself** |
| Moderation | [U] you alone, 48 h | Email to you on every new report; report users as well as events; block user (B-10) |
| Accessibility | [F] skip link, contrast script, list alternative to map. Not audited in depth | Add automated axe checks to Playwright; manual keyboard pass on create/join flows (B-03) |
| Geolocation | new | Only on click, never stored server-side |

## 8. Differentiation

[R] Hobbook is the free, no-install link for a weekly pickup game on a public court, visible to newcomers on a map, in three languages. Each part answers something from discovery: free courts and weekly rhythm [U], WhatsApp stays as the chat [U], strangers welcome [U], DE/EN/FR for this region [A].

What it deliberately is not: a booking or payment platform, a league manager, or a WhatsApp replacement at launch.

[A] Competitor coverage (JUGAD, CeleBreak, Meetup, Spontacts) comes from your earlier discovery docs and was not re-checked. Before investing in Mannheim, check what is already active there.

## 9. Prioritized backlog

Effort: S = up to 1 day, M = 2–4 days, L = 1–2 weeks (solo with Claude Code). Priority: P0 = launch blocker, P1 = core value, P2 = growth, P3 = later.

| ID | Item | Prio | Effort | Depends on |
|---|---|---|---|---|
| B-01 | Security fixes, secret rotation, deploy, cold-start state | P0 | M | accounts |
| B-02 | Delete legacy code; merge Entdecken/Karte nav | P0 | S | – |
| B-03 | CI + axe accessibility checks | P0 | S | – |
| B-04 | Email: verification, password reset | P1 | M | B-01, email provider, ideally domain |
| B-05 | Notifications: in-app bell + email on change/cancel/join | P1 | M | B-04 |
| B-06 | Groups with recurring series | P1 | L | B-05, jobs endpoint |
| B-07 | Link previews (Open Graph) for events and groups | P1 | S–M | B-01 |
| B-08 | Reminder + confirm attendance | P1 | M | B-05, jobs endpoint |
| B-09 | Weather on event + weather cancel preset | P2 | S | – |
| B-10 | Public profiles, report/block user | P2 | M | – |
| B-11 | "Near me" + remembered city | P2 | S | – |
| B-12 | Trust score (people, groups) | P2 | M | B-08, B-10, real usage data |
| B-13 | i18n DE/EN/FR | P2 | L | best after B-06 so strings are stable |
| B-14 | Support-me link | P2 | S | – |
| B-15 | Admin metrics page (KPIs from the database) | P2 | S | – |
| B-16 | Group posts / announcements, event comments | P3 | M | B-06, B-10 |
| B-17 | PWA + web push | P3 | M | B-05 |
| B-18 | Member chat | P3 | L | B-16, evidence of demand |

### Details per item

**B-01 Deploy and secure** · *Problem:* not online; known security gaps. *Users:* everyone. *Benefit:* reachable site, safe to share. *Solution:* see "First 7 days". *Risks:* free-tier sleep, provider terms. *Success:* public URL, health check green, your two groups can open it.

**B-02 Remove legacy, merge nav** · *Problem:* dead code confuses future work and reviewers of your portfolio; two nav entries for one page. *Users:* you, all visitors. *Solution:* delete files listed in `docs/LEGACY_CLEANUP.md`; one "Entdecken" entry. *Risk:* old collections in Atlas; export or drop consciously. *Success:* build and tests green; no `legacy/` folder.

**B-03 CI + accessibility checks** · *Problem:* nothing stops a broken push; a11y unverified. *Solution:* `.github/workflows/ci.yml`; `@axe-core/playwright` in the existing E2E specs. *Success:* green pipeline on main; zero serious axe violations on landing, discover, detail, form.

**B-04 Email basics** · *Problem:* a forgotten password locks a user out; fake emails can register. *Users:* all account holders. *Solution:* provider-agnostic `backend/services/mailer.js`; hashed, expiring tokens on `User`; routes `/auth/forgot`, `/auth/reset`, `/auth/verify`. *Dependencies:* free transactional email tier; sender domain strongly advised. *Risks:* spam folder, daily limits. *Success:* reset completes in under 2 minutes in a real inbox; >90% of new accounts verified.

**B-05 Notifications** · *Problem:* P2, changes reach nobody. *Users:* participants, organizers. *Solution:* `Notification` model; created in `updateEvent`, `cancelEvent`, `joinEvent`, `leaveEvent` (`backend/controllers/connectEventController.js`, which already sets `changedAt`); bell with unread count in `Navbar.tsx`; email for cancel and time/place change; per-user email opt-out in profile. *Risks:* email volume against free limits. *Success:* every participant of a cancelled event has a notification within 1 minute; share of cancellations seen before start time.

**B-06 Groups with recurring series** · *Problem:* P1. *Users:* organizers and regulars. *Solution:* `Group` (name, sport, city, description, owner, admins, members, visibility) and `Series` (weekday, time, timezone, template fields); the jobs endpoint creates the next event after each one ends; group page shows next game, upcoming list, members count; "follow/join group" gives a notification when the next game opens. Events stay the unit people join, so all current event code is reused. *Risks:* DST handling, edit semantics (this event vs. all future). *Success:* your two groups run 4 consecutive weeks without recreating an event by hand.

**B-07 Link previews** · *Problem:* a bare URL in WhatsApp gets fewer taps [A]. *Solution:* a small edge function on the frontend host that injects Open Graph tags for `/events/:id` and `/g/:id` (the sleeping API should not serve crawlers). *Success:* preview card renders in WhatsApp; link-open to join rate.

**B-08 Reminder and confirm attendance** · *Problem:* P3. *Solution:* 24 h before start, participants get "Bist du dabei?" (yes / no); "no" leaves the event and reopens the spot; detail page shows confirmed count; after the event the organizer can mark no-shows in one screen. *Risks:* nagging; keep to one request. *Success:* confirmation response rate; no-show rate trend.

**B-09 Weather** · *Problem:* P2 for outdoor sports. *Solution:* forecast for the event's time and coordinates on the detail page for events within 7 days, fetched server-side and cached (a free no-key weather API such as Open-Meteo; check its terms for your use); "Wetter" as a cancel preset in `CancelEventDialog.tsx`. No automatic cancellation. *Success:* share of cancellations using the preset; fewer "is it on?" messages (ask your groups).

**B-10 Public profiles, report/block user** · *Problem:* P5; reports cover events only [F]. *Solution:* `/u/:id` with display name, sports, city, member since, events organized and attended; `Report` gets a `targetUser`; organizer can remove a participant. *Risks:* privacy; keep "Vorname N." and let users hide city. *Success:* profile views per join; reports handled within 48 h.

**B-11 Near me** · *Problem:* typing a city is a slow start on a phone. *Solution:* button calling browser geolocation, feeding the existing `near`/`radiusKm` query [F: supported by `GET /api/events`]; remember last city in `localStorage`; default from profile city. *Success:* share of discover sessions using it.

**B-12 Trust score** · *Problem:* P5. *Solution:* as described in section 4; computed from stored facts, shown on profile, group and event card once there are ≥3 completed events; formula documented publicly. *Dependencies:* weeks of real data from B-08. *Risks:* gaming, discouraging casual players, disputes. *Success:* join rate on scored vs. unscored events; number of rating disputes.

**B-13 i18n** · *Problem:* P6. *Solution:* `react-i18next` with `de`, `en`, `fr` JSON files; API returns stable error codes that the frontend translates; language switch in navbar, default from browser. *Risks:* French quality needs a native reader; three languages triple copy maintenance. *Success:* share of sessions per language; no untranslated keys in CI check.

**B-14 Support link** · External link in footer and About page. *Success:* clicks (count only).

**B-15 Admin metrics** · *Problem:* no KPI is measurable today [F]. *Solution:* one admin page with aggregates from MongoDB (section 13); no tracking scripts. *Success:* you can read all KPIs weekly.

**B-16 / B-17 / B-18** · Built only when the P1/P2 items are in use and the need is confirmed by your groups.

## 10. Quick wins, medium term, long term

- **Quick wins (week 1–2):** B-01, B-02, B-03, B-11, B-14, B-09.
- **Medium term (weeks 2–8):** B-04, B-05, B-07, B-06, B-08, B-15, B-10.
- **Long term (month 3+):** B-12, B-13, B-16, B-17, B-18, Mannheim and Saarbrücken rollout.

## 11. Roadmap

### First 7 days: go live (this is what I implement first)

| Day | Work | Key files |
|---|---|---|
| 1 | Delete legacy; drop unused `User` fields; merge nav | paths in `docs/LEGACY_CLEANUP.md`, `backend/models/User.js`, `frontend/src/components/layout/Navbar.tsx` |
| 1 | Auth hardening: zod schemas for register/login/password, password min 8 everywhere, 16+ checkbox | `backend/controllers/authController.js`, `backend/routes/authRoutes.js`, new `backend/validation/authSchemas.js` (reuse `backend/middleware/validate.js`), `frontend/src/pages/auth/RegisterPage.tsx` |
| 2 | CI workflow; axe checks in E2E; `make-admin` script | `.github/workflows/ci.yml`, `frontend/e2e/*.spec.ts`, `backend/scripts/make-admin.js` |
| 2 | Production config: SPA fallback, CSP headers, cold-start message | `frontend/public/_redirects`, `frontend/public/_headers`, `frontend/src/api/axiosInstance.ts` |
| 3 | **You:** rotate Atlas password, create new DB user, generate JWT secret, create Render and Cloudflare accounts (I can't create accounts or enter credentials) | – |
| 3–4 | Deploy API (Render) and frontend (Cloudflare Pages); set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`, `TRUST_PROXY=1`, `VITE_API_URL` | deploy notes in `README.md` |
| 4 | Imprint and privacy text with your details and the real providers (**you review**) | `frontend/src/pages/legal/LegalPages.tsx` |
| 5 | Quick wins: near me, support link, weekly backup action | `frontend/src/components/events/FilterBar.tsx`, `frontend/src/hooks/useEventDiscovery.ts`, `Footer.tsx` |
| 6 | Smoke test on real phones (iPhone + Android): register, create, join, cancel, map tiles | – |
| 7 | Create the two real weekly games; share the links in your two WhatsApp groups | – |

### After launch
- **Weeks 2–3:** B-04, B-05, B-07, B-09, B-15.
- **Weeks 4–6:** B-06, B-08.
- **Weeks 7–10:** B-10, B-13, then B-12 once data exists.
- **Month 3+:** first group each in Mannheim and Saarbrücken; B-16, B-17; B-18 only on evidence.

## 12. Risks, dependencies, assumptions, open decisions

**Risks**
- Empty map outside your groups. Mitigation: group-first launch; don't promote other cities before there is a local organizer.
- Free-tier limits: sleeping API, 512 MB database, email daily caps, provider terms changing. Mitigation: host-independent code, documented migration path.
- Solo moderation and legal responsibility with your private address in the imprint.
- Rating disputes and misuse once B-12 ships.
- Scope: 18 items for one person. Order matters more than speed.

**Dependencies on you**
- Accounts and secrets (Render, Cloudflare, Atlas, email provider), legal text review, recruiting one tester per group [U: agreed].

**Assumptions to check**
- Whether the Atlas database holds real data worth migrating or can be wiped.
- Whether credentials were already rotated (not answered).
- Map tiles render in production.
- Competitor presence in the three cities.

**Open decisions**
1. Buy a domain (~€10/year) before email goes live? [R: yes]
2. "Neu" label instead of a default 10 rating? [R: yes]
3. Chat after posts and only on demand? [R: yes]
4. French from the first i18n release or after EN? [R: together, with a native reader for French]

## 13. Success criteria and KPIs

Measured from the database via B-15, no tracking.

| KPI | Target |
|---|---|
| Site live and reachable | Day 7 |
| Your two groups use it weekly | 4 consecutive weeks by week 8 |
| Active groups in Kaiserslautern (≥1 event held in the last 14 days) | ≥5 by month 6 [U goal, my number] |
| Groups in Mannheim / Saarbrücken | ≥1 each by month 6 |
| Events held vs. cancelled | track; baseline in month 1 |
| Fill rate (participants / capacity) | track; baseline in month 1 |
| Confirmation response rate (after B-08) | ≥70% |
| No-show rate (after B-08) | falling month over month |
| Organizer retention (created an event in week N and N+4) | ≥50% |
| Signup after opening a shared link | track; improve after B-07 |
| Reports resolved within 48 h | 100% |

## Verification of the first 7 days

- `cd backend && npm test` and `cd frontend && npm run lint && npm test && npm run build` stay green; new tests for auth validation (object-valued `email` is rejected with 400) and the 16+ flag.
- `PW_CHANNEL=msedge npm run e2e` including the new axe checks.
- Local run through the existing preview configs (`api-demo`, `web-demo`): register → create event → join with second account → cancel; check console and network for errors; mobile viewport.
- On the deployed site: `/health` returns `OK` with `db: up`; map tiles visible; a request from another origin is refused by CORS; the server refuses a weak `JWT_SECRET`; full flow on a real iPhone and Android phone.
