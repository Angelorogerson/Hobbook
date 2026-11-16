# FREE SPORTS EVENTS — PRODUCT USER STORY & WORKFLOW

## 1. Product decision
The product is a city-agnostic, free community sports-event platform. It is not a commercial venue-booking marketplace. Users discover nearby public/community sports events and places, create events, join/leave them, and understand where an event happens through an interactive 3D-capable map experience. No paid venue flow, payment checkout, price-per-hour workflow, partner-hall inventory, or commercial booking dependency belongs to the core product.

## 2. Core product promise
**Find a sport nearby. See exactly where it happens. Join it, or create one yourself.**

The platform should work for any city by treating city, coordinates and place data as data rather than hard-coded launch assumptions.

## 3. Core actors
- Visitor: browse public events and map without signing in.
- Player: join/leave events and manage own participation.
- Organizer: create, read, update and delete/cancel own events.
- Moderator/Admin: review reports and moderate unsafe/abusive content.

## 4. Core product loop
Discover -> Inspect event/map -> Join -> Participate -> Return

Alternative organizer loop:
Create -> Pin/select place -> Publish -> People discover -> People join -> Organizer manages -> Event happens

## 5. MVP scope
### Include
- Public event discovery
- City/area and sport filtering
- Interactive map with 3D-capable presentation where supported by the chosen map stack
- Event markers and event/map synchronization
- Event detail page
- User account/authentication for state-changing actions
- Event CRUD for organizers
- Join/leave flow
- Participant capacity
- Event status
- Place name, address and coordinates
- Date/time, sport, description and skill/level where useful
- Organizer ownership/authorization
- Mobile responsive UX
- Empty/loading/error/success states
- Basic reporting/moderation
- Accessibility and privacy fundamentals

### Explicitly exclude from the core
- Paid venues
- Payments/checkout
- Price-per-hour
- Partner hall slot booking
- Commercial inventory
- Cost-per-head/payment tracking
- Venue marketplace logic
- Ratings required for participation

## 6. Primary user stories

### US-01 — Discover events
As a visitor, I want to see upcoming public sports events in a city/area so that I can quickly find something I can join.

Acceptance criteria:
- Public events can be viewed without login.
- Search/filter can use city/area and sport.
- Past, cancelled and unavailable events are represented honestly.
- Empty state suggests creating an event rather than fabricating results.

### US-02 — Explore on the map
As a visitor, I want to see events spatially on an interactive map so that I understand where each activity is.

Acceptance criteria:
- Every mappable event uses coordinates.
- Selecting a marker opens a concise event preview.
- Selecting an event card highlights/focuses its marker.
- Map and list represent the same filtered result set.
- A usable non-3D fallback exists if 3D is unavailable or unsuitable.
- Keyboard/mobile interaction and readable map controls are considered.

### US-03 — View event details
As a visitor, I want the essential facts on one page so that I can decide whether to join.

Show: sport, title, date/time, place/address, map position, description, level if used, participant count/capacity, status and organizer-safe public information.

### US-04 — Join an event
As a signed-in player, I want to join an open event so that my place is recorded.

Acceptance criteria:
- Joining is authenticated and idempotent.
- A player cannot occupy multiple participant slots.
- Capacity cannot be exceeded under concurrent requests.
- Cancelled/past events cannot be joined.
- UI immediately communicates success/failure truthfully.

### US-05 — Leave an event
As a participant, I want to leave an event so that my spot becomes available again.

### US-06 — Create an event
As a player, I want to create a free community sports event so that other people nearby can discover and join it.

Required input:
- sport
- title
- date and start time
- optional end time/duration
- city
- place/address
- map coordinates/pin
- maximum participants
- optional skill/level
- description
- public visibility

Validation:
- no past start time
- valid capacity
- required location data
- sanitized content
- clear inline errors

### US-07 — Edit own event
As an organizer, I want to update my event so that participants see correct information.

Only the owner/admin may edit. Material changes such as time or location must be clearly surfaced to participants.

### US-08 — Cancel/delete own event
As an organizer, I want to cancel or remove my event so that obsolete events do not mislead people. Prefer a visible cancelled state when participants already exist and reserve hard deletion for appropriate cases.

### US-09 — My events
As a signed-in user, I want one place for events I created and events I joined so that I can manage upcoming activity.

### US-10 — Report content
As a user, I want to report an event or problematic content so that a city-independent public platform can be moderated.

## 7. End-to-end workflows

### Player workflow
Open app -> choose/search city or area -> see list + map -> filter sport/date if needed -> select event -> inspect location and details -> sign in only when joining -> join -> event appears in My Events -> leave if plans change.

### Organizer workflow
Sign in -> Create Event -> choose sport/details -> search location or drop map pin -> verify address/location -> set date/time/capacity -> preview -> publish -> event appears publicly in list/map -> manage participants/details -> edit/cancel when needed.

### Map workflow
Map loads current filtered event set -> markers correspond to visible results -> user selects marker/card -> preview/detail is synchronized -> viewport can be changed -> explicit search-this-area behavior may refresh results -> never silently fabricate location.

## 8. City-independent data model
Event should conceptually include:
- id
- organizerId
- title
- sport
- description
- startAt / endAt or duration
- timezone/location timezone strategy
- city
- placeName
- address
- latitude / longitude (or GeoJSON point)
- maxParticipants
- participantIds
- level (optional)
- visibility
- status: open/full/cancelled/completed
- createdAt / updatedAt

Do not encode one specific city into domain rules. Location should be coordinate-based with city/address metadata.

## 9. Important states and edge cases
- Event becomes full while two users join simultaneously.
- Organizer edits location after users joined.
- Event is cancelled after participants joined.
- Geocoding/search cannot resolve a place.
- User drops a pin where formatted address is unavailable.
- Map/3D rendering is unavailable.
- No events exist in the selected area.
- User attempts to edit another organizer's event.
- User attempts to join twice.
- Event transitions into the past.
- Coordinates/address are invalid or inconsistent.

## 10. UX information architecture
Keep top-level navigation small:
- Discover
- Map
- Create
- My Events
- Profile

On mobile, Create should remain highly visible. List and map should feel like two views of the same discovery data, not disconnected products.

## 11. Engineering implications for current Hobbook foundation
The existing project already has React/Express/Mongoose domains for venues, bookings and Connect events, but the frontend build currently fails and the project context reports API mismatches and non-atomic event-capacity checks. Stabilize those foundations before expanding the product.

Recommended direction:
1. Make Connect/Event the primary domain.
2. Remove commercial booking/payment assumptions from the target experience.
3. Convert location into a reusable Place/geospatial concept or embed a well-defined location object in events.
4. Add safe public event reads; protect create/update/delete/join/leave.
5. Make participation capacity atomic.
6. Build one canonical server-side event query for list + map filters.
7. Add integration tests for ownership, CRUD and concurrent joins.
8. Add E2E tests for Discover -> Detail -> Join and Create -> Map -> Edit/Cancel.

## 12. Product success definition
The MVP succeeds when a person in any supported city can open the app, find a nearby free community sports event, understand its exact location, join it with minimal friction, or publish a new event that other people can discover on the same map/list experience.

---

# IMPLEMENTATION AGENT PROMPT

Read PROJECT_SYSTEM_CONTEXT.md and this specification completely before changing code. Verify the repository state yourself. Treat this document as the target product scope, not as proof that implementation already exists.

Goal: transform the current Hobbook foundation into a free, city-independent community sports-event platform. Users must be able to discover public sports events, inspect their location through an interactive map with a 3D-capable experience where technically supported, join/leave events, and CRUD their own events.

Hard constraints:
- No paid-venue product flow.
- No payment/checkout.
- No price-per-hour or cost-per-head workflow.
- No partner-hall inventory dependency.
- Do not hard-code a city.
- Do not rewrite working foundations without evidence.
- Do not claim 3D capability until the selected map implementation is verified against official documentation.
- Preserve privacy, accessibility, responsive UX and authorization.
- State-changing actions require appropriate authentication/authorization.
- Capacity updates must be concurrency-safe.

Work agentically in phases:
1. AUDIT existing code against the target scope.
2. CLASSIFY current features: KEEP / ADAPT / REMOVE-FROM-UX / DEFER.
3. FIX build/type/API blockers required for the target workflow.
4. DEFINE the canonical Event + Location contracts and CRUD/participation rules.
5. IMPLEMENT public discovery and map/list synchronization.
6. IMPLEMENT event detail and join/leave.
7. IMPLEMENT create/edit/cancel/delete ownership workflows.
8. IMPLEMENT My Events and core states.
9. ADD moderation/reporting basics.
10. TEST authorization, validation, concurrency, CRUD, geospatial filtering and core E2E journeys.
11. VERIFY responsive UI, accessibility, empty/loading/error states and no misleading content.
12. DOCUMENT what changed, what was removed from scope, remaining risks and evidence from tests/builds.

Before each code change: inspect -> identify root cause -> choose smallest coherent change -> implement -> test -> verify. If something is unknown, inspect/research it rather than inventing behavior.
