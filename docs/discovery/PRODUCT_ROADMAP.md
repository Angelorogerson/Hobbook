# Product Roadmap

> Date: 2026-11-16 · Scoring is qualitative: **value** = user value × severity × frequency × strategic fit × confidence; **cost** = development + operational complexity + risk. No timelines are given; sequencing depends on team capacity (UNKNOWN).
> IDs: stories US-xx ([USER_STORY_MAP](USER_STORY_MAP.md)), features F-xx ([FEATURE_DECISIONS](FEATURE_DECISIONS.md)), engineering E-xx ([ENGINEERING_PREREQUISITES](ENGINEERING_PREREQUISITES.md)), assumptions A-xx ([ASSUMPTIONS_TO_VALIDATE](ASSUMPTIONS_TO_VALIDATE.md)).

## Phase 0 — Validate before building (parallel to Foundation)

Run before or alongside Foundation; results can change MVP scope.
- A-01 organizer concierge test (5 organizers × 4 weeks, using a spreadsheet or the current app).
- A-04 niche and city interviews (15–20 players and organizers; JUGAD coverage check in the launch city).
- Choose **one launch city × one sport (or sport + format)**.

## FOUNDATION (must be true before any user sees it)

| Item | Value | Cost | Why now |
|---|---|---|---|
| E-00 Rotate leaked credentials; scrub README and history | Critical | Low | Security blocker |
| E-01 Restore green TypeScript build | High | Low–Med | Nothing ships otherwise |
| E-02 Reconcile API contracts (password, envelopes) | High | Low | Broken flows |
| E-03 Atomic join/capacity (+ booking if kept) | High | Low–Med | Core integrity |
| E-07 Security baseline (CORS allowlist, rate limits, secret check, safe errors) | High | Low | Public launch |
| E-08 Legal basics (Impressum, Datenschutz, account deletion) | High | Low–Med | Required in Germany |
| US-15 Remove fake ratings, user counts, dead links; fix € | High | Low | Trust + legal risk |
| E-13 Hide booking + admin booking behind a flag | Med | Low | Stop false promises |
| F-23 About → footer; nav reduced to goal-based items | Med | Low | Focus |
| E-09 Test harness + first integration tests; E-10 CI | High | Med | Safe change |

## MVP — "Your game, every week" (one city, one sport focus)

Goal: prove that organizers keep using Hobbook for a recurring game for 4+ weeks and that games happen more reliably.

| Story | Value | Cost |
|---|---|---|
| US-03 Recurring game (F-02) | Very high | Med |
| US-01 Public game page + US-05 share preview (F-12) | Very high | Med |
| US-02 Join/leave + waitlist (F-04) | High | Low–Med |
| US-04 Min players + go/no-go (F-03) | High | Med |
| US-06 Email reminders + .ics (F-07) | High | Med |
| US-07 Local game list with city filter | High | Low |
| US-08 Place directory (Venue → Place) | Med–High | Med |
| US-11 Edit/cancel by organizer | High | Low |
| US-12 Follow series (F-08 merge) | High | Low |
| US-10 Report/remove | Med (High when needed) | Low |
| US-14 Password reset, US-13 GDPR | Med | Low |
| F-14 Format tags | Med–High | Low |

**MVP success signals (to measure, targets to set after Phase 0):** % of series alive after 4 weeks · % of games reaching min by the decision time · share of RSVPs via shared links · organizer-reported time saved (survey).

## V1 — Reliability and growth

| Item | Value | Cost |
|---|---|---|
| US-09 Attendance → reliability (F-06) | High | Med |
| US-18 Priority invites for regulars; US-19 open-spot nudge | High | Low–Med |
| US-17 Cost per head + paid tracker (F-05a) | Med | Low |
| US-16 Co-organizers | Med | Low |
| US-24 Magic-link login | Med | Low–Med |
| US-20 Distance filter; US-21 game alerts; US-22 weekly digest | Med | Med |
| US-23 Place suggestions/corrections | Med | Low |
| PWA + web push | Med | Med |
| Admin: health metrics replace "revenue" | Med | Low |
| Second city or second sport (based on data) | High | Ops |

## V2 — Extensions (only with evidence)

- Partner hall slots: "book and fill" at a partner soccer hall (F-01/F-16, after A-07).
- Map view (F-15).
- No-show disputes (US-25).
- In-app payments if F-05a usage and A-06 support it (F-05).

## EXPERIMENTS

| Experiment | Hypothesis | Signal |
|---|---|---|
| Guest RSVP (F-21) | Removes signup drop-off on shared links | Link→RSVP conversion up without more no-shows |
| FLINTA*/beginner-first launch (F-14 + A-04) | An underserved niche gives liquidity faster than general pickup | Fill rate and repeat rate vs. general games |
| Concierge partner hall | Halls fill off-peak courts via Hobbook games | ≥1 hall shares slots; games fill |
| Prepayment for hall games | Reduces no-shows | Show-up rate vs. unpaid games |

## NOT NOW
Tournaments/leagues (F-17) · more sports (F-18) · native apps (F-19) · team auto-balancing (F-20) · municipal hall application helper (F-22) · hosted/curated games run by Hobbook staff (strong pattern, but an operations business; revisit if self-organised liquidity fails).

## REJECTED
In-app chat (F-09) · ELO level system (F-10) · admin pre-approval (F-11) · fake or unmoderated ratings (F-13) · hourly booking of public courts (impossible; courts are not bookable).
