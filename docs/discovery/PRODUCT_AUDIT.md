# Product Audit — Hobbook (current state)

> Date: 2026-11-16 · Scope: product/UX lens on the existing app. Technical baseline: [`PROJECT_SYSTEM_CONTEXT.md`](../../PROJECT_SYSTEM_CONTEXT.md).
> Method: read-only source review, spot-checks of high-impact claims, 3 of 8 screenshots in `Website_screenshot/`. The app was **not** run; `backend/.env` and `data_dump/` were not read.
>
> Labels: **VERIFIED PROJECT FACT** (seen in source/config/screenshot) · **REASONED INFERENCE** · **PRODUCT HYPOTHESIS** · **RECOMMENDATION** · **UNKNOWN**.

## 1. Product idea and positioning (as built)

| Aspect | Finding | Label |
|---|---|---|
| Promise | Home hero has two equal halves: *"Plätze finden. Kicken. Kostenlos."* (free pickup games) and *"Hallen buchen. Verbindlich. Sicher."* (paid venue booking "without club obligation") | VERIFIED (screenshot) |
| Sports | Football and basketball only; Venue also allows `both` | VERIFIED |
| Market | German UI copy, German error messages, `de-DE` dates; venue fixtures in München, Bonn, Berlin | VERIFIED |
| Target users | End users ("Spieler") and an `admin` role; no venue-operator role exists | VERIFIED |
| Business model | None implemented. `paymentStatus` is a label; no payment provider; no venue-operator side | VERIFIED |
| Origin | README frames it as a student learning project (HTW Saar); the `/dashboard` route is an "About us / Der Entwickler" page | VERIFIED |

**REASONED INFERENCE:** Hobbook is currently two products sharing a navbar: a pickup-game board (Connect) and a venue marketplace (Search → Detail → Booking). They don't share data, so the product has no single core loop.

## 2. Feature inventory with product assessment

| Area | What exists | Product assessment |
|---|---|---|
| Auth | Register/login, JWT in localStorage, 30-day token (per README) | Works in principle. No password reset → locked-out users churn. |
| Login wall | **Every** route except login/register is behind `ProtectedRoute`, including browsing venues and games (`App.tsx`) | VERIFIED. Visitors see no value before signing up, and game links can't be shared publicly. A major acquisition blocker. |
| Venue search | Name/city/sport/price filters, client-side over max. 50 venues | OK as a pattern. Value depends entirely on venue inventory, which today is 3 fixture venues in 3 different cities. |
| Venue detail + booking | Fixed hourly slots 08:00–22:00 (ignores `openingHours`), creates `confirmed`/`unpaid` booking | A booking that isn't real: the venue never learns about it, and nothing is paid or confirmed by the venue. See §6. |
| My bookings | List, filter, cancel; shows "Erstattet" status without any payment | Cosmetic refund state. |
| Connect (pickup games) | List of open/full events; filters for sport, today/tomorrow/weekend, skill; join/leave; create form | Closest to a real user problem (see research). Missing: **city/location filter in UI** (backend supports it), event detail page, participant list, share link, reminders, waitlist, recurring games, cancellation notifications. |
| Event creation | Title, sport, free-text location name/address/city, date, times, max players, skill | Location is **free text, not linked to a Venue** (VERIFIED, `CreateEventPage.tsx:40`). |
| Favorites | Venue hearts on Home/Search/Detail; Favorites page | Two parallel back-end stores (ISSUE-FAV-01). Low value until there's a meaningful inventory. |
| Profile | Name, city, phone, sports, avatar, password change | Password change is broken (wrong route); sport casing mismatch. City/sports aren't used for personalization anywhere. |
| About us (`/dashboard`) | Developer bio, milestones, "Lust auf Zusammenarbeit?" CTA | Portfolio content in a primary nav slot. |
| Admin | Dashboard counts, venue CRUD, event list/form, bookings list | Event approval promised but not wired; booking status buttons call a missing route; "revenue" counts unpaid bookings. |

## 3. Current user journeys (as built)

**J-A Play a pickup game:** Register (forced) → Home → "Offene Spiele suchen" → Connect list (all cities mixed) → join from card (no detail, no "who's playing") → nothing else happens (no confirmation, reminder or chat) → the user has to remember the game and find the place via a free-text location.

**J-B Book a venue:** Register → Search → filter → Detail → pick date + fixed slot → "booked" (`confirmed`, unpaid) → My bookings. The venue isn't notified and nobody has paid, so the booking has no real-world effect (REASONED INFERENCE, high confidence).

**J-C Organize a game:** Connect → "Event erstellen" → form with free-text place → event appears in the list. There's no way to invite your own group (no share link and a login wall), and no link to a court booking.

**Break points:** No pre-signup value · no locality · no event detail or social proof · no reminders or notifications · booking has no counterpart · no return trigger.

## 4. Navigation and information architecture

- VERIFIED: 7 top-level nav items (Home, Connect, Venue, About us, Buchungen, Favoriten, Profil) plus Admin, with emoji icons and mixed DE/EN labels ("Venue", "About us", "Connect").
- REASONED INFERENCE: The IA mirrors the database tables (venues, bookings, favorites, events) rather than user goals ("play", "my games"). About us takes a primary slot, and Favorites/Bookings could live under one "Mine" area.
- No mobile navigation pattern was verified. For a product used on the way to a pitch, mobile is the primary context (PRODUCT HYPOTHESIS; to validate).

## 5. Trust and credibility issues (launch-relevant)

| Issue | Evidence | Why it matters |
|---|---|---|
| Hardcoded rating "4.8" | `SearchPage.tsx:324`, `VenueDetailPage.tsx:268,328`, `FavoritesPage.tsx:167` | Fake ratings on real venues mislead users. In Germany, made-up reviews and ratings are a legal risk under the UWG (misleading commercial practices); legal review is needed before launch. |
| "über 50.000 aktiven Sportler" | `HomePage.tsx:155` | Unsubstantiated user count; same risk. |
| Dead links | "So funktioniert's", "Häufige Fragen", "Bewertungen" are `href="#"` with `preventDefault` (`HomePage.tsx:123–145`) | Promises content that doesn't exist. |
| Currency mismatch | VenueCard shows `$39.99 /hr` on Home; Search shows `39.99 €/Std.` (screenshots) | Looks unfinished. |
| Missing images | Broken image alt text on Home venue cards (screenshot) | Looks unfinished. |
| "Verbindlich. Sicher." | Booking has no venue confirmation or payment | The claim isn't true yet. |
| README credentials | `README.md` contains what looks like a real MongoDB Atlas connection string with credentials, a JWT secret and test passwords (values not repeated here) | Security and launch blocker. **Rotate now** even if the repo stays private. |

## 6. "Promise vs. reality" table

| Promised (README/UI) | Reality (source) | Label |
|---|---|---|
| Users can book venues | Booking is a local record; no venue side, no payment | VERIFIED |
| Booking status pending → confirmed → completed | Created directly as `confirmed`; nothing sets `completed` | VERIFIED |
| Cancel with refund | Status flips to `refunded` only if `paid`, which never happens | VERIFIED |
| Admin approves events | Events go live as `open` immediately; no approve UI | VERIFIED |
| Personal activity dashboard | `/dashboard` is the About page | VERIFIED |
| Filter by sport from Home | Home sends `'Football'`/`'Basketball'`; backend does exact match against lowercase enum, so it likely returns an empty list | REASONED INFERENCE (high) |
| Events in your city | Connect UI has no city filter; mixes all cities | VERIFIED |
| Ratings & reviews | No review model; rating is hardcoded | VERIFIED |
| 50,000 active athletes | No evidence | VERIFIED (claim has no basis in repo) |

## 7. Roles and permissions

- `user` and `admin` only. **No venue operator role**: venues are created by a platform admin, so availability and price can't be kept accurate by the people who own them (REASONED INFERENCE).
- Event creator can cancel own event; can't leave it; can't edit it (no edit route for creators).

## 8. Data model observations (product lens)

- `ConnectEvent.location` is embedded free text; `Venue` and `ConnectEvent` aren't related.
- No concept of a **group or recurring game**, even though regular weekly games are the dominant real-world pattern (see research, P-03).
- No attendance or no-show record → no reliability signal is possible.
- `User.city` and `User.sports` exist but aren't used to personalise anything.

## 9. Technical health (summary from PROJECT_SYSTEM_CONTEXT)

Frontend build fails (TS) · booking overlap and event capacity are race-prone · API contract mismatches (password, booking detail, venue update, admin booking status) · dual favorites · no tests or CI · broad CORS, no rate limits · stale docs. Details: `ENGINEERING_PREREQUISITES.md`.

## 10. Accessibility and performance

- UNKNOWN: no audit run. Observed: emoji-prefixed nav labels (read aloud by screen readers), inconsistent `htmlFor` labelling, icon-only buttons to verify.
- Performance: no measurements; unbounded list endpoints.

## 11. Production readiness verdict

**Not launchable** as-is. Blockers in order: (1) leaked credentials, (2) fake trust claims, (3) broken build, (4) core flows that don't result in a real-world outcome (booking) or lose the user after one click (joining a game), (5) login wall that prevents sharing and acquisition.

**What's genuinely good:** a clear visual identity and German copy; a working skeleton for events (capacity, join/leave, skill levels); a sensible backend structure; server-side admin and ownership checks.
