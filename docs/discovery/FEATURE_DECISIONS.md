# Feature Decisions (anti-bloat check)

> Date: 2026-11-16 · Each candidate gets the 10 questions: (1) problem · (2) who · (3) evidence · (4) today's solution · (5) does Hobbook partly solve it · (6) improve an existing feature? · (7) smallest solution · (8) improves the core loop? · (9) new complexity · (10) needed now?
> Core loop reference: *create recurring game → share → commit → go/no-go → play → next week* ([FINAL_PRODUCT_SPEC.md](FINAL_PRODUCT_SPEC.md)).

## Summary

| ID | Feature | Decision | Phase |
|---|---|---|---|
| F-01 | In-app hourly venue booking | **DEFER** (hide; keep code) | V2 experiment |
| F-02 | Recurring games (series) | **ADD** | MVP |
| F-03 | Min players + go/no-go | **ADD** | MVP |
| F-04 | Waitlist with auto-promotion | **ADD** | MVP |
| F-05 | In-app payments / split pay | **EXPERIMENT** | after V1 |
| F-05a | Cost per head + manual paid tracker | **ADD** | V1 |
| F-06 | Attendance → reliability | **ADD** | V1 |
| F-07 | Email reminders (push later) | **ADD** | MVP (push V1) |
| F-08 | Favorites → follow series/place | **MERGE** | MVP |
| F-09 | In-app chat | **REJECT** | — |
| F-10 | Level rating system (ELO-like) | **REJECT** | — |
| F-11 | Admin pre-approval of events | **REJECT** (reporting instead) | — |
| F-12 | Public pages + share previews | **ADD** | MVP |
| F-13 | Venue ratings & reviews | **REMOVE fake; REJECT real for now** | NOT NOW |
| F-14 | Format tags (women/FLINTA*-only, beginner, 35+) | **ADD** | MVP |
| F-15 | Map view | **DEFER** | V1/V2 |
| F-16 | Venue operator portal | **DEFER** | V2 |
| F-17 | Tournaments / leagues | **NOT NOW** | — |
| F-18 | More sports | **NOT NOW** | — |
| F-19 | Native apps | **NOT NOW** (responsive web; PWA in V1) | — |
| F-20 | Team auto-balancing | **NOT NOW** | — |
| F-21 | Guest RSVP without account | **EXPERIMENT** | MVP+ |
| F-22 | Municipal hall application helper | **NOT NOW** | — |
| F-23 | About page in main nav | **REMOVE** (footer) | Foundation |

---

## Detailed checks (main decisions)

### F-01 In-app hourly venue booking → DEFER
1. Securing a court. 2. ORG. 3. STRONG that bookable hourly supply exists only for commercial soccer halls (€50–80/h big cities); **no commercial basketball rental found**; free courts not bookable; municipal halls by season and club-first. 4. Hall webshops, phone, Playtomic/USC. 5. Pretends to: bookings never reach venues. 6. Yes → turn Venue into Place with an external booking link. 7. "Booked externally" + link + cost per head. 8. Only with real supply. 9. Very high: contracts, payments, refunds, cancellation, support (Playtomic 1.3★ and Eversports 2.8★ show the support load). 10. **No.** Hide behind a flag; revisit with a partner hall as an experiment (A-07).

### F-02 Recurring games → ADD (MVP)
1. Irregular play, groups fading (P-01, P-09). 2. ORG, DROP. 3. STRONG (only ~20% of self-organised footballers play regularly). 4. A weekly WhatsApp poll. 5. No. 6. Yes, extends ConnectEvent. 7. Weekly series generating the next instance. 8. **It is the core loop.** 9. Medium (series model, scheduler, edit semantics). 10. **Yes.**

### F-03 Min players + go/no-go → ADD (MVP)
1. Uncertainty and cancelled games (P-02, P-03). 2. ORG + all. 3. MODERATE (platform rules, organizer concerns). 4. The organizer decides by gut feeling in the chat. 5. No. 6. Extends status. 7. Two fields + one scheduled job. 8. Yes. 9. Low–medium. 10. **Yes**; it is the main differentiator from a WhatsApp poll (WhatsApp Events have no cap or threshold).

### F-04 Waitlist → ADD (MVP)
1. Dropouts leave holes (P-02). 2. ORG, DROP. 3. MODERATE (Meetup waitlists, Playtomic open matches). 4. "Who can fill in?" message. 5. No ("full" simply blocks). 6. Extends join. 7. FIFO + auto-promote + email. 8. Yes. 9. Low (it reuses the atomic join fix needed anyway). 10. **Yes.**
*Note:* no "maybe" RSVP. Maybes are what organizers chase; binary in/out + waitlist is intentional (PRODUCT HYPOTHESIS, validate in A-01).

### F-05 In-app payments → EXPERIMENT
1. Money collection and no-show cost (P-06). 2. ORG of paid halls. 3. MODERATE (prepay is common in Footy Addicts, JUGAD, CeleBreak). 4. PayPal F&F, cash, Splitwise. 5. Fake payment states only. 6. — 7. **F-05a first:** cost per head + "paid ✓" ticked by the organizer. 8. Indirectly (prepay reduces no-shows). 9. **High:** payment provider, KYC for organizers receiving money (marketplace payouts), refunds, disputes, legal/tax questions to check. 10. No. Test whether organizers use F-05a and ask for more.

### F-06 Attendance → reliability → ADD (V1)
1. No-shows; trust with strangers (P-02, P-08). 2. ORG, DROP. 3. MODERATE (JUGAD reliability score, Meetup penalties). 4. Bans, memory. 5. No. 6. — 7. One-tap attendance; show-up rate after ≥5 games. 8. Yes (priority invites). 9. Medium plus a social risk (could deter casual players, A-05). 10. V1, once games run.

### F-08 Favorites → follow → MERGE (MVP)
1. Returning to the same game (P-09). Favoriting venues solves little. 2. DROP. 3. WEAK for venue favorites; MODERATE for recurring play. 4. — 5. Two duplicate stores (ISSUE-FAV-01). 6. **Yes, merge.** 7. Follow series (+ optionally follow place). 8. Yes. 9. Reduces complexity (one store). 10. Yes.

### F-09 In-app chat → REJECT
WhatsApp is the incumbent and is free, with groups that already exist. Building chat adds moderation, notifications and GDPR load and fights the strongest habit. Game-level notifications (US-06) cover the system messages. Revisit only if users ask for it with evidence.

### F-10 Level rating system → REJECT
Playtomic's level system is a source of complaints about gatekeeping (MODERATE). Self-declared level + format tags + organizer description is enough for recreational play. Too complex for the value.

### F-11 Admin pre-approval → REJECT
It slows organizers, doesn't scale and is not implemented anyway (ISSUE-EVENT-02). Use post-hoc reporting (US-10) + organizer remove + admin delete. Remove the approve/reject endpoints or leave them unused.

### F-12 Public pages + share previews → ADD (MVP)
The login wall blocks the only realistic acquisition channel (organizers sharing links). Smallest solution: public read endpoints + a server route that renders Open Graph tags for `/g/:id`. **Yes, MVP.**

### F-13 Ratings & reviews → REMOVE fake; REJECT real
Hardcoded "4.8" and "50.000 aktive Sportler" are untrue and a legal risk (UWG; legal review recommended). Real reviews need volume, moderation and anti-abuse work. Use factual trust signals instead: series age, average turnout, show-up rate.

### F-14 Format tags → ADD (MVP)
P-07 has the strongest German evidence for a specific segment (taz 2026). Cost: one enum field + filter. It may also be the differentiation wedge (A-04).

### F-21 Guest RSVP → EXPERIMENT
Could maximise response from WhatsApp links, but has no identity, so it can't support reliability, waitlist notifications or abuse handling. Test only if signup drop-off on shared links is high (A-02). Start with fast signup + magic link (US-24).

### Other quick decisions
- **F-07 Reminders:** email in MVP (transactional provider with an EU data processing agreement); web push in V1 with PWA.
- **F-15 Map:** a list + "open in maps" link is enough for MVP; a map needs geocoding and a tile provider.
- **F-16 Operator portal:** no operator evidence; V2 after A-07.
- **F-17 / F-18 / F-20 / F-22:** valuable ideas that each add a new product surface; not needed to prove the core loop.
- **F-19 Native apps:** responsive web works for link-in-chat; PWA for push in V1.
- **F-23 About:** move to the footer next to Impressum/Datenschutz.
