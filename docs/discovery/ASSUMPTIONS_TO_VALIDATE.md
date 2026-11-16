# Assumptions to Validate

> Date: 2026-11-16 · Every assumption is a **PRODUCT HYPOTHESIS** until tested. Ordered by risk × how much the product depends on it. Use the cheapest method first.

| ID | Assumption | Risk if wrong | Cheapest validation | Success signal (set exact thresholds before testing) |
|---|---|---|---|---|
| **A-01** | Organizers of recurring informal games will switch from WhatsApp polls to a Hobbook link (keeping WhatsApp for chat) | **Fatal**: the core loop fails | Concierge test: recruit 5–8 organizers; run their weekly game via a Hobbook link (even manually) for 4 weeks | Most still use it unprompted in week 4; organizers report less chasing |
| **A-02** | Group members will sign up to RSVP from a link | High: drop-off kills response rates | Measure link → RSVP conversion in A-01; compare with a guest-RSVP variant (F-21) | High completion; few "I'll just answer in WhatsApp" replies |
| **A-03** | Min players + go/no-go + waitlist make games happen more reliably | High: weakens the value proposition | Before/after in A-01 groups: games held vs. cancelled, last-minute scrambles | Fewer last-minute cancellations; organizers say the decision is easier |
| **A-04** | There is a niche (city × sport × format) where Hobbook can reach liquidity despite JUGAD | **Fatal for growth** | 15–20 interviews (players + organizers) in 1–2 candidate cities; check JUGAD/CeleBreak/Meetup coverage there; consider basketball and FLINTA*/beginner formats | A clear, under-served segment with named organizers willing to start |
| **A-05** | Showing a reliability/show-up rate reduces no-shows without deterring casual players | Medium | V1 A/B by series or before/after; ask players in interviews | No-show rate down; join rate stable |
| **A-06** | Organizers of paid-hall games want in-app payment | Medium (scope) | Interviews + usage of the manual "paid" tracker (F-05a) | Organizers ask for it unprompted; high tracker use |
| **A-07** | Commercial soccer halls would offer off-peak slots through Hobbook games | Medium (V2) | 3–5 operator interviews; one concierge partner | ≥1 operator agrees to a pilot |
| **A-08** | Email reminders are enough (no native push) | Low–Med | Track open rates; ask in A-01 | Reminders noticed; push requested? |
| **A-09** | A sustainable business model exists | High long-term | Explore options in interviews: organizer pro plan, hall partnership commission, sponsored/hosted games; don't build billing | At least one option with credible willingness to pay |
| **A-10** | Mobile web (no native app) is acceptable | Low–Med | Usage analytics by device; feedback | No significant "need an app" feedback |
| **A-11** | Place data for the launch city can be seeded and kept current with little effort | Medium | Prototype import from city open data or OSM for one city; count corrections needed | Usable data for most game locations |
| **A-12** | Binary in/out (no "maybe") is accepted | Low–Med | A-01 feedback | Few requests for "maybe" |
| **A-13** | Format tags (women/FLINTA*-only, beginner, 35+) attract and retain underserved players and aren't abused | Medium | Pilot with 1–2 such groups; monitor reports | Repeat attendance; low abuse |

## Known unknowns (not assumptions; information to get)

- Launch city and the team's local access to organizers there (UNKNOWN).
- Team capacity and timeline (UNKNOWN).
- Legal review: UWG (claims), GDPR (fonts, email provider, deletion), liability for games organized via the platform, and payment regulation if F-05 proceeds.
- Real German no-show frequency in informal games (no data found).
- German user voice from Reddit, gutefrage and local communities: not reachable in this research. Do a manual sweep.

## Interview guide (starter)

**Organizers:** How do you organize your game today, step by step, last week? What went wrong recently? How do you decide to cancel? Who pays the hall, and how do you get the money back? What did you try before (apps)? What would make you switch?
**Players:** When did you last play? How did you find out about it? When did you last *not* play although you wanted to, and why? Have you joined strangers' games? What made it good or bad?
Rules: ask about past behaviour, not future intentions; don't pitch Hobbook until the end.
