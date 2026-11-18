# Next big improvement — "Stammspiel" (the weekly game that organizes itself)

> **Status (2026-11-18):** implemented, all phases, plus the review fixes (account deletion, tap-to-answer email links, confirming late promotions, onboarding, Stammspiele in Discover, edit scope, late cancellations on single events, removing/blocking/reporting people, handover; see [../CHANGES.md](../CHANGES.md)). The pilot with real groups (success criteria §9) is still to run after go-live.

## The answer, up front
**If we could implement only ONE major improvement right now, it should be the *Stammspiel*: a recurring weekly game that opens next week's game by itself and asks every member "Bist du dabei?" with a one-tap answer, even from an email. Shortly before kick-off it decides on its own whether the game goes ahead, and it tells everyone when something changes.**

Why:
- **It turns a one-off listing site into a weekly habit.** Today Hobbook is used once: find, join, done. Nothing ever brings anyone back.
- **It removes the organizer's real work.** That work is chasing "who's in?" in WhatsApp, not publishing.
- **It fixes the pains the user feels in their own two 20+ groups:** no-shows, weather, communication.
- **It needs no cold start.** It works on day 1 with an existing group, and the pilot users are already the user's friends.
- **It builds the base for trust later.** Recurring attendance is the only honest source for a reliability signal.

## Context
Hobbook works:
- Discovery: list and map, filters, near me, a remembered place.
- Detail: trust signals, `.ics`, share, report.
- A 3-step create flow, saved events, a personal home, a landing page and a motion system.

The analysis found one structural gap. **Hobbook has no loop.** The backend has exactly three models (`ConnectEvent`, `User`, `Report`). There are no groups, recurrence, notifications, attendance, waitlist or background jobs. Every message to a participant depends on them opening the event page again ("Termin geändert" is shown only on the detail page). After an action the user hits a dead end:
- A full event offers nothing.
- A cancellation reaches nobody.
- After leaving there is no follow-up.

The user's own behaviour shows where the real value lies. Informal sport is **weekly and recurring**: a fixed time, a free public court, 20+ people, strangers welcome, organized in WhatsApp. Discovery research also shows most casual players play irregularly. Making the regular game easier is what turns occasional players into regular ones.

---

## Step 1 — Product understanding
| Question | Answer |
|---|---|
| What is Hobbook? | A free, map-first place to find and run casual community sport games (no club, no payment). |
| Who for? | Drop-in players looking for a game nearby, and informal organizers of open games. First KL, then MA and SB; football and basketball first. |
| Core job | "Get enough people to the same court at the same time, reliably." |
| Strongest today | Discovery (list ↔ map sync, clustering, near me), fast creation, a clear detail page, privacy-respecting identity, polish and motion. |
| Weakest today | Everything after joining: no reminders, no change/cancel delivery, no waitlist, no recurrence, no reason to come back. |
| What does the organizer still do outside Hobbook? | Everything that repeats weekly: re-posting, counting heads, chasing answers, weather calls, last-minute cancels. |
| What makes users come back? | Nothing in the product. Only their own memory. |
| Biggest risk to adoption | WhatsApp is "good enough". Hobbook must do what WhatsApp can't (count, decide, remind) and feed WhatsApp, not fight it. |
| Biggest risk to trust | No-shows and silent changes. |
| Differentiation | Free, local and public courts, open to strangers, privacy-first. Spond/TeamSnap are club and team tools; Meetup/Luma are generic; Playtomic is paid courts. |

## Step 2 — Journey friction (critical)
**Player (visitor → discover → understand → trust → join → attend → return)**
- Discover / understand: good.
- Trust: organizer facts exist, but nothing about attendance reliability. Participants are visible only after joining. Fine for privacy, but there is no social proof as counts by state.
- Join: good. The login resumes the join.
- **Attend: broken.** No reminder, no weather, no "game is on" signal. A change or cancel is silent.
- **Return: missing.** No next game, no follow, no "same time next week".

**Organizer (create → publish → find → manage → communicate → run → finish → again)**
- Create / publish: good (3 steps, defaults).
- Find participants: only the share sheet. No invite link with a rich preview, so the WhatsApp paste is a bare URL.
- **Manage / communicate: missing.** No messages, no way to nudge, no waitlist. When full, the button is disabled.
- **Run: missing.** No minimum players and no go/no-go. The weather call is a WhatsApp debate.
- **Organize again: rebuild from scratch every week.** The single biggest repeated cost.

Smaller gaps seen (fold in where cheap, otherwise leave):
- No onboarding for city and sports; the remembered place and the profile city are disconnected.
- A guest's "Merken" isn't resumed after login.
- My Events always opens on "Erstellt".
- `/karte` is unlinked.
- Capacity text comes in three formats.

## Step 3 — Research principles (from Spond, TeamSnap, Meetup, Luma, Partiful, Playtomic, Footy Addicts, CeleBreak, Strava, reminder studies)
1. **Make the default answer the true answer.** Spond auto-enrols weekly members, who only say "no".
2. **Ask early, set a deadline, nudge only non-responders.** Spond and TeamSnap both work this way, at 48h or 2 days.
3. **Answering must be one tap, with no login.** TeamSnap answers from the email, Partiful from the link.
4. **Be specific.** A concrete date + time raises follow-through (Milkman 2011, +4.2 pp).
5. **Decide go/no-go automatically against a minimum** (Playtomic auto-cancel, Footy Addicts minimums). One clear message replaces a debate.
6. **Auto-promote the waitlist.** Spond pushes a freed spot to the next person; manual approval (Luma) puts the work back on the organizer.
7. **Visible reliability with a dispute window** (Footy Addicts: 24h). It works through visibility, not punishment.
8. **Showing who's coming drives turnout** (Partiful, Luma).
9. **A stable weekly cue builds the habit** (Lally 2010: about 66 days median; a missed week doesn't break it).
10. **Failure modes to avoid:** notification floods across groups, relying on web push alone, unclear cancellation rules, and admin bottlenecks.

## Step 4 — Top 5 opportunities (ranked by Impact × User value × Differentiation × Feasibility, 1–5 each)
| # | Opportunity | Funnel stage | I | V | D | F | Score |
|---|---|---|---|---|---|---|---|
| 1 | **Stammspiel**: weekly series + one-tap attendance + auto go/no-go + delivered changes | attend → return, manage → again | 5 | 5 | 4 | 3 | **300** |
| 2 | **Delivery layer alone**: in-app bell + email for change, cancel and reminder on single events | attend | 4 | 4 | 2 | 4 | 128 |
| 3 | **Share/invite loop**: OG link previews, WhatsApp status text, waitlist with auto-promote | find → join | 4 | 3 | 3 | 4 | 144 |
| 4 | **Onboarding + personal home**: ask city and sports at signup, merge the remembered place, a "for you" feed | discover | 3 | 3 | 1 | 5 | 45 |
| 5 | **Trust & reliability**: public mini profiles, a reliability signal | trust | 4 | 4 | 3 | 2 | 96, but **blocked**: it needs attendance data that only #1 produces |

Per opportunity (short):
- **#1 Stammspiel.**
  - Problem: weekly re-organizing, chasing heads, no-shows, weather.
  - Change: Group + weekly occurrence + RSVP + deadline + decision + notifications.
  - User impact: the organizer saves about 30 min/week, players get certainty. Product impact: a weekly active loop that brings groups in whole (20+ users per organizer).
  - Complexity: high backend (jobs, email, tokens), medium UX.
  - Risk: WhatsApp inertia, email deliverability, free-tier cron.
- **#2 Delivery alone.** This is necessary plumbing but not a reason to come back. It becomes a sub-part of #1 (built once, used by both).
- **#3 Invite loop.** Cheap and high-leverage *as the entry into #1*. The OG preview and the WhatsApp text are folded into #1 phase 1; the waitlist goes into phase 2.
- **#4 Onboarding.** Useful but incremental. It doesn't change whether people come back. Only the "join via invite asks city and sports" bit is folded in.
- **#5 Trust.** It is the right *phase 3* of #1, built on real attendance facts instead of ratings.

## Step 5 — Choice and justification
**#1 Stammspiel**, absorbing #2, the core of #3, and preparing #5. It is the only option that:
- Creates a loop (weekly).
- Removes recurring work rather than one-time work.
- Brings whole groups in at once, which solves the cold start for KL through the user's own groups.
- Differentiates against WhatsApp: WhatsApp can't count, decide, remind only the non-responders, or promote from a waitlist.
- Makes trust measurable later.

**AI:** not needed for the core. Rules beat AI for counting, deadlines and weather thresholds: they are predictable and explainable. The one later candidate is turning a pasted WhatsApp group description ("Jeden Do 19 Uhr Basketball Uni-Platz") into a pre-filled Stammspiel form. Optional, phase 3+, only if creation proves to be a hurdle.

---

## Step 6 — Experience design

### Concepts (one word each, no new jargon)
- **Stammspiel**: the recurring game. It has members, a fixed weekday, time and place, a minimum and a maximum. Internally it is a `Group`.
- **Spieltermin**: one week's game. It is a normal `ConnectEvent` with `groupId`, so discovery, detail, `.ics`, share and report all keep working.
- **Antwort**: per member per Spieltermin, either **Dabei** or **Diesmal nicht** (no "vielleicht": it is what makes WhatsApp useless).
- **Status**: *Offen* (collecting) → *Findet statt* or *Fällt aus* (decided at the deadline, or earlier by the organizer).

### Organizer journey
1. **ENTRY**
   - The create form, step 1, gets a toggle **"Jede Woche wiederholen"**. No new flow: when on, step 1 shows the weekday instead of the date.
   - My Events / Home also show "Stammspiel anlegen" as a secondary entry.
2. **INPUT**, with progressive disclosure:
   - Shown by default: sport, weekday + time, place, max (all existing fields).
   - Two new fields, with defaults: **Mindestens** (min players, default ≈ 60% of max) and **Antworten bis** (deadline, default 3h before).
   - Under "Mehr Optionen":
     - **Antwortmodus**: "Alle fragen" (default) or "Alle sind dabei, außer sie sagen ab" (Spond-style, for a stable core).
     - Invite opens N days before (default 5).
     - Public or link-only.
3. **INTERACTION**
   - The live preview shows the *next* Spieltermin card and the sentence "Jeden Donnerstag, 19:00 · ab 8 Spielern findet's statt."
4. **SYSTEM RESPONSE**
   - Publish creates the Group + the next Spieltermin. The success screen is the **invite step** (new):
     - Invite link `/s/:code` with a rich preview.
     - **"In WhatsApp teilen"** (wa.me deep link with pre-written text).
     - "Link kopieren".
5. **DECISION**
   - The organizer posts the link in their existing WhatsApp group once. That is the last manual invite they ever do.
6. **ACTION**
   - Members tap the link → group page → "Beitreten" (login/register if needed, resumed afterwards). Then the first Antwort happens right there.
7. **FEEDBACK**
   - On the group page the organizer sees the roster filling: **Dabei n / Mindestens m / Max x**, plus "Noch keine Antwort: k".
   - **"Erinnern"**: one tap, which nudges only the non-responders (the system also does it automatically 24h before the deadline).
   - **"Status für WhatsApp kopieren"**: "Do 19:00 Basketball · 9/12 dabei · findet statt ✅ · <link>".
8. **SUCCESS**
   - At the deadline the system decides: ≥ min → **Findet statt** (all "Dabei" get the confirmation and a reminder 2h before); < min → **Fällt aus** (everyone is told, with the reason).
   - Weather: from phase 2, a severe forecast (Open-Meteo: thunderstorm, heavy rain) shows a warning to the organizer with a one-tap "Wegen Wetter absagen". It never cancels on its own.
   - The organizer can always decide early.
9. **NEXT STEP**
   - After the game, next week's Spieltermin opens automatically at the configured time. Members get the invite.
   - The organizer can "Diese Woche aussetzen" (skip) or edit the series. Edits apply to future dates only.

### Player journey
1. **ENTRY**: the invite link in WhatsApp (rich preview: sport, weekday, time, place, "9 von 12 dabei"), an email, the in-app bell, or the Home card.
2. **DISCOVERY**: the group page, or the Spieltermin detail. The hero card shows next date, status, roster counts with first names for members, weather (phase 2), and place + route.
3. **INTERACTION**: two big buttons, **Dabei** / **Diesmal nicht**. From email: the same two buttons as signed one-tap links, no login.
4. **SYSTEM RESPONSE**: instant. The roster updates, plus "Wir sagen dir Bescheid, ob's stattfindet (Do 16:00)." That sets a concrete expectation (implementation intention).
5. **DECISION**: if plans change → "Doch nicht" (one tap). Before the deadline it is free and silent. After the deadline the spot goes to the waitlist (phase 2) and the change is recorded as a late cancel, which is a fact for the later reliability signal.
6. **ACTION**: shows up. The 2h reminder carries the place, route link and weather.
7. **FEEDBACK**: after the game the organizer can mark no-shows within 24h (phase 3, with a dispute window). Players only see their own record.
8. **SUCCESS**: the weekly rhythm. **Home becomes "Deine Woche"**: the next Stammspiel with its answer state on top, then the rest.
9. **NEXT STEP**: next week's invite arrives by itself. A **public Stammspiel** also appears in Discover as "jeden Do 19:00", so strangers can join the series, not just one game. This is the growth path for the user's "strangers welcome" groups.

### Notification rules (anti-flood, from research)
- Only 4 automatic messages per Spieltermin:
  - the invite;
  - one nudge, to non-responders only;
  - the decision;
  - a reminder 2h before, to "Dabei" only.
- Changes and cancellations are always sent.
- Per-group mute. One email per event, never one per action.
- Channel: **in-app bell (always) + email (default on, per-group off)**. Web push is phase 3, never the only channel.

---

## Required answer sections

### 1) Recommendation
Build the **Stammspiel**: a recurring weekly game with membership, one-tap attendance (also from email), a deadline with an automatic go/no-go against a minimum, and delivered notifications. It is invited and shared through WhatsApp-native links.

### 2) Reasoning
- It is the only candidate that creates a weekly return loop. It removes the organizer's recurring work and fixes the documented pain (no-shows, weather, "who's in?").
- It onboards whole groups (cold-start solved locally) and differentiates on what chat apps can't do.
- It also produces the attendance data that trust needs later, so #2, #3 and #5 become parts or follow-ups of it.
- Ratings, chat and i18n would add surface without a loop.

### 3) Redesigned journey
See Step 6 (organizer 1–9, player 1–9).

### 4) UI/UX changes
- **Create form** (`pages/events/EventFormPage.tsx`):
  - Step 1 toggle "Jede Woche": weekday chips replace the day chips.
  - Step 3 gets *Mindestens* and *Antworten bis*. The Antwortmodus goes under "Mehr Optionen".
  - New invite step after publish (share via WhatsApp, copy link).
- **New group page** `/s/:code` (alias `/stammspiel/:id`): next-Spieltermin hero (status, answer buttons, roster counts and names for members, countdown to the deadline), upcoming dates, members, organizer tools (Erinnern, Status kopieren, aussetzen, bearbeiten, absagen).
- **Event detail**: for a Spieltermin, the action card shows the Antwort buttons instead of Mitmachen/Austreten, plus the status ribbon and a link to the Stammspiel.
- **Home** (`pages/main/HomePage.tsx`): "Deine Woche" on top, a Stammspiel card with an inline answer.
- **Navbar**: a bell with an unread dot, and a `/benachrichtigungen` list (simple: grouped by day, tap → target).
- **My Events**: "Stammspiele" section on top. Default tab = the first non-empty tab (small fix).
- **Profile**: Benachrichtigungen (email on/off, per-group mute).
- **Discover**: public Stammspiele get a "jeden Do" badge on cards and pins.
- **Unify capacity wording** in one helper: "9 von 12 dabei".
- **Email**: a plain, accessible HTML template with two big buttons and an unsubscribe/mute link.
- **Remove or avoid**: no "vielleicht"; no separate group "feed"; no second create flow.

### 5) Backend changes
- **`Group` model**:
  - `name, sport, organizerId, coHosts[], location (+point), weekday, startTime ("19:00"), durationMin, timeZone, maxParticipants, minPlayers, deadlineHours, openDaysBefore, rsvpMode ('ask'|'autoIn'), visibility, inviteCode (unique, random), members[{userId, joinedAt, muted}], skipDates[], active`.
- **`ConnectEvent`, extended**:
  - `groupId?, occurrenceKey (groupId+local date, unique → idempotent generation), minPlayers?, deadlineAt?, decision ('open'|'on'|'off'), decidedAt, responses[{userId, answer:'in'|'out', at, late:boolean}]`, and job flags `invitedAt, nudgedAt, remindedAt`.
  - Participants stay the source of truth for "in", via the existing atomic join/leave pipelines. `responses` adds the explicit "out".
- **`Notification` model**: `userId, type, eventId?, groupId?, data, readAt, emailStatus`, with a TTL index (about 60 days).
- **Routes**:
  - Groups: `POST /api/groups`, `GET /api/groups/:idOrCode`, `PATCH`, `POST /:id/join|leave|skip|remind`.
  - Answers: `POST /api/events/:id/answer`.
  - Notifications: `GET /api/notifications`, `POST /api/notifications/read`.
  - `GET /api/r/:token` for signed one-tap answers.
- **One-tap tokens**: stateless HMAC (userId, eventId, answer, exp ≤ deadline). They are idempotent, and the token is never logged. The token page confirms visibly ("Du bist dabei ✓ — Rückgängig").
- **Jobs**: `POST /api/jobs/run` (secret header), idempotent steps. Each step is guarded by flags, so running it twice is harmless. The steps:
  - generate the next occurrence;
  - send invites;
  - nudge non-responders 24h before the deadline;
  - decide at the deadline;
  - remind 2h before;
  - (phase 2) the weather check.
- **Trigger**: cron-job.org every 15 min (free). Hourly GitHub Actions as a fallback (the private-repo minutes budget doesn't allow every 15 min). Render free wakes on request.
- **Email**: a free transactional provider (Brevo free, about 300/day, single-sender verification; verify the terms at implementation). It sits behind a `mailer` interface with a console driver for dev and tests.
- **Weather (phase 2)**: Open-Meteo hourly forecast for the event's point and time, cached on the event, with no key.
- **OG previews**: Cloudflare Pages Function for `/s/:code` and `/events/:id`, which fetches public summary fields only.
- **Privacy**: the roster serializer reuses the existing "Vorname N." rule. Non-members see counts only. Update the privacy page (emails, notifications, retention).
- **Tests**:
  - Vitest/Supertest per route and per job step, with a fake clock for DST across weeks in Europe/Berlin and for idempotency.
  - The token's expiry and tamper checks.
  - E2E: create Stammspiel → join via code → answer → run jobs → decision visible.

### 6) Motion opportunities (all state, never decoration; existing tokens; reduced motion = fades)
- **Answering "Dabei"**: your avatar chip moves (FLIP, `--dur-4`, `--ease-spring`) from "Keine Antwort" into the "Dabei" row. The count ticks and the meter fills toward the min marker. That *is* the confirmation.
- **Reaching the minimum**: the min marker on the meter fills once with `--scale-pop`. It means "it's on" before the official decision.
- **Decision change**: the status ribbon morphs Offen → Findet statt (lime fill sweeps in) or Fällt aus (desaturates). One time only; no looping.
- **Waitlist promotion** (phase 2): the promoted person slides from the waitlist row up into the roster. The waitlisted person's own view shows "Du bist nachgerückt" with the spring.
- **Week rollover**: on the group page the past Spieltermin slides left and the new one enters from the right (time flows left to right). It shows spatially that "this is the next week".
- **Bell**: the dot appears with a fade/scale (`--dur-3`), with no shake.
- **Email token page**: a check draws (stroke) once.

### 7) Phases
- **Phase 0 — Prerequisites (about 2 days):**
  - Deploy (B-01: Pages + Render + Atlas, secrets rotated).
  - Mailer interface + provider.
  - The jobs endpoint + cron.
  - Without a public URL the loop can't run.
- **Phase 1 — "Das Stammspiel" MVP (about 1.5–2 weeks), the core loop, piloted with the user's two groups:**
  - Group model, weekly generation, invite link + join.
  - Answers (app + email tokens), deadline + auto decision against the min.
  - In-app bell + email for invite, nudge, decision, reminder, change and cancel.
  - Group page, Home "Deine Woche", the create toggle + invite step.
  - OG previews + WhatsApp text.
  - Change/cancel delivery also for single events (free win).
- **Phase 2 — Fewer no-shows (about 1 week):**
  - Waitlist with auto-promote (single events too; this replaces the disabled "voll" button).
  - Weather on the event + the organizer weather warning with one-tap cancel.
  - Skip a week, co-hosts, per-group mute.
  - Public Stammspiele in Discover.
- **Phase 3 — Trust from facts (after about 6 pilot weeks):**
  - No-show marking within 24h with a dispute window.
  - Own attendance history, then a minimal public profile with a reliability signal shown only after ≥3 games (B-10/B-12 re-scoped).
  - PWA push as an extra channel.
  - Then decide on i18n.

### 8) Risks
| Risk | Mitigation |
|---|---|
| WhatsApp inertia: the group keeps answering in the chat | Feed WhatsApp, don't fight it: invite via wa.me, "Status kopieren", one-tap from email. Pilot with the user's own groups first and measure. |
| Email lands in spam or isn't read | Plain transactional templates, a verified sender, few mails. The bell is always the backup. Measure the answer rate per channel. |
| Free cron/hosting is unreliable (Render sleep, missed ticks) | Idempotent catch-up jobs (each run processes everything overdue). Two triggers. Decisions never depend on one exact tick. |
| Auto-in mode inflates numbers | The default is "Alle fragen". Auto-in is opt-in for the organizer, with a visible note on the group page. |
| Notification fatigue | 4-message cap per Spieltermin, non-responder-only nudges, per-group mute. |
| DST/time zone bugs in weekly generation | Store the local weekday + time + tz and compute each occurrence in the tz. Tests across the March and October changes. |
| Privacy / legal (more personal data: email use, attendance) | Members-only rosters, data minimization, a TTL on notifications, an updated privacy page. Transactional emails only, with an opt-out. |
| Scope creep into chat/posts | Explicitly out (see 10). Chat stays in WhatsApp. |
| Solo-dev capacity | Phase 1 is the smallest loop. Each phase ships alone and is piloted before the next. |

### 9) Success criteria (measured in the pilot, via a small admin metrics view — the light version of B-15)
- **Organizer effort:** creating a Stammspiel < 2 min; 0 manual "wer kommt?" messages needed after week 2 (asked of the organizer).
- **Answer rate:** ≥ 80% of members answer before the deadline by week 4; median answer time < 12h after the invite.
- **Retention:** ≥ 60% of members active (answered) in 6 of 8 weeks; ≥ 1 new Stammspiel created by someone other than the user within 8 weeks of launch.
- **Reliability:** answered-"Dabei"-but-absent (organizer estimate, then marked in phase 3) < 10%; games cancelled for low numbers are announced ≥ 3h before.
- **Quality:** 0 duplicate occurrences or double emails (job idempotency); answer → UI update < 300 ms perceived; all new UI passes axe and contrast.

### 10) What NOT to build yet
- **Chat, group posts and comments** (B-16, B-18): WhatsApp already does this; building it competes where we lose.
- **A trust score out of 10 / ratings / reviews**: not without attendance facts. Phase 3 shows reliability facts only.
- **i18n** (B-13): the pilot is German-speaking; decide after phase 3.
- **Web push as the main channel**: unreliable on mobile web; phase 3, as an extra.
- **AI features**: no clear friction they'd remove now. Later candidate: free text → Stammspiel form.
- **Biweekly/monthly recurrence, availability polls, "vielleicht"**: weekly only; two answers only.
- **Payments, court booking, SMS, native apps, team balancing.**
- **More discovery polish**: discovery already works. The gap is after joining.

## Critical files (implementation)
- **Backend:**
  - `backend/models/{Group,Notification}.js` (new); `ConnectEvent` extended.
  - Routes: `routes/{groups,notifications,jobs,tokens}.js`.
  - `services/{mailer,recurrence,decision,weather}.js`.
  - The event serializer (roster privacy).
  - Tests in `backend/tests/*`.
- **Frontend:**
  - Changed pages: `pages/events/EventFormPage.tsx` (toggle, invite step), `EventDetailPage.tsx` (answer card), `pages/main/HomePage.tsx` ("Deine Woche"), `pages/events/MyEventsPage.tsx`, `pages/main/ProfilePage.tsx` (notification settings).
  - New pages: `pages/groups/GroupPage.tsx`, `pages/notifications/NotificationsPage.tsx`.
  - `components/layout/Navbar.tsx` (bell), `api/{groupApi,notificationApi}.ts`, `utils/format.ts` (one capacity helper).
  - Motion via the existing `styles/motion.css` + `utils/motion.ts` (FLIP helper).
- **Edge and ops:** `functions/` OG preview (Cloudflare Pages Function); docs `docs/product/IMPROVEMENT_PLAN.md` (re-sequence the backlog: B-06+B-05+B-08 become phase 1).

## Verification
- Backend Vitest/Supertest with a fake clock: weekly generation across DST, idempotent job runs, the deadline decision at min−1 / min, token tamper and expiry, privacy of rosters for non-members.
- Frontend Vitest: the answer buttons' state, the group page states (offen, findet statt, fällt aus, empty, error), the bell's unread state.
- Playwright (Edge): organizer creates a Stammspiel → a second user joins via `/s/:code` → answers → `POST /api/jobs/run` → both see "Findet statt"; the email token page answers without login (console mailer captures the link).
- Built-in browser at 390 / 1440, light and dark, with reduced motion; axe; `check:contrast`.
- The pilot: run phase 1 with the user's two real groups for 4 weeks and track the success criteria above.
