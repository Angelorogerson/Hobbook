# Gap Analysis

> Date: 2026-11-16 · Real problem → existing feature → current solution → weakness → improvement → decision.
> Decisions: KEEP · IMPROVE · REDESIGN · MERGE · ADD · DEFER · REMOVE · REJECT. Feature IDs (F-xx) → [FEATURE_DECISIONS.md](FEATURE_DECISIONS.md).

## 1. Existing features

| Existing feature | Problem(s) | Current solution | Weakness | Improvement | Decision |
|---|---|---|---|---|---|
| **Connect events** (`ConnectEvent`, ConnectPage, CreateEventPage) | P-01, P-04 | One-off public events, capacity, join/leave, skill | No recurrence, detail page, locality filter, waitlist, minimum, reminders or share; race-prone capacity | Becomes the **Game** at the centre of the product | **REDESIGN** (evolve, don't rewrite) |
| **Skill level** | P-07 | 4 levels on an event | No format or audience tags | Add format tags (women/FLINTA*-only, beginner-friendly, 35+) and a "who it's for" text | **IMPROVE** |
| **Venue directory** (`Venue`, SearchPage, VenueDetail) | P-05, P-10 | Admin-entered paid venues with hourly price | Wrong model for free courts and basketball; fake 4.8 ratings; 3 venues in 3 cities | Becomes the **Place** directory: type, access rules, price info, external booking link; attached to games | **REDESIGN** |
| **In-app hourly booking** (`Booking`, slots, BookingsPage) | P-05, P-06 | Local "confirmed/unpaid" record | Venue never sees it; implies a contract that doesn't exist; fixed 08–22 slots; race-prone | Hide behind a feature flag; replace with "booked externally" note + cost per head | **DEFER** (F-01) |
| **Favorites** (two stores) | P-09 (weak) | Heart a venue | Low value with tiny inventory; duplicated backend | Replace with "follow a game series" (return loop) and optionally "my places" | **MERGE** into Follow (F-08) |
| **Event approval by admin** | P-08 | Endpoints exist; not wired; events go live as open | Pre-approval slows organizers and doesn't scale | Post-hoc reporting and moderation | **REJECT** pre-approval (F-11); **ADD** reporting |
| **Admin dashboard revenue** | — | Sums unpaid bookings | Misleading metric | Replace with product health metrics (games held, fill rate, cancellations) | **REDESIGN** (V1) |
| **Admin booking management** | — | Calls missing route | Broken; booking deferred | Remove from nav with booking | **DEFER** with F-01 |
| **About us in main nav** (`/dashboard`) | — | Developer bio | Occupies a primary slot; not a user need | Move to footer/imprint area | **REMOVE** from nav |
| **Home page** | P-04 | Two-pillar hero, dead links, fake stats | Misleading; splits focus | One promise ("your game, every week"), real local games, honest copy | **REDESIGN** |
| **Login wall on all pages** | P-04, X-02 | `ProtectedRoute` around everything | Shared links don't work for non-users; no pre-signup value | Public read for games and places; login only to act | **REDESIGN** (F-12) |
| **Profile** (city, sports, phone, avatar) | P-08 | Edit form; password change broken | City/sports unused; phone collected without need | Use city and sports for defaults; stop collecting phone; fix password; add account deletion | **IMPROVE** |
| **Auth** | — | Email/password, JWT | No reset, no rate limit | Add password reset; consider magic link later | **IMPROVE** |
| **Bookings page "Erstattet"** | — | Cosmetic refund state | Untrue | Hidden with F-01 | **DEFER** |
| **Ratings/reviews (hardcoded)** | P-08 | Static "4.8" | Fake | Remove; no review system for now | **REMOVE** now; **REJECT** reviews (F-13) |

## 2. Missing capabilities

| Problem | Missing capability | Smallest solution | Decision |
|---|---|---|---|
| P-01, P-09 | Recurring game (series) | Weekly series that generates the next game; last attendees get first invite | **ADD** (MVP, F-02) |
| P-01, P-03 | Minimum players + go/no-go deadline | `minPlayers` + `decisionAt`; auto status "on" / "cancelled" + notification | **ADD** (MVP, F-03) |
| P-02 | Waitlist with auto-promotion | FIFO waitlist; promotion notifies the player | **ADD** (MVP, F-04) |
| P-02, P-08 | Attendance and reliability | Organizer marks no-shows after the game; show-up rate on profile | **ADD** (V1, F-06) |
| P-03, P-04 | Shareable public game page | `/g/:id` readable without login, with a WhatsApp link preview | **ADD** (MVP, F-12) |
| P-03 | Reminders and change notifications | Email (MVP), web push (V1) | **ADD** (MVP, F-07) |
| P-03 | Edit/cancel by creator, co-organizers | Creator edit/cancel (MVP); co-organizers (V1) | **ADD** |
| P-04 | Locality | City filter in UI (MVP; backend already supports it); distance (V1) | **ADD** / **IMPROVE** |
| P-06 | Cost per head + paid tracker | Organizer enters total cost; app shows per head; organizer ticks paid | **ADD** (V1, F-05a) |
| P-07 | Format tags | Enum tags + description | **ADD** (MVP) |
| P-08 | Report / remove player | Report button → admin queue; organizer can remove a participant | **ADD** (MVP) |
| — | GDPR basics | Account deletion, privacy policy, imprint, no phone exposure | **ADD** (Foundation) |
| — | Calendar | `.ics` download / "add to calendar" | **ADD** (MVP; cheap) |

## 3. Explicitly not filling these gaps now

In-app payments (EXPERIMENT) · venue operator portal (V2) · chat (REJECT; use WhatsApp) · ELO or level ranking (REJECT) · team auto-balancing (NOT NOW) · tournaments/leagues (NOT NOW) · more sports (NOT NOW) · native apps (NOT NOW; responsive web/PWA) · municipal hall application assistant (NOT NOW). Rationale: [FEATURE_DECISIONS.md](FEATURE_DECISIONS.md).

## 4. Connecting isolated areas

The biggest structural gap is that **Venue and ConnectEvent are unrelated** (VERIFIED). The fix isn't a new feature but a relation: `Game.place → Place`. Then:
- a place page shows its upcoming games ("who plays here and when"), which answers P-10 better than any map;
- a game page shows how to get in (free court vs. hall booked externally, cost per head);
- favorites become "follow a place / follow a series", one mechanism instead of two stores.
