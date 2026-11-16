> **Superseded (2026-11-16):** The product owner chose a different first product: a free, city-independent community sports-event platform with list + 3D-capable map discovery. See [../product/FREE_SPORTS_EVENTS_USER_STORY.md](../product/FREE_SPORTS_EVENTS_USER_STORY.md). This document remains as discovery background; recurring games, waitlists and cost tracking described here are **not** in the current scope.

# Final Product Spec — Hobbook

> Date: 2026-11-16 · This spec summarises the discovery in [`docs/discovery/`](.). Labels: VERIFIED PROJECT FACT · EXTERNAL EVIDENCE · REASONED INFERENCE · PRODUCT HYPOTHESIS · RECOMMENDATION · UNKNOWN.
> No user interviews have been done. The direction below is evidence-informed, but it **depends on validation** ([ASSUMPTIONS_TO_VALIDATE.md](ASSUMPTIONS_TO_VALIDATE.md)).

## Product statement (RECOMMENDATION)

**Hobbook makes your regular game happen — every week.**
A recurring game with a link you post into your WhatsApp group: players tap in or out, the game fills (with a waitlist), confirms or cancels itself at a set time, reminds everyone, and opens next week's game automatically. Open spots can be shown to new players nearby.

Hobbook stops trying to be a venue booking marketplace. Places become information that games attach to.

---

## Top user problems
1. **Informal players don't manage to play regularly.** Only ~20% of self-organised footballers in Germany play regularly vs. ~80% in clubs, and 72% of active adults do sport only self-organised (EXTERNAL EVIDENCE, BISp 2019, STRONG). → P-01, P-09
2. **No-shows and late dropouts cancel or unbalance games** (EXTERNAL EVIDENCE, MODERATE). → P-02
3. **One organizer carries the coordination and the cost risk** (EXTERNAL EVIDENCE, MODERATE). → P-03, P-06
4. **Places are hard:** free courts can't be booked and have rules, halls are club-first and scarce, commercial halls cost €50–80/h in big cities, and the research found no commercial basketball rental (EXTERNAL EVIDENCE, STRONG). → P-05, P-10
5. **Newcomers can't see what games exist** (MODERATE). → P-04
6. **Some players feel unwelcome:** women/FLINTA*, beginners, older players (MODERATE–STRONG). → P-07

## Key pain points
Chasing "who's coming?" every week · deciding when to cancel · last-minute dropouts · paying for no-shows · phone numbers shared with strangers in WhatsApp groups · discovery split across Facebook, Meetup, Telegram and apps · not knowing the level or vibe of a game · groups slowly dying.

## Key opportunities
- **The recurring game as the product's core object.** It serves both organizers (players) and drop-ins (a reliable game).
- **Work with WhatsApp, not against it:** a public link with a rich preview replaces the poll.
- **Threshold + waitlist + auto go/no-go:** what WhatsApp Events lack (no cap, waitlist or threshold).
- **Factual trust signals** (series age, average turnout, show-up rate) instead of fake ratings.
- **A niche wedge** (city × sport × format, e.g. basketball and/or FLINTA*/beginner formats), where JUGAD and CeleBreak are weaker (HYPOTHESIS, A-04).

## Existing features to keep
- Connect event core: capacity, join/leave, skill level, creator rules (VERIFIED) → evolves into Game.
- Backend structure, server-side admin/ownership checks, bcrypt auth.
- Visual identity and German copy; reusable UI components (LoadingSpinner, EmptyState, ErrorMessage).
- `isPublic` on events (→ link-only vs. public).

## Features to improve
- Connect list → public, local (city filter), server-side filters, honest empty state.
- Event creation → recurring, min players, decision time, place picker, format tags.
- Profile → use city/sports for defaults; fix password change; drop phone; add account deletion.
- Auth → password reset; magic link in V1.
- Admin → reports queue; health metrics instead of "revenue".

## Features to merge
- **Venue + ConnectEvent location → Place ↔ Game relation.** One concept of "where", and a place page shows "who plays here and when".
- **Two favorites stores → one "follow"** (series, optionally place).
- **Booking cost → cost per head on the game** (V1), not a separate booking flow.

## Missing core features
Recurring series · public game page + share preview · waitlist with auto-promotion · min players + go/no-go · email reminders + calendar · organizer edit/cancel · follow series · report/remove · format tags · GDPR basics (Impressum, Datenschutz, deletion) · password reset.

## Features not to build
In-app chat · ELO/level rating · admin pre-approval of games · venue reviews · in-app hourly booking (for now) · in-app payments (for now) · native apps · tournaments/leagues · more sports · team auto-balancing · municipal hall application helper. See [FEATURE_DECISIONS.md](FEATURE_DECISIONS.md).

## Optimized core product loop

```
NEED      Organizer: "Mittwoch – wer ist dabei?"   ·  Drop-in: "Ich will diese Woche spielen"
DISCOVER  Link in WhatsApp group                   ·  Public local list / place page
DECIDE    Public game page: who's in, spots, level, place, status
ACT       "Ich bin dabei" → spot or waitlist → calendar + reminder
SUCCESS   Auto go/no-go at decision time → game happens with enough players
RETURN    Next week's game opens automatically for followers → same link, same group
          (V1: attendance → reliability → priority for regulars)
```

The loop repeats weekly without the organizer doing anything, and that repetition is the retention mechanism.

## Top user stories
1. US-03 Create a recurring game (ORG)
2. US-01 Public game page (DROP, group members)
3. US-05 Share to WhatsApp with preview (ORG)
4. US-02 Join/leave with waitlist (all)
5. US-04 Min players + go/no-go (ORG + all)
6. US-06 Reminders + calendar (all)
7. US-07 Local game list (DROP/UND)
8. US-12 Follow a series (all)
9. US-08 Place directory with honest info (ORG)
10. US-10 Report/remove (all)

Details: [USER_STORY_MAP.md](USER_STORY_MAP.md).

## MVP
**Scope:** one launch city, one primary sport (or sport + format), chosen after Phase 0 interviews.
**Includes:** Foundation (E-00 secrets, E-01 build, E-02 contracts, E-03 atomic capacity, E-07 security, E-08 legal, fake-content removal, booking hidden) + US-01, 02, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13, 14, 15 + format tags.
**Excludes:** booking, payments, reliability scores, map, push, co-organizers.
**Proves:** organizers keep using it for 4+ weeks; more games reach minimum; shared links bring RSVPs.

## V1
Attendance → reliability (US-09) · priority invites for regulars (US-18) · open-spot nudge (US-19) · cost per head + paid tracker (US-17) · co-organizers (US-16) · magic link (US-24) · distance filter, alerts, weekly digest · place corrections · PWA + push · admin health metrics · expand to a second city or sport if the data supports it.

## Later extensions
Partner-hall "book and fill" (V2 experiment) · in-app payments (if validated) · map view · no-show disputes · hosted games (operations-heavy; only if self-organised liquidity fails) · more sports.

## Technical prerequisites
In order: **rotate leaked credentials** → green build → API contracts → atomic join + waitlist → security and legal baseline → tests + CI → data model evolution (Place, Game, Series, Report; favorites merge) → public read API + optional auth → scheduler + transactional email → server-rendered share meta → EU hosting, backups, monitoring. Self-host fonts (GDPR). Details: [ENGINEERING_PREREQUISITES.md](ENGINEERING_PREREQUISITES.md).

## Biggest product risks
1. **Competition:** JUGAD already offers free pickup football in many German cities with chat, invite links, recurring games, a reliability score and prepayment (EXTERNAL EVIDENCE). Hobbook has no clear edge unless the niche (A-04) or the "WhatsApp-native recurring game" angle proves stronger.
2. **Cold start and liquidity:** pickup marketplaces struggle outside dense cities (Footy Addicts reviews; gofuba apparently in liquidation; Hoop Maps pivoted). Mitigation: organizer-first (bring your own group), one city.
3. **Habit:** WhatsApp is free and already there; "good enough" may beat "better" (A-01).
4. **Trust and safety** with strangers; liability questions (legal review).
5. **Business model unknown** (A-09). Free tools in this space live on ads, sponsorship or hosted games.
6. **Execution:** the current codebase has broken builds, race conditions and leaked secrets; launching before Foundation would damage trust.

## Open assumptions
A-01 organizers switch from polls · A-02 members sign up via a link · A-03 threshold + waitlist increase reliability · A-04 a winnable niche exists · A-05 reliability scores help · A-06 payments are wanted · A-07 halls would partner · A-09 a business model exists · A-11 place data can be seeded · A-13 format tags work. Plus unknowns: launch city, team capacity, legal review, German no-show data, German user voice (Reddit/forums not reachable in this research).

---

## The critical question

> **If we remove everything unnecessary: what is the smallest, most focused and most compelling version of this application, one that solves a real problem well enough that users have a reason to come back?**

**A recurring-game link for an organizer's existing group.**

The organizer creates "Mittwochskick, 19:00, [place], 10 Plätze, mindestens 8, Entscheidung Dienstag 19:00" once and posts the link into the group's WhatsApp. Players tap *Ich bin dabei*. When it's full, new players go on a waitlist and move up automatically. On Tuesday at 19:00 the game confirms or cancels itself and everyone gets an email with a calendar entry. On Thursday next week's game opens and everyone who played gets the link again.

That's it: no booking, no payments, no ratings, no chat, no map, no favorites, no About page in the nav. One city, one sport.

**Why users come back:** the game happens every week, and Hobbook is where it happens. The return is built into the object itself, not into notifications or gamification.

**Why it's compelling:** it removes the most frequent recurring pain (chasing people and deciding whether to cancel) for the person who brings everyone else along. It also targets the gap the strongest German evidence points to: informal players who want to play but don't manage to play *regularly*.

**What must be true** (validate before building more than Foundation): organizers actually switch from the poll (A-01), and a city × sport × format exists where Hobbook isn't just a weaker JUGAD (A-04). If either fails, the honest options are to narrow further (e.g. a FLINTA*/beginner basketball focus) or to treat Hobbook as a portfolio project rather than a venture.
