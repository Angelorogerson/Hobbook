# User Story Map

> Date: 2026-11-16 · Activity → Task → Story → Acceptance criteria. Priority: **F** = Foundation, **MVP**, **V1**, **V2**. Evidence/confidence refers to the underlying problem ([PROBLEM_MAP.md](PROBLEM_MAP.md)); confidence that the *solution* works is generally lower until validated ([ASSUMPTIONS_TO_VALIDATE.md](ASSUMPTIONS_TO_VALIDATE.md)).

## 1. Map overview

| Activity → | **Organize** | **Fill the game** | **Discover & join** | **Play** | **Return** | **Places** | **Trust & account** |
|---|---|---|---|---|---|---|---|
| **MVP** | US-03 Create recurring game · US-11 Edit/cancel game | US-05 Share link with preview · US-04 Min players + go/no-go | US-01 Public game page · US-02 Join/leave with waitlist · US-07 Local game list | US-06 Reminders + calendar | US-12 Follow a series | US-08 Place directory (honest info) | US-10 Report/remove · US-13 GDPR basics · US-14 Password reset · US-15 Honest UI |
| **V1** | US-16 Co-organizers · US-17 Cost per head + paid tracker | US-18 Priority invites for regulars · US-19 "Spots open" public nudge | US-20 Distance filter · US-21 Alert when games appear | US-09 Attendance → reliability | US-22 Weekly digest | US-23 Suggest or correct a place | US-24 Magic-link login |
| **V2** | — | — | — | US-25 Disputed no-show flag | — | US-26 Partner hall slots (experiment) | — |

---

## 2. Top stories (full detail)

### US-01 — Public game page
- **Problem:** P-04, X-02 · **Persona:** DROP, ORG's group members · **JTBD:** find a game that will actually happen.
- **Story:** *As a player who got a link, I want to see the game without an account, so that I can decide in seconds whether to join.*
- **Value:** makes sharing work; the main acquisition path.
- **Acceptance criteria:**
  - `/g/:id` is reachable without login and shows title, sport, date/time, place (+ map link), level, format tags, "X/Y dabei", min players, status (offen / findet statt / abgesagt / voll), participants' first names + initials, and the organizer.
  - Link previews (WhatsApp, Telegram, iMessage) show title, date/time, place and spots, via server-rendered meta tags.
  - The CTA "Ich bin dabei" leads to login/signup and returns to the same page.
  - Link-only games are not listed anywhere, but are reachable by link.
- **Edge/error:** cancelled game → status + next series date; deleted game → 404 with "Andere Spiele in [Stadt]"; past game → read-only.
- **Dependencies:** E-05 public read API, E-15 share meta.
- **Existing:** event data exists; there's no detail page and everything is protected.
- **Change:** new route + public endpoint; reuse `ConnectEvent` fields.
- **UX:** mobile-first, the CTA visible without scrolling, German copy.
- **Accessibility:** status is not conveyed by colour only; semantic headings; the CTA is a real button.
- **Security:** expose first names only, never emails or phones; rate-limit the public endpoint.
- **Testing:** API test (public read, no PII); E2E open link → join.
- **Priority:** MVP · **Evidence:** MODERATE · **Confidence:** High.

### US-02 — Join / leave with a waitlist
- **Problem:** P-01, P-02 · **Persona:** DROP, ORG's group.
- **Story:** *As a player, I want to join a game or get on the waitlist when it's full, so that I either have a guaranteed spot or move up automatically.*
- **Acceptance criteria:**
  - Joining is atomic: participants never exceed max under concurrent requests.
  - When full → join puts the player on a FIFO waitlist with the position shown.
  - When a participant leaves → the first waitlisted player is promoted and notified by email.
  - Leaving after the decision time marks a "late dropout" (stored, not shown publicly in MVP).
  - The organizer can't leave their own game (existing rule) but can mark "spiele diesmal nicht" (V1).
- **Edge/error:** joining twice → idempotent; joining a cancelled or past game → 409 with message; a promoted player who no longer wants the spot can leave in one click from the email.
- **Dependencies:** E-03 atomic updates, E-06 notifications.
- **Existing:** join/leave endpoints; non-atomic; no waitlist.
- **Change:** conditional atomic update (`$expr` on participant count) + `waitlist` array.
- **Security:** auth required; a user can only act for themself.
- **Testing:** concurrency integration test (N parallel joins → exactly max); promotion test.
- **Priority:** MVP · **Evidence:** MODERATE · **Confidence:** High.

### US-03 — Create a recurring game
- **Problem:** P-01, P-03, P-09 · **Persona:** ORG.
- **Story:** *As an organizer, I want to set up my weekly game once, so that every week's game is created and announced automatically.*
- **Acceptance criteria:**
  - Form: sport, place (search or new), weekday + time + duration, repeat weekly (default on), max, min, decision offset, level, format tags, description, visibility (link-only / public).
  - Creating stores a series and the next game instance; the next instance is created when the current one ends (or N days before, configurable later).
  - Editing a series affects future instances only; editing an instance affects only that one.
  - Ending a series stops future instances; existing participants are notified.
- **Edge/error:** min > max, past start, missing place → inline errors; DST change → keep local time (Europe/Berlin).
- **Dependencies:** E-04 data model (Series, Place relation), E-06 scheduler.
- **Existing:** CreateEventPage (one-off, free-text location).
- **Change:** extend the form; add a `Series` model; link to `Place`.
- **UX:** sensible defaults so creation takes about 1 minute; preview before publish.
- **Testing:** unit tests for instance generation incl. DST; API validation tests.
- **Priority:** MVP · **Evidence:** STRONG (irregularity) / MODERATE (solution) · **Confidence:** Medium.

### US-04 — Minimum players and go/no-go
- **Problem:** P-02, P-03 · **Persona:** ORG + all participants.
- **Story:** *As an organizer, I want the game to be confirmed or called off automatically at a set time, so that nobody shows up to a game that won't happen.*
- **Acceptance criteria:**
  - Each game has `minPlayers` and `decisionAt`.
  - 2h before `decisionAt`, if count < min → email to the organizer with a share prompt.
  - At `decisionAt`: count ≥ min → status "findet statt" + email to all; else → "abgesagt" + email to all, unless the organizer chose "manuell entscheiden".
  - The organizer can cancel manually at any time with a reason (e.g. weather).
- **Edge/error:** job runs late → idempotent processing; the organizer edits min after the decision → no re-decision.
- **Dependencies:** E-06 scheduler + email.
- **Existing:** none (status only open/full/cancelled).
- **Change:** status `confirmed`; fields; scheduled job.
- **Testing:** time-travel unit tests on the decision function.
- **Priority:** MVP · **Evidence:** MODERATE · **Confidence:** Medium (validate A-03).

### US-05 — Share to WhatsApp
- **Problem:** P-03, P-04 · **Persona:** ORG.
- **Story:** *As an organizer, I want to post my game to our WhatsApp group with one tap, so that people can respond without me running a poll.*
- **Acceptance criteria:** "Teilen" uses the Web Share API with a fallback to a `wa.me` link and a copy button; the prefilled text contains title, day/time, place, spots and link; the preview renders in WhatsApp (verified manually on Android + iOS).
- **Dependencies:** US-01, E-15.
- **Priority:** MVP · **Evidence:** MODERATE (WhatsApp is the incumbent) · **Confidence:** High.

### US-06 — Reminders and calendar
- **Problem:** P-02 · **Persona:** all participants.
- **Story:** *As a participant, I want a reminder and a calendar entry, so that I don't forget or double-book.*
- **Acceptance criteria:** confirmation email with an `.ics` attachment on join; a reminder email on "findet statt" and about 3h before kick-off; email on cancellation or time change; one-click unsubscribe per series; no marketing emails without opt-in.
- **Dependencies:** E-06 (transactional email provider, EU data processing agreement).
- **Priority:** MVP · **Evidence:** MODERATE (Plei praised for reminders) · **Confidence:** Medium.

### US-07 — Local game list
- **Problem:** P-04, P-07 · **Persona:** DROP, UND.
- **Story:** *As a player, I want to see upcoming games in my city that fit my level and schedule, so that I can find one to join.*
- **Acceptance criteria:** public list; city selector (default from profile or the last choice); filters: sport, day (today / tomorrow / weekend / pick), level, format tags; cards show spots left, status, series age ("läuft seit 6 Wochen"); link-only games are excluded; server-side pagination; honest empty state with "Spiel erstellen".
- **Existing:** ConnectPage with sport, day and skill filters (client-side), no city.
- **Change:** add a city filter (backend supports `city`), move filters server-side, add pagination.
- **Priority:** MVP · **Evidence:** MODERATE · **Confidence:** High.

### US-08 — Place directory with honest info
- **Problem:** P-05, P-10 · **Persona:** ORG, DROP.
- **Story:** *As an organizer, I want to pick or add a place with its access rules, so that players know where to go and whether it's free or booked.*
- **Acceptance criteria:** Place fields: name, address, geo, sport(s), type (`free_court` | `commercial` | `university` | `municipal` | `other`), indoor/outdoor, surface, lighting (yes/no/unknown), usage hours text, adults allowed (yes/no/unknown), price info text, external booking URL, source + last verified date; the place page lists upcoming public games; users can add a place (admin can edit/merge); **no ratings**.
- **Existing:** `Venue` model with price, amenities, opening hours, images.
- **Change:** extend/rename to Place; `pricePerHour` becomes optional; drop the slot UI from the default flow.
- **Data seeding:** a manual import for the launch city from city open data or OSM, respecting licences (ODbL attribution for OSM).
- **Priority:** MVP · **Evidence:** STRONG (problem) · **Confidence:** Medium.

### US-09 — Attendance → reliability (V1)
- **Problem:** P-02, P-08.
- **Story:** *As an organizer, I want to record who didn't show up with one tap, so that reliable players get priority and unreliable ones become visible.*
- **AC:** an after-game prompt; everyone pre-ticked; save; show-up rate shown after ≥5 recorded games, as "x von y"; visible to organizers and on profile; no public shaming text.
- **Risk:** may deter casual players (A-05). **Priority:** V1 · **Evidence:** MODERATE (JUGAD, Meetup rules) · **Confidence:** Medium.

### US-10 — Report and remove
- **Problem:** P-08 · **Persona:** all.
- **Story:** *As a player or organizer, I want to report abusive behaviour or remove someone from my game, so that games stay safe.*
- **AC:** report button on game and profile; reasons + text; admin queue with status; the organizer can remove a participant (who is notified neutrally); a removed user can't rejoin that series.
- **Existing:** admin can delete events. **Priority:** MVP · **Evidence:** MODERATE · **Confidence:** High.

---

## 3. Other MVP stories (short form)

| ID | Story | Key AC | Existing → change |
|---|---|---|---|
| US-11 | As an organizer I can edit or cancel my game/series | Participants are notified on time/place change or cancellation | No creator edit → add `PUT` with an owner check |
| US-12 | As a player I follow a series so I'm invited every week | Auto-follow on first join; unfollow anytime | Replaces favorites (F-08) |
| US-13 | As a user I can delete my account and data | Hard delete or anonymise within 30 days; privacy policy + imprint pages | None → add |
| US-14 | As a user I can reset my password | Tokenised email link, 1h expiry, rate-limited | None → add |
| US-15 | As a visitor I only see true claims | No hardcoded ratings, user counts or dead links; consistent € | Remove fake content |

## 4. V1 / V2 stories (short form)

| ID | Story | Notes |
|---|---|---|
| US-16 | Co-organizers per series | Shared edit/cancel rights |
| US-17 | Cost per head + paid tracker | Organizer enters the total; per-head is computed; organizer ticks paid (F-05a) |
| US-18 | Priority window for last week's players | e.g. 48h before public |
| US-19 | "2 Plätze frei" public nudge | Organizer one-tap publishes open spots |
| US-20 | Distance filter | Requires geocoded places |
| US-21 | Alert when a matching game appears | Saved search by city/sport/level |
| US-22 | Weekly digest email | Upcoming games of followed series |
| US-23 | Suggest or correct a place | Moderated |
| US-24 | Magic-link login | Lowers signup friction (A-02) |
| US-25 | Dispute a no-show | V2 |
| US-26 | Partner hall slots | Experiment only (A-07, F-01) |
