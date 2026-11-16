# Problem Map

> Date: 2026-11-16 · Sources and details: [USER_PROBLEM_RESEARCH.md](USER_PROBLEM_RESEARCH.md), [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md), [PRODUCT_AUDIT.md](PRODUCT_AUDIT.md).
> Evidence: STRONG · MODERATE · WEAK · HYPOTHESIS · UNKNOWN. Frequency and impact are qualitative (High/Med/Low); they are judgments, not measurements.
> Personas: **ORG** = organizer of a recurring informal game · **DROP** = drop-in player without a group · **UND** = underserved players (women/FLINTA*, beginners, 35+) · see [PERSONAS_JTBD.md](PERSONAS_JTBD.md).

## Priority overview

| Rank | ID | Problem | Freq. | Impact | Evidence | Hobbook today |
|---:|---|---|---|---|---|---|
| 1 | **P-01** | Can't assemble enough committed players to play regularly | High | High | STRONG (structural) / MODERATE (cause) | Partial: Connect events with capacity |
| 2 | **P-02** | No-shows and late dropouts → cancelled or uneven games | High | High | MODERATE | None |
| 3 | **P-03** | Organizer carries the coordination load (RSVPs, go/no-go, reminders) | High | Med–High | MODERATE | Minimal: create event only |
| 4 | **P-09** | Informal groups fade; play stays irregular | High | High | STRONG (outcome) / WEAK (causes) | None |
| 5 | **P-04** | Newcomers can't see which games exist (discovery fragmented) | Med | High for DROP | MODERATE | Partial: list, but login wall and no locality |
| 6 | **P-06** | Cost risk and money collection for paid pitches | Med | Med | MODERATE | Misleading: booking with fake payment states |
| 7 | **P-05** | Access to places: halls club-first, few bookable options, basketball almost none | High | Med | STRONG | Misfit: hourly booking of admin-entered venues |
| 8 | **P-07** | Feeling unwelcome or mismatched (gender, level, age) | Med | High for UND | MODERATE–STRONG | Partial: skill level field |
| 9 | **P-10** | Finding free courts and their rules (hours, adults allowed, surface, light) | Med | Low–Med | MODERATE | Partial: venue directory with wrong model |
| 10 | **P-08** | Trust and safety with strangers | Low–Med | High when it occurs | MODERATE | None |

## Detail

### P-01 — Can't assemble enough committed players
- **Who:** ORG, DROP.
- **Today's workaround:** a WhatsApp group of 20–40 people plus a poll, Meetup, asking friends, paid hosted games (CeleBreak).
- **Evidence:** Only ~20% of self-organised footballers play regularly vs. ~80% of club players (BISp 2019, STRONG). Expat threads (WEAK–MODERATE). A pool of 20–25 is needed for 10 (vendor, WEAK).
- **Existing in project:** `ConnectEvent` with `maxParticipants`, join/leave, skill level.
- **Gap:** no group or series, no "minimum needed", no invite or share, no waitlist, no reminder. Events are one-off and anonymous.
- **Opportunity:** a recurring game with a known pool, a minimum threshold and visible "8/10 in".

### P-02 — No-shows and late dropouts
- **Who:** ORG mainly; DROP experiences cancelled games.
- **Workaround:** group rules (fines, bans, in-person vetting), prepayment (Footy Addicts, JUGAD, CeleBreak), over-inviting.
- **Evidence:** Meetup rules, platform cancellation policies, Trustpilot (MODERATE). No German frequency data (UNKNOWN).
- **Existing:** leave is allowed anytime, with no cutoff or notification.
- **Gap:** no dropout cutoff, waitlist promotion, attendance record or reliability signal.
- **Opportunity:** waitlist with auto-promotion; a late-dropout marker; organizer-recorded attendance → show-up rate.

### P-03 — Organizer burden
- **Who:** ORG.
- **Workaround:** WhatsApp polls/Events, Spond, SpielerPlus, manual lists.
- **Evidence:** organizer concerns (WEAK–MODERATE); German GDPR concern about WhatsApp groups (MODERATE); JUGAD reviews praise leaving WhatsApp (WEAK–MODERATE).
- **Existing:** create event. The creator can't edit, can't add co-organizers and can't message participants.
- **Gap:** recurrence, edit/cancel with notifications, a go/no-go deadline, co-organizers.
- **Opportunity:** "set up once, runs every week" with automatic reminders and go/no-go.

### P-09 — Groups fade, play stays irregular
- **Who:** ORG, DROP.
- **Evidence:** the exit from self-organised sport with age (BISp, STRONG); anecdotes of dissolved groups (WEAK).
- **Existing:** none.
- **Gap:** no persistent group or series entity, no return trigger.
- **Opportunity:** the series is the retention mechanism. Next week's game opens automatically for last week's players.

### P-04 — Fragmented discovery for newcomers
- **Who:** DROP (expats, students, people who moved).
- **Workaround:** Facebook groups, Meetup, JUGAD, word of mouth.
- **Evidence:** Berlin fragmentation and expat threads (MODERATE).
- **Existing:** Connect list. It requires login, has no city filter in the UI and no detail page.
- **Gap:** public, local, filterable listing; detail page with who and what level.
- **Opportunity:** public game pages that are indexable and shareable, with open spots in existing groups' games offered to newcomers.

### P-06 — Cost risk and money
- **Who:** ORG of paid-hall games.
- **Workaround:** PayPal Friends & Family, Splitwise, cash; the organizer pre-pays and absorbs no-shows.
- **Evidence:** hall terms (48h, full fee; STRONG); vendor claims on cost splitting (WEAK).
- **Existing:** booking `totalPrice` and a `paymentStatus` label, unrelated to games.
- **Gap:** cost per head on the game and a "who has paid" tracker.
- **Opportunity (MVP-small):** show cost per head; the organizer ticks "paid". Real payments are an EXPERIMENT ([FEATURE_DECISIONS](FEATURE_DECISIONS.md) F-05).

### P-05 — Access to places
- **Who:** ORG, especially basketball and winter football.
- **Workaround:** free courts, club membership, commercial soccer halls, university sport, municipal programmes.
- **Evidence:** municipal allocation rules, KfW/Difu, Berlin closures (STRONG). Commercial basketball rental not found.
- **Existing:** admin-entered venues with hourly price and in-app booking that the venue never sees.
- **Gap:** Hobbook can't create supply. In-app booking implies a contract that doesn't exist.
- **Opportunity:** a **place directory** (free court / commercial hall / university / municipal) with honest access info and an external booking link. Games attach to places. Partner booking is V2.

### P-07 — Unwelcome or mismatched games
- **Who:** UND.
- **Workaround:** dedicated groups (FLINTA*-only sessions, beginner Meetups, Walking Football).
- **Evidence:** taz 2026 Berlin (MODERATE–STRONG), Zou & Scott 2018 (STRONG, US), Footy Addicts reviews (MODERATE).
- **Existing:** skill level (beginner/intermediate/advanced/all).
- **Gap:** no format tags (women/FLINTA*-only, beginner-friendly, 35+), no host intro, no code of conduct.
- **Opportunity:** format tags plus organizer-defined "who this game is for". Hypothesis: a niche wedge (see A-04).

### P-10 — Finding free courts and their rules
- **Who:** DROP, ORG (basketball especially).
- **Workaround:** Courts of the World, city maps, JUGAD map.
- **Evidence:** bylaws and fragmented directories (STRONG/MODERATE).
- **Existing:** venue directory without type, rules or free-access concept.
- **Gap:** place type, hours rule, adults allowed, surface, lighting, indoor/outdoor.
- **Opportunity:** a lightweight place model inside the game flow, not a standalone map product (Courts of the World already exists).

### P-08 — Trust and safety with strangers
- **Who:** DROP, UND, ORG.
- **Workaround:** organizer vetting, in-person introduction, bans.
- **Evidence:** Trustpilot reviews, Meetup rules (MODERATE).
- **Existing:** none (admin can delete events).
- **Gap:** report, organizer remove-player, basic profile, no phone-number exposure.
- **Opportunity:** report and remove in MVP; reliability (show-up rate) in V1.

## Product-internal problems (not user problems, but block solving them)

| ID | Problem | Evidence |
|---|---|---|
| X-01 | Credentials in README; fake ratings and user counts | VERIFIED ([PRODUCT_AUDIT](PRODUCT_AUDIT.md) §5) |
| X-02 | Login wall prevents sharing and acquisition | VERIFIED (`App.tsx`) |
| X-03 | Two disconnected product pillars | VERIFIED |
| X-04 | Build broken, race conditions, API mismatches | VERIFIED ([PROJECT_SYSTEM_CONTEXT](../../PROJECT_SYSTEM_CONTEXT.md)) |
