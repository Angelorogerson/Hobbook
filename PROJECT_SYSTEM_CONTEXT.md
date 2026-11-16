# PROJECT SYSTEM CONTEXT

> **Audience:** future AI agents and engineers without prior project context.  
> **Repository state inspected:** local workspace `C:\Users\roger\app\hobbook`, 2026-11-16.  
> **Method:** read-only source/config/documentation inspection plus a TypeScript `--noEmit` check. No application server, browser flow, database, test suite, or deployment was run.  
> **Evidence labels:** ✅ VERIFIED = directly present in source/config; 🟡 PARTIALLY VERIFIED = source exists but runtime/whole flow is unconfirmed; ⚠️ ISSUE = concrete defect or risky design supported by evidence; ❓ UNKNOWN = unavailable or not verified; ❌ NOT FOUND = searched for and absent; 🔵 INFERENCE = reasoned conclusion with basis stated.  
> **Secret handling:** local `backend/.env` was not read. Secret values are intentionally omitted.

## 1. Executive Overview

Hobbook is a React web application backed by an Express/Mongoose API. Its intended product is a sports venue discovery and booking platform with community events (“Connect”). It has pages, routes, controllers, models, and client API modules for those domains.

The frontend is not currently buildable with the installed dependency set. The first `tsc --noEmit` check stops at `ignoreDeprecations: "6.0"`, which TypeScript 5.9.3 rejects. Overriding that value for diagnosis reveals additional TypeScript errors, including `AuthState.isAuthenticated` references although the state declares `isLoggedIn`, incompatible `VenueCard` props, a PNG import without a resolvable declaration, and strict unused-symbol errors. Runtime behavior is therefore not assumed from code wiring alone.

The most important additional risks are non-atomic booking-slot and event-capacity checks, frontend/backend API contract mismatches, dual favorite persistence, and security-sensitive example configuration. No P0 issue was confirmed. No project test suite, CI/CD, container, or deployment configuration was found.

## 2. Project Identity

| Item | Finding |
|---|---|
| Project name | ✅ `Hobbook`, also package names `hobbook-frontend` / `hobbook-backend`. |
| Purpose | ✅ README describes sports venue booking and ad-hoc sports events. |
| Core problem | 🔵 Help players find sports venues and organize local games; based on README and implemented feature domains. |
| Target users | ✅ End users/players and an `admin` role. Detailed personas are ❓ UNKNOWN. |
| Current development state | ✅ Local full-stack project with source, lockfiles, JSON data fixtures, screenshots, and a PDF. ⚠️ Frontend type/build gate fails. |
| Main domains | Authentication, users/profiles, venues, bookings, Connect events, favorites, administration. |
| Important limitations | No verified payment integration, email lifecycle, media upload, queue, cache, tests, or deployment. |
| Documentation scope | Source and repository artifacts only. Live UI, active database, deployment, and local ignored secrets not inspected. |

## 3. Current System State

- ✅ Backend is organized as Express routes → middleware → controllers → Mongoose models → MongoDB.
- ✅ Frontend is a React SPA with React Router, contexts/reducers, Axios modules, page components, and CSS files.
- ⚠️ Type checking/build is blocked; details are in [Known Issues](#32-known-issues).
- 🟡 Backend feature logic is implemented, but was not started against a database and is not runtime-verified.
- ❌ No test files or test scripts were found outside generated dependencies.
- ❌ No CI workflow, Docker configuration, deployment manifest, or production web-server configuration was found.
- ❓ The actual environment values, MongoDB availability/data, and deployed state are unknown.

## 4. Technology Stack

Versions below are lockfile-resolved versions, not guesses. Package manifests specify version ranges.

| Technology | Version | Purpose / configuration |
|---|---:|---|
| JavaScript / Node.js | Node version ❓ | Backend uses ESM (`"type":"module"`); no `.nvmrc`/engines requirement found. |
| Express | 4.22.1 resolved | HTTP server and routing. |
| Mongoose | 8.24.5 resolved | MongoDB ODM and schemas. |
| MongoDB driver | Indirect via Mongoose | Database connection in `backend/config/db.js`. Server URI comes from `MONGODB_URI`. |
| React / React DOM | 18.3.1 resolved | Frontend UI. |
| TypeScript | 5.9.3 resolved | Strict TS configuration; current config/type errors block checks. |
| React Router | 6.30.3 resolved | SPA routes in `frontend/src/App.tsx`. |
| Vite / React plugin | 5.4.21 / lockfile plugin | Dev server and frontend build; Vite port configured as 5173; build output `dist`; source maps enabled. |
| Axios | Lockfile dependency, `^1.6.0` manifest | JSON API client and Bearer-token interceptors. |
| JWT / password hashing | `jsonwebtoken` / `bcryptjs` | Stateless Bearer auth and bcrypt password hashing (cost 12 in User hook). |
| HTTP middleware | Helmet, CORS, Morgan, dotenv, express-async-errors | Security headers, cross-origin handling, development logging, env loading, async route errors. |
| Styling | CSS files | No CSS Modules, Tailwind, or component UI framework found. |
| State | React Context + `useReducer` / local component state | Auth, venues, events, bookings contexts. |
| Testing / browser testing | ❌ Not found | No framework, test script, or browser/E2E setup found. |
| Queues / cache / storage / mail / AI | ❌ Not found | No implementation/configuration found. |
| External UI resources | Google Fonts and Material Symbols stylesheet in `frontend/index.html`; placeholder image URL fallback in `VenueCard`. |
| Deployment / CI | ❌ Not found | No evidenced production target or pipeline. |

Key manifest files: `backend/package.json`, `backend/package-lock.json`, `frontend/package.json`, `frontend/package-lock.json`.

## 5. Project Structure

```text
/
├── backend/
│   ├── config/db.js
│   ├── controllers/       # request handlers and business/data logic
│   ├── middleware/       # JWT auth, admin gate, unused standalone error helper
│   ├── models/            # Mongoose schemas: User, Venue, Booking, ConnectEvent, Favorite
│   ├── routes/            # API route declarations
│   ├── server.js           # app assembly and listener
│   ├── package.json / lock
│   └── .env.example        # template; contains a static sample signing key (value omitted)
├── frontend/
│   ├── src/api/            # Axios API modules and DTO-ish TS interfaces
│   ├── src/components/     # common, layout, venue components
│   ├── src/pages/          # auth, main, connect, admin screens
│   ├── src/store/          # Auth, Venue, Event, Booking contexts
│   ├── src/constants/      # theme and app config/constants
│   ├── App.tsx / main.tsx  # routes and SPA entry
│   └── Vite/TS config and package files
├── data_dump/              # `test.*.json` fixtures; not a `mongorestore` BSON dump
├── Website_screenshot/     # screenshots; not runtime proof
├── output/pdf/             # learning-document PDF
├── README.md
├── README_MONGODB.md
└── .gitignore
```

`node_modules` folders were intentionally excluded from the project inventory. The repository currently reports no commits and the project files appear as untracked in Git status; this is relevant when managing changes but does not establish the intended repository history.

## 6. Important Files Map

| File/path | Responsibility | Importance | Connected areas |
|---|---|---:|---|
| `frontend/src/main.tsx` | React root, StrictMode, global CSS | High | App, CSS |
| `frontend/src/App.tsx` | Providers and route table | Critical | All pages and contexts |
| `frontend/src/store/AuthContext.tsx` | Login/register/session bootstrap/profile update state | Critical | Axios, auth API routes, ProtectedRoute |
| `frontend/src/components/layout/ProtectedRoute.tsx` | Client-side login/admin route guard | High | AuthContext, App |
| `frontend/src/api/axiosInstance.ts` | Base URL, localStorage Bearer header, 401 redirect | Critical | All API modules |
| `frontend/src/api/{venue,booking,connectEvent,user,favorite}Api.ts` | Frontend API contracts | Critical | Pages/contexts and backend routes |
| `frontend/src/store/{Venue,Event,Booking}Context.tsx` | Reducers and async feature state | High | API modules and pages |
| `frontend/src/pages/main/VenueDetailPage.tsx` | Venue detail, favorite and booking UI | High | Venue/booking/user APIs |
| `frontend/src/pages/main/SearchPage.tsx` | Venue filtering/favorites | High | VenueContext, userApi |
| `frontend/src/pages/connect/ConnectPage.tsx` | Event list/filter/join | High | Events API |
| `frontend/src/pages/admin/BookingsAdminPage.tsx` | Admin booking status UI | High | `bookingApi.updateBooking`; backend route absent |
| `backend/server.js` | Express middleware/routes/error handler/listener | Critical | DB connection and all routes |
| `backend/config/db.js` | MongoDB connection and shutdown hooks | Critical | Mongoose and `MONGODB_URI` |
| `backend/middleware/auth.js` | JWT verification and user hydration | Critical | User model and protected routes |
| `backend/middleware/isAdmin.js` | Admin role check | High | Admin routes |
| `backend/routes/*.js` | HTTP method/path/auth map | Critical | Controllers |
| `backend/controllers/*.js` | Validation, business rules, persistence | Critical | Routes and models |
| `backend/models/*.js` | Fields, enums, refs, hooks and indexes | Critical | MongoDB collections |
| `frontend/tsconfig.json` | Strict TS/build options | Critical | Current frontend build failure |
| `frontend/vite.config.ts` | Alias, dev port, output and sourcemaps | Medium | Frontend build/dev |
| `README.md`, `README_MONGODB.md` | Setup, feature and import guidance | Medium | Conflicts with source in several places |

## 7. System Architecture

```text
Browser
  └─ React Router page / component
       └─ Context/reducer or local state
            └─ Axios API module
                 └─ HTTP JSON + Bearer token from localStorage
                      └─ Express middleware (Helmet, CORS, JSON, auth/admin)
                           └─ Route handler / controller
                                └─ Mongoose model and query/hook/index
                                     └─ MongoDB
```

There is no separate service/repository layer, server-side session store, queue, or cache. `express-async-errors` is imported to propagate async errors; a local global error handler is assembled in `server.js`. The exported `errorHandler` helper in `middleware/errorHandler.js` is not mounted. `connectDB()` is called without awaiting completion before `app.listen()`.

## 8. Feature Inventory

### Authentication and account

- **Purpose/status:** registration, login and protected access are implemented in source; overall flow 🟡 because build/runtime are unverified. Password update is ⚠️ due API mismatch.
- **Frontend:** `pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `store/AuthContext.tsx`, `components/layout/ProtectedRoute.tsx`.
- **Backend:** `routes/authRoutes.js`, `controllers/authController.js`, `middleware/auth.js`, `models/User.js`.
- **Routes:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- **Logic:** password hash via pre-save bcrypt hook; login compares password; signed JWT contains user ID; middleware verifies it and loads User.
- **State:** token is stored in localStorage. Client logout sends a POST to a route that is not registered, then removes local token.
- **Missing:** email verification, password reset, refresh/revocation, server logout, rate-limit middleware.
- **Important for future changes:** keep AuthState and every page using it in sync; map the exact backend response (`{ user }`, `{ token,user }`).

### User profile and administration

- **Frontend:** `pages/main/ProfilePage.tsx`, `api/userApi.ts`, AuthContext.
- **Backend:** `routes/userRoutes.js`, `controllers/userController.js`, User model.
- **Routes:** `PUT /api/users/me`, `PUT /api/users/me/password`, `GET /api/users` (admin).
- **Logic:** profile controller accepts name, city, sports, phone and avatar; password controller checks current password and saves the new password.
- **Issues:** frontend password helper calls `POST /users/change-password`; user profile helper `GET /users/me` does not exist (current-user route is `/auth/me`). Profile sports UI uses title-case sport labels while User schema enum uses lowercase values, likely causing validation errors when saved. This conclusion is based on UI and schema values; full browser behavior was not run.
- **Missing:** user detail/admin mutation routes advertised by some API helpers are not present.

### Venues and search

- **Frontend:** HomePage, SearchPage, VenueDetailPage; VenueCard, SearchBar, FilterPanel; VenueContext.
- **Backend:** venue routes/controller and Venue model.
- **Routes:** public `GET /api/venues`, `GET /api/venues/:id`; admin protected `POST`, `PUT`, `DELETE` on `/api/venues` paths.
- **Logic:** public listing filters active venues by sport/city/price, sorts newest first. Delete is soft disable (`isActive=false`). UI search filters names/cities/sports/prices on loaded data. VenueContext requests `limit:50`, but backend does not implement pagination.
- **Validation/authorization:** create requires name, sport, address, price, capacity; admin middleware protects writes; Mongoose validates enums/required fields. Update passes raw body to `findByIdAndUpdate` with validators, so its allowed-field surface is broader than the explicit create mapping.
- **Issues:** `updateVenue` backend sends `{ venue }`, frontend helper reads `data.data`. Venue sports include `both`, while booking/event sports only allow football/basketball. Slot selector uses fixed 08:00–22:00 rather than Venue opening-hour data. Geo create fallback uses `[0,0]` coordinates, not an actual geocoded location.

### Bookings

- **Frontend:** VenueDetailPage, BookingsPage, BookingsAdminPage, BookingContext, bookingApi.
- **Backend:** booking routes/controller and Booking model, Venue model.
- **Routes:** protected `POST /api/bookings`, `GET /my`, `GET /:id`, `PUT /:id/cancel`; public `GET /venue/:venueId/slots`; admin `GET /api/bookings`.
- **Logic:** controller finds Venue, checks overlapping active booking, computes duration and price from venue hourly price, creates `confirmed`/`unpaid` booking. User booking query scopes by authenticated user. Detail and cancellation routes enforce owner-or-admin. Cancellation changes status and, if paymentStatus is `paid`, changes it to `refunded` without a payment provider.
- **Data:** user/venue refs, date/times, duration, total, sport, status, payment status, notes and cancellation fields. Non-unique compound index `(venue,date,startTime)`.
- **Issues:** conflict read and create are separate operations; concurrent requests can both pass. The index is not a uniqueness/overlap constraint. No demonstrated check for venue active status, opening hours, past dates, sport-to-venue compatibility, or normalized time/date validity. Payment/refund state is bookkeeping only. Frontend `getBookingById` expects `{data}` while backend returns `{booking}`. Admin UI calls missing `PUT /api/bookings/:id`.
- **Tests:** none found.

### Connect events

- **Frontend:** ConnectPage, CreateEventPage, admin event list/form; EventContext; JoinButton component.
- **Backend:** connectEvent routes/controller and ConnectEvent model.
- **Routes:** public GET list/detail; protected POST create, PUT join/leave, DELETE user cancellation; protected-admin GET `/admin/all`, PUT `/admin/:id`, DELETE `/admin/:id`, PUT approve/reject.
- **Logic:** event list returns `open` and `full`; create sets creator and includes creator as first participant; join prevents duplicate participant and full status; leave prevents the creator leaving; creator/admin can cancel. Model pre-save hook recalculates full/open from participant count.
- **Issues:** create status defaults to `open`; model enum has no `pending`; admin approve/reject is not a genuine pending moderation lifecycle. Join count update is read/push/save and can race. Event create relies mostly on Mongoose required/enum validation, with no comprehensive date/time/location validation. Event deletion can leave Favorite refs dangling.
- **Tests:** none found.

### Favorites

- **Frontend:** HomePage, SearchPage, FavoritesPage, VenueDetailPage use old userApi methods; `api/favoriteApi.ts` separately models venue and event favorites.
- **Backend:** userController stores venue ObjectIds in `User.favorites`; favoriteController stores Favorite documents and supports venues/events.
- **Routes:** `/api/users/me/favorites` GET/POST/DELETE and `/api/favorites` GET plus venue/event POST/DELETE.
- **Issues:** two independent stores mean writes via one API are invisible to the other. `userController.getFavorites` populates favorites into Venue objects, while Home/Search cast the response as string IDs; a separate compiler diagnostic also flags `_id` access on a string in VenueDetailPage. Favorite model indexes are not declared unique and schema permits both venue and event fields simultaneously.
- **Tests:** none found.

### Admin dashboard and informational page

- **Admin pages:** dashboard, Venue CRUD list/form, event list/form, booking list.
- **Admin API dependencies:** all users, venues, bookings, events. Admin route protection exists in frontend and backend for corresponding APIs.
- **Issue:** admin booking status controls call a route absent from bookingRoutes. Dashboard “revenue” sums confirmed/completed bookings whether paid or unpaid. `/dashboard` is an About/developer page, not a personal activity dashboard.

## 9. User Flows

### Registration/login

`RegisterPage/LoginPage → AuthContext → Axios → POST /api/auth/register|login → authRoutes → controller → User → MongoDB → token/user JSON → localStorage + AuthState`.

Password is checked/hashed in User model logic. Missing token and invalid tokens are rejected by `protect`. Error bodies are not fully standardized. Logout is client-side token removal; the attempted server endpoint does not exist.

### Browse and book venue

`Search/Home → VenueContext or venueApi → GET /api/venues → venueController → Venue.find → Venue cards → /venues/:id → GET /api/venues/:id`. Detail page requests public booked slots; the user selects a fixed-hour slot and submits authenticated `POST /api/bookings`; controller validates required identifiers, calculates price and persists. Booking UI refreshes slot list. Database uniqueness/race safety is absent.

### Create/join Connect event

`Connect/CreateEventPage → connectEventApi → POST /api/events → protected route → createEvent controller → ConnectEvent → MongoDB`. List request is public. Join/leave use authenticated PUT routes and update participants. UI filters skill/weekend partly client-side. No server-side transactional capacity guarantee exists.

### Edit profile/change password

Profile update uses AuthContext PUT `/users/me` and a matching backend route. Password change calls the wrong path/method and will not reach the implemented password controller. Sports casing also differs between the profile options and schema enum.

### Admin management

Client admin route checks `user.role`; backend repeats role protection. Venue/event management endpoints exist. Admin booking reads exist, but status update endpoint does not. UI route guards are convenience controls; backend middleware is the security boundary.

## 10. Frontend Architecture

- Entry: `src/main.tsx` mounts `App` under `React.StrictMode` and imports `index.css`.
- Routing/providers: `App.tsx` wraps BrowserRouter, AuthProvider, VenueProvider, EventProvider and BookingProvider around pages.
- Shared layouts: Navbar and ProtectedRoute. Navbar is hidden on login/register paths.
- State: contexts use reducers for auth, venues, events and bookings; pages also hold substantial local state.
- API: Axios instance defaults to `http://localhost:5000/api`, adds Bearer token from `localStorage`, redirects to `/login` on every 401.
- Styling: page/component-specific CSS plus global CSS and a theme constant. Google Fonts/Material Symbols are loaded from external CSS in index.html.
- Loading/errors: shared LoadingSpinner, ErrorMessage, EmptyState and per-page inline states exist, though usage is not universal.
- Validation: mostly native HTML required fields and local checks; server-side validation varies by controller/model.
- Responsive/accessibility: CSS contains breakpoints; no automated or manual accessibility/device verification was done.
- Build config: alias `@` maps to `src`; Vite port 5173; sourcemap true; TS strict/noUnused enabled. Missing/invalid config and source errors currently fail type check.

## 11. Page Inventory

| Page | Route | Purpose | Backend dependencies | Status |
|---|---|---|---|---|
| LoginPage | `/login` | Login | `/auth/login` | 🟡 static only |
| RegisterPage | `/register` | Registration | `/auth/register` | 🟡 static only |
| HomePage | `/home` | Venue highlights / navigation | venues, user favorites | ⚠️ invalid `isAuthenticated` TS access |
| SearchPage | `/search` | Venue search/filter | venues, user favorites | ⚠️ invalid auth access/type mismatch |
| VenueDetailPage | `/venues/:id` | Venue details, slots, favorite, booking | venues, bookings, favorites | ⚠️ favorite type diagnostic; fixed slots |
| DashboardPage | `/dashboard` | About/developer content | none | ✅ page exists; differs from documented dashboard |
| BookingsPage | `/bookings` | User bookings/cancellation | bookings | 🟡 static only |
| FavoritesPage | `/favorites` | Saved venues | user favorites | ⚠️ incompatible cast diagnostic |
| ProfilePage | `/profile` | Profile/password form | users/auth | ⚠️ password endpoint mismatch |
| ConnectPage | `/connect` | Browse/join events | events | ⚠️ unused handler diagnostic |
| CreateEventPage | `/connect/new` | Create event | events | 🟡 static only |
| AdminDashboardPage | `/admin` | Admin counts/recent bookings | venues/bookings/users | ⚠️ revenue definition; counts only returned data |
| VenueListAdminPage | `/admin/venues` | Venue listing/deactivation | venues | ⚠️ TypeScript unused import diagnostic |
| VenueFormPage | `/admin/venues/new`, `/admin/venues/:id/edit` | Venue CRUD form | venues | ⚠️ update response mismatch |
| ConnectEventListAdminPage | `/admin/events` | Event list/delete | events | ⚠️ text promises approvals but UI does not expose approve/reject controls |
| ConnectEventFormAdminPage | `/admin/events/...` | Event create/edit/view route | events | 🟡 “view” route renders editable form component |
| BookingsAdminPage | `/admin/bookings` | Booking search/status update | bookings | ⚠️ update endpoint missing |

## 12. Component Architecture

| Component group | Files | Purpose / notable details |
|---|---|---|
| Layout | `components/layout/Navbar.tsx`, `ProtectedRoute.tsx` | Global navigation and client-side auth/admin guard. |
| Venue | `VenueCard.tsx`, `SearchBar.tsx`, `FilterPanel.tsx` | Venue display/search/filter. `VenueCard` supports optional favorite callback; SearchPage currently passes props the compiler does not accept according to the actual component signature. |
| Common | Button, Input, LoadingSpinner, ErrorMessage, EmptyState, FavoriteButton, JoinButton | Reusable UI helpers. `JoinButton` delegates join/leave to EventContext and displays local error. |
| Admin | `pages/admin/AdminNav.tsx`, shared `admin.css` | Admin subnavigation and styling. |

Most feature-specific behavior remains in page components; no separate hooks directory or component test suite was found. Component consumers should be checked before changing shared prop contracts.

## 13. Backend Architecture

- `server.js` loads dotenv, imports `express-async-errors`, creates Express app, invokes DB connection, installs Helmet/CORS/Morgan/JSON middleware, mounts routes, 404 and error handlers, then listens.
- `routes/` declares HTTP method, path and middleware.
- `controllers/` combine request parsing, validation, domain decisions and Mongoose operations.
- `models/` define schema constraints, refs, hooks and indexes.
- `middleware/auth.js` verifies JWT and loads user; `isAdmin.js` checks role.
- `middleware/errorHandler.js` exports a helper and async wrapper, but is not wired into server (server has its own error handler).
- ❌ No service, repository, request DTO/validator, policy, job, queue, event-listener, notification, scheduler or command layer was found.

## 14. Routes & APIs

All API paths are mounted under `/api` in `server.js`.

| Method | Route | Auth | Handler | Purpose |
|---|---|---|---|---|
| GET | `/health` | Public | inline | Health response and timestamp |
| POST | `/auth/register` | Public | authController.register | Create user and token |
| POST | `/auth/login` | Public | authController.login | Verify credentials and token |
| GET | `/auth/me` | Bearer | authController.getMe | Current account |
| PUT | `/users/me` | Bearer | userController.updateMe | Update profile fields |
| PUT | `/users/me/password` | Bearer | userController.updatePassword | Verify old and save new password |
| GET/POST/DELETE | `/users/me/favorites` | Bearer | userController | Legacy user-embedded venue favorites |
| GET | `/users` | Bearer + admin | userController.getAllUsers | List users without password |
| GET | `/venues` | Public | venueController.getVenues | List active, filtered venues |
| GET | `/venues/:id` | Public | venueController.getVenueById | Venue detail |
| POST/PUT/DELETE | `/venues[/:id]` | Bearer + admin | venueController | Create/update/soft-disable venue |
| POST | `/bookings` | Bearer | bookingController.createBooking | Create confirmed unpaid booking |
| GET | `/bookings/my` | Bearer | bookingController.getMyBookings | Current user bookings |
| GET | `/bookings/venue/:venueId/slots` | Public | bookingController.getBookedSlots | Read booked slots for date |
| GET | `/bookings` | Bearer + admin | bookingController.getAllBookings | List bookings |
| GET | `/bookings/:id` | Bearer + owner/admin | bookingController.getBookingById | Booking detail |
| PUT | `/bookings/:id/cancel` | Bearer + owner/admin | bookingController.cancelBooking | Cancel booking |
| — | `PUT /bookings/:id` | — | ❌ Not found | Frontend helper/admin UI calls it, backend does not define it |
| GET | `/events` | Public | connectEventController.getEvents | Open/full event list and filters |
| GET | `/events/:id` | Public | connectEventController.getEventById | Event detail |
| POST | `/events` | Bearer | createEvent | Create event; creator starts as participant |
| PUT | `/events/:id/join` | Bearer | joinEvent | Join event |
| PUT | `/events/:id/leave` | Bearer | leaveEvent | Leave event (creator cannot) |
| DELETE | `/events/:id` | Bearer + creator/admin | deleteEvent | Soft-cancel event |
| GET | `/events/admin/all` | Bearer + admin | getAllEvents | Admin event list |
| PUT | `/events/admin/:id` | Bearer + admin | updateEvent | Update allowed event fields |
| DELETE | `/events/admin/:id` | Bearer + admin | deleteEventAdmin | Hard delete event |
| PUT | `/events/admin/:id/approve` | Bearer + admin | approveEvent | Set status open |
| PUT | `/events/admin/:id/reject` | Bearer + admin | rejectEvent | Set status cancelled |
| GET | `/favorites` | Bearer | favoriteController.getFavorites | Read separate Favorite documents |
| POST/DELETE | `/favorites/venue/:venueId` | Bearer | favoriteController | Venue favorites in Favorite collection |
| POST/DELETE | `/favorites/event/:eventId` | Bearer | favoriteController | Event favorites in Favorite collection |

Response envelope conventions vary (`{venue}`, `{booking}`, `{event}`, `{user}`, lists, and auth root token/user). Frontend clients should be reconciled against these exact responses before changing them.

## 15. Database Architecture

MongoDB is accessed through Mongoose. `MONGODB_URI` is required by `connectDB`; connection options set retryWrites, majority write concern, server selection timeout 5s and socket timeout 45s. No migrations, seed scripts, transaction setup, DB lifecycle command or production backup procedure is implemented in source. JSON fixtures exist under `data_dump/`; they are not evidence of a live DB.

## 16. Models & Relationships

| Model / collection | Important fields and constraints | Relationships/indexes |
|---|---|---|
| User | name/email/password, role `user|admin`, sports `football|basketball`, city, phone, avatar, isActive, favorites | email unique; password `select:false`, minlength 6, bcrypt pre-save; favorites array refs Venue. |
| Venue | name, description, sport `football|basketball|both`, address, GeoJSON location, images, pricePerHour, capacity, status, amenities, openingHours, isActive, createdBy | createdBy→User; location 2dsphere index. Status enum active/draft/archived coexists with boolean isActive. |
| Booking | user, venue, date, startTime/endTime, durationHours, totalPrice, sport, status, paymentStatus, notes, cancellation fields | user→User, venue→Venue; compound `(venue,date,startTime)` index; no unique overlap rule. |
| ConnectEvent | creator, title, sport, description, location, date/time, maxParticipants, participants, skillLevel, isPublic, status | creator/participants→User; pre-save hook toggles full/open based on participants. |
| Favorite | user, optional venue, optional event | refs to User/Venue/ConnectEvent; indexes `(user,venue)` and `(user,event)` are not unique. Pre-save checks at least one relation but does not enforce exactly one. |

The schema uses Mongoose ObjectIds as `_id` primary identifiers. No explicit cascade deletion is configured. Venue deletion is soft; user/event hard-delete cascades are not shown. Orphan-population behavior is not runtime-tested.

## 17. Business Logic

| Rule | Location | Input/output and constraints | Issue/edge case |
|---|---|---|---|
| Password hash/compare | `models/User.js`; `authController.js` | bcrypt salt rounds 12 on modified password; compare on login/current-password check. | Min length 6 only; no rate limit or reset flow. |
| Venue visibility | `venueController.getVenues/getVenueById` | Query requires `isActive:true`; public detail returns 404 for inactive. | Admin list uses same public list and may not show disabled entries. |
| Booking price | `bookingController.createBooking` | `durationHours × venue.pricePerHour`; status confirmed, payment unpaid. | No payment capture; date/time and venue hours not comprehensively checked. |
| Booking conflict | `bookingController.createBooking` | Tests interval overlap on same venue and exact date excluding cancelled. | Read-then-create race; date/time representation consistency matters. |
| Event full state | `ConnectEvent` pre-save plus join/leave controller | Participant count compared with max, status full/open. | Concurrent joins can exceed max; status recalculation can reopen previously closed-by-other-reason events. |
| Resource ownership | booking get/cancel; event delete/leave | Owner or admin can view/cancel booking; creator/admin can delete event; creator cannot leave. | Static review only; no authorization test suite. |
| Favorites | userController and favoriteController | Two distinct persistence rules/APIs. | System-level state diverges. |

Frontend and backend validations are not equivalent: UI uses native required checks and fixed slot choices; backend validates only selected required fields and model enums/limits. No shared contract/schema is present.

## 18. Authentication

Registration checks required name/email/password and existing email, then creates User and signs JWT. Login looks up email with password selected and compares bcrypt. `protect` requires `Authorization: Bearer …`, calls `jwt.verify` with `JWT_SECRET`, loads User by token `id`, and rejects missing/invalid user/token. Token expiry is configured via `JWT_EXPIRES_IN`; example config provides a value, but actual active config was not inspected.

Frontend stores token under `hobbook_token` in localStorage and adds it to all Axios requests. On any 401 the response interceptor removes token/user keys and navigates to login. Server has no logout route, refresh, revocation list, email verification or password reset.

## 19. Authorization

Roles are User model enum `user|admin`. `isAdmin` checks `req.user.role`. Admin middleware is applied to venue writes, user listing, booking listing and admin event routes. User profile/favorites are scoped to `req.user`; booking reads/cancels and event deletion include ownership checks. Frontend ProtectedRoute checks local auth state and admin role, but backend middleware is the effective access boundary. No centralized policy system exists.

## 20. Security

| Area | State |
|---|---|
| Password storage | ✅ bcrypt pre-save hashing; password excluded by default from queries. |
| JWT | 🟡 Bearer verification present. Static sample signing key appears in checked-in template; value intentionally omitted. Startup does not visibly validate key strength/presence before listen. |
| Authorization | ✅ Admin gates and selected ownership checks are present; not independently tested. |
| Input validation | ⚠️ Inconsistent; some required checks and Mongoose enums, but broader semantic/time validation absent. Venue update passes body to Mongoose update. |
| CORS | ⚠️ `cors()` has no origin allowlist. |
| CSRF | 🟡 Bearer token is not cookie-based, so conventional cookie CSRF is not the main mechanism; no explicit CSRF middleware found. |
| XSS | 🟡 React text rendering normally escapes strings; no `dangerouslySetInnerHTML` found in source scan. Token in localStorage remains exposed to same-origin script execution. |
| SQL injection | N/A to MongoDB; city filter uses user-provided regex string. Regex cost/injection behavior is not constrained or runtime tested. |
| File uploads | ❌ No upload flow found; venue image values are strings/URLs. |
| Rate limits | ❌ No rate-limiting middleware found on auth endpoints. |
| Sensitive data | ✅ `getAllUsers` excludes password; auth response returns selected public user fields. Actual env/database data not inspected. |
| Error exposure | ⚠️ Global handler returns `err.message` in all environments and stack in development. Some errors may reveal internal detail. |
| DB guidance | ⚠️ README_MONGODB recommends broad Atlas permissions/network access and destructive `--drop` import. |

Do not copy any credential values from `.env.example` or README into another file. Production security cannot be assessed without active deployment configuration.

## 21. Jobs & Queues

❌ No queue library, worker, job model, event listener, scheduled task, notification processor, or background processing configuration was found. Event/Connect refers to product domain events, not a message queue implementation.

## 22. External Integrations

- **MongoDB:** required backend persistence via Mongoose; URI from environment. No live connectivity verified.
- **Google Fonts / Material Symbols:** frontend index links external stylesheets; no fallback verification performed.
- **Placeholder image service:** VenueCard uses `via.placeholder.com` when no venue image exists.
- **Payments/email/maps/AI:** ❌ no implementation found. `paymentStatus` fields are data labels only, not proof of a payment integration.

## 23. Testing

- Test frameworks/scripts: ❌ none found in project package scripts/files.
- Unit/integration/API/browser/E2E/regression tests: ❌ none found.
- Coverage: **Exact coverage unknown; no measurement exists.**

| Feature | Unit | Integration/API | E2E | State |
|---|---|---|---|---|
| Auth/profile | None found | None found | None found | Untested in repo |
| Venue search/admin | None found | None found | None found | Untested in repo |
| Booking/ownership/overlap | None found | None found | None found | High-risk untested flow |
| Event capacity/creator checks | None found | None found | None found | High-risk untested flow |
| Favorites | None found | None found | None found | Dual persistence untested |

The lint script references ESLint, but ESLint is not declared in the frontend lockfile/package manifest. No lint result is available.

## 24. Error Handling

`express-async-errors` is imported before app routes. `server.js` installs a 404 response and a final error handler that logs `err.stack`, chooses `err.status || 500`, returns `err.message`, and includes stack in development. The separate `middleware/errorHandler.js` supports certain error names and Mongo duplicate keys but is not mounted. Several controllers catch all errors themselves and return 500. Axios helpers variably rethrow simplified errors; page-level feedback also varies. No centralized frontend Error Boundary was found.

## 25. Logging & Observability

- Morgan request logging only when `NODE_ENV === 'development'`.
- Server errors use `console.error`; DB module logs connected/error/disconnected events.
- `/health` only returns `{status: OK, timestamp}`; it does not confirm DB readiness.
- ❌ No metrics, tracing, alerting, audit log, log aggregation, or failed-job system found.

## 26. Configuration

| Setting | Source/use | Notes |
|---|---|---|
| `PORT` | backend server | Defaults to 5000. |
| `NODE_ENV` | server logging/error responses | Development enables Morgan and stack response. |
| `MONGODB_URI` | `config/db.js` | Required; missing URI exits process. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | auth controller/middleware | Signing/verify config; template contains weak/static example key (omitted). |
| `VITE_API_URL` | Axios/config | Defaults to `http://localhost:5000/api`. |
| Vite port | `frontend/vite.config.ts` | 5173; docs say 5174. |
| `CLIENT_URL` | `.env.example` | Listed in template, but server CORS setup does not consume it. |

`.env` is ignored by root `.gitignore`; the local backend env file was not read. There is no separate production config or validation layer shown.

## 27. Dependencies

Primary dependencies by manifest purpose:

| Dependency | Resolved version | Use |
|---|---:|---|
| express | 4.22.1 | Backend web framework |
| mongoose | 8.24.5 | MongoDB ODM |
| bcryptjs | lockfile | Password hashing |
| jsonwebtoken | lockfile | JWT sign/verify |
| helmet | lockfile | HTTP security headers |
| cors | lockfile | CORS middleware |
| dotenv | lockfile | Environment loading |
| morgan | lockfile | Development request logs |
| express-async-errors | lockfile | Async Express error propagation |
| react / react-dom | 18.3.1 | Frontend |
| react-router-dom | 6.30.3 | Frontend routing |
| axios | lockfile | HTTP API client |
| typescript | 5.9.3 | Type checking |
| vite | 5.4.21 | Dev/build tool |

Potential dependency/config issue: `frontend/package.json` lint script invokes ESLint, but ESLint is not declared as a dependency. No install/update was performed. Dependency vulnerability status was not audited against external advisories.

## 28. UI/UX State

The UI has dedicated pages and CSS for major domains, reusable loading/error/empty-state elements, and visible feedback in several forms. Evidence is static source only. Specific inconsistencies: dashboard route is About content; venue cards show price with `$` while docs/product are German; fixed slot selector ignores configured opening hours; profile shows a fixed member year; admin event text promises approval controls not shown in the list. Search/pagination is local over at most 50 fetched venues. These are functional/content observations, not aesthetic judgments.

## 29. Accessibility

Native `label`, input, button, and table elements are used in portions of the app; VenueCard favorite button has an `aria-label`. A complete audit was not performed. Search labels are not consistently connected through `htmlFor`/IDs in the inspected source; some icon-only admin buttons should be checked for accessible names. Keyboard/focus, contrast, zoom and screen-reader behavior are ❓ UNKNOWN pending manual/browser testing.

## 30. Performance

No measured performance data exists.

- **STATICALLY IDENTIFIED:** backend list endpoints fetch all matching records for venues, events, bookings and users without server pagination; VenueContext sends skip/limit that venue controller ignores.
- **POTENTIAL:** data growth can increase response size, DB work and client memory. City regex filters may require scans absent a suitable index. This was not benchmarked.
- **POTENTIAL:** Connect event reads populate creator/participants; per-list cost depends on collection size.
- No application cache, lazy API pagination, queue, or measured N+1 issue was confirmed.

## 31. Technical Debt

| ID | Priority | Problem/location | Impact / direction |
|---|---|---|---|
| TD-01 | P1 | Frontend TS/build configuration and accumulated diagnostics (`frontend/tsconfig.json`, pages) | Blocks build; repair and make typecheck a delivery gate. |
| TD-02 | P1 | Booking overlap check and event capacity check are non-atomic | Core data integrity can fail under concurrency; use atomic DB-level operations/transactions. |
| TD-03 | P2 | API response shape mismatch across frontend/backend modules | Actions return undefined/fail; align contract and types. |
| TD-04 | P2 | Two favorite persistence designs | Duplicate business logic and divergent user state; consolidate with migration plan. |
| TD-05 | P2 | Controllers own validation, domain logic and data access | Harder to test and evolve; extract only where concrete reuse/domain boundaries warrant it. |
| TD-06 | P2 | No project tests/CI/lint dependency | Regressions have no automated signal; add scoped checks after build recovery. |
| TD-07 | P2 | Inconsistent status/payment concepts and stale docs | UI may promise workflows backend does not implement; reconcile product rules and docs. |
| TD-08 | P3 | Unused imports/state handlers and possible stale components | Strict compiler reports cleanup issues; confirm usage before removal. |

## 32. Known Issues

### ISSUE-BUILD-01 — Frontend type/build gate fails

- **Priority:** P1; **Status:** ⚠️ ISSUE.
- **Evidence/location:** TypeScript 5.9.3 rejects `ignoreDeprecations: "6.0"` in `frontend/tsconfig.json`. A command-line override exposes further errors in `axiosInstance.ts`/`constants/config.ts` (missing ImportMeta env typing), `HomePage.tsx` and `SearchPage.tsx` (`isAuthenticated` absent), SearchPage vs VenueCard props, FavoritesPage type cast, VenueDetailPage string/object mismatch, missing PNG module declaration, and unused symbols under `noUnusedLocals`.
- **Impact:** frontend build/type safety is not currently passing.
- **Next check:** correct TS option/type setup, resolve each diagnostic, then run declared build script.

### ISSUE-BOOK-01 — Booking conflict check is race-prone

- **Priority:** P1; **Status:** ⚠️ ISSUE.
- **Evidence:** `bookingController.createBooking` checks conflicts with a query and later creates a document; `Booking.js` index is non-unique and cannot prevent overlapping intervals.
- **Impact:** simultaneous requests can both book overlapping times.
- **Next check:** define concurrency-safe reservation approach and add simultaneous-request integration test.

### ISSUE-EVENT-01 — Event participant limit is race-prone

- **Priority:** P1; **Status:** ⚠️ ISSUE.
- **Evidence:** controller loads event, checks status/participant membership, pushes and saves; no atomic condition guards capacity.
- **Impact:** concurrent joins can exceed `maxParticipants`.
- **Next check:** use conditional atomic update/transaction and capacity tests.

### ISSUE-API-01 — API contract mismatch

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** password client route/method differs from userRoutes; booking update helper path has no route; booking detail and venue update response envelopes differ from clients.
- **Impact:** password change, admin booking update, booking detail and Venue update fail or return undefined.
- **Next check:** build endpoint/response contract table and verify each client operation.

### ISSUE-FAV-01 — Dual favorite persistence and type confusion

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** User has `favorites[]`; separate Favorite model/controller also exist. Frontend uses old user API in pages and separate favorite API module exists. Favorite values are populated venue objects in one route but treated as string IDs in some pages.
- **Impact:** inconsistent toggles and hidden/out-of-sync favorites.
- **Next check:** select canonical model, migrate data, align response types and consumers.

### ISSUE-SEC-01 — Static signing key in checked-in example

- **Priority:** P1 if copied unchanged; **Status:** ⚠️ ISSUE / configuration risk.
- **Evidence:** `backend/.env.example` contains a fixed sample JWT secret; exact value intentionally omitted.
- **Impact:** deployments reusing it may permit predictable signing key exposure.
- **Next check:** ensure deployment uses private high-entropy secret and fail startup if missing/default.

### ISSUE-SEC-02 — Broad CORS and no rate limiting

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** `cors()` is called without allowlist; no auth rate-limit middleware/package found.
- **Impact:** broader browser access and avoidable brute-force/abuse exposure. Concrete exploit not demonstrated.
- **Next check:** define production origin policy, add auth throttling and test.

### ISSUE-DOC-01 — Setup and import docs do not match repository

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** docs state port 5174 while Vite uses 5173. Mongo guide uses `./dump` with `mongorestore --drop`; repository has `data_dump/test.*.json`, not a BSON dump directory.
- **Impact:** new developer setup/import is likely to fail; `--drop` could remove existing target collections if used.
- **Next check:** document the actual JSON import process or provide a verified dump/export workflow.

### ISSUE-EVENT-02 — Approval workflow not represented consistently

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** events default open and enum is `open|full|cancelled|completed`; UI claims approval, but admin list does not expose approve/reject and no pending enum exists.
- **Impact:** moderation behavior advertised by docs/UI is not implemented as a coherent workflow.
- **Next check:** clarify whether events require approval and align model, API, admin UI and docs.

### ISSUE-BOOK-02 — Booking business constraints incomplete

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** controller checks required identifiers and positive duration; does not check Venue active status/open hours, date in future, sport compatibility or a normalized time format. UI generates fixed 08:00–22:00 slots.
- **Impact:** bookings may violate venue/product rules; exact exploitability depends on intended business policy.
- **Next check:** define policy and validate it server-side with negative tests.

### ISSUE-ADMIN-01 — Admin booking status controls call absent endpoint

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** BookingsAdminPage calls `updateBooking()` → `PUT /bookings/:id`; bookingRoutes has no such route.
- **Impact:** visible status actions cannot persist.
- **Next check:** implement authorized route/controller after confirming supported transitions, or remove controls.

### ISSUE-DATA-01 — Model and UI status/revenue mismatch

- **Priority:** P2; **Status:** ⚠️ ISSUE.
- **Evidence:** new bookings are immediately `confirmed` and `unpaid`; AdminDashboard includes confirmed bookings in revenue sum.
- **Impact:** revenue metric can count unpaid bookings and pending counters remain unused for normal new bookings.
- **Next check:** define whether “revenue” means booked value or money collected; calculate accordingly.

## 33. System Inconsistencies

1. **Port:** Vite uses 5173; README/Mongo guide instruct 5174.
2. **Styling:** README says CSS Modules; files are standard CSS imports.
3. **Dashboard:** README advertises user activity dashboard; `/dashboard` is About/developer page.
4. **Auth state:** context has `isLoggedIn`; Home/Search read nonexistent `isAuthenticated`.
5. **Password route:** client POST `/users/change-password`; server PUT `/users/me/password`.
6. **Current profile route:** helper GET `/users/me`; server current-user GET is `/auth/me`.
7. **Booking detail response:** frontend reads `data.data`; controller returns `{booking}`.
8. **Venue update response:** frontend reads `data.data`; controller returns `{venue}`.
9. **Booking admin mutation:** frontend exposes update; backend route absent.
10. **Event moderation:** docs/UI describe approvals; model/create flow immediately exposes open events.
11. **Favorites:** User embedded refs coexist with Favorite collection and separate routes.
12. **Sports casing:** profile options are title case; User enum values are lowercase.
13. **Venue sports:** Venue supports `both`; Booking/ConnectEvent accept only football/basketball.
14. **Data import:** docs use `mongorestore ./dump`; actual directory contains JSON fixtures under `data_dump/`.
15. **Pagination:** frontend sends skip/limit, venue controller ignores them; other list endpoints also unbounded.

## 34. Dead / Legacy / Duplicate Code

- **Confirmed duplication:** two favorite storage/controller systems described above.
- **Potentially unused:** `frontend/src/api/favoriteApi.ts` appears separate from pages that import userApi; do not delete until all dynamic/import consumers are searched in a dedicated cleanup.
- **Potentially unused:** `frontend/src/components/venue/FilterPanel.tsx` is not visibly used by SearchPage (SearchPage has its own filter UI); verify all imports before treating as dead.
- **Confirmed lint/type cleanup:** compiler reports unused symbols including FilterPanel `useEffect`, VenueList `Venue`, ConnectPage `handleToggleFavorite`/parameter, Dashboard `navigate`, and favorite-loading state in Home/Search.
- `middleware/errorHandler.js` is exported but server uses an inline handler instead.
- No TODO/FIXME inventory was considered exhaustive across generated/dependency folders; no claim of comprehensive dead-code detection.

## 35. Connection Map — WHAT CONNECTS TO WHAT?

```text
Auth:
LoginPage/RegisterPage → AuthContext → Axios → authRoutes → authController → User
ProtectedRoute → AuthContext
Axios interceptor → localStorage token → Authorization header

Venue discovery:
Home/Search/VenueDetail → VenueContext or venueApi → venueRoutes → venueController → Venue
VenueForm/AdminList → venueApi → protected venue routes → Venue

Booking:
VenueDetail → bookingApi → bookingRoutes → bookingController → Booking + Venue + User
BookingsPage → bookingApi → protected /bookings/my + cancel route → Booking
BookingsAdminPage → updateBooking helper → missing PUT route (broken connection)

Connect events:
Connect/Create/Admin pages → connectEventApi/EventContext → connectEventRoutes
  → connectEventController → ConnectEvent ↔ User creator/participants

Favorites (two parallel paths):
Home/Search/Profile detail/FavoritesPage → userApi → /users/me/favorites → User.favorites → Venue
favoriteApi → /favorites routes → Favorite → Venue or ConnectEvent
```

## 36. Change Impact Map — IF YOU CHANGE X, CHECK Y

| Change | Also inspect |
|---|---|
| AuthState field/response | AuthContext, ProtectedRoute, HomePage, SearchPage, Navbar, Axios 401 behavior, authController responses |
| API URL/response envelope | matching `frontend/src/api/*.ts`, all pages/context consumers, route/controller response |
| User sports enum | ProfilePage options, User schema, event/venue sport constants, existing persisted values |
| Venue schema/availability | Venue model/controller, VenueForm, VenueDetail slot UI, booking creation, venueApi types, fixtures/docs |
| Booking status/rules | Booking model/controller/routes, bookingApi, VenueDetail, BookingsPage, BookingsAdminPage, Dashboard metrics |
| Event participant/status logic | ConnectEvent schema hook, controller join/leave/create/admin methods, ConnectPage, forms, API types, moderation copy |
| Favorite persistence | User model/controller, Favorite model/controller/routes, userApi, favoriteApi, Home/Search/VenueDetail/FavoritesPage, data fixtures |
| Route/middleware changes | route table, frontend API module, ProtectedRoute, auth/admin/owner tests (none currently exist) |
| Vite/TS config | package scripts, aliases/imports, `vite-env.d.ts`/asset declarations, README setup instructions |

## 37. Project Conventions

- Backend source uses JavaScript ES modules and default-exported Express routers/models.
- Frontend uses TypeScript React function components, named/default exports, `@` source alias, page-specific CSS imports.
- API clients generally return extracted response data and convert Axios errors to `Error`; conventions are inconsistent.
- Mongo schema models are one file each and re-exported through `backend/models/index.js`.
- Status and sports are string enums in models; UI labels are locally mapped and sometimes case-inconsistent.
- No formatter, lint ruleset, API schema, migration convention, or test convention was found.

## 38. Development Workflow

Commands supported by manifests/docs:

- Backend: `npm start` → `node server.js`; `npm run dev` → `nodemon server.js`.
- Frontend: `npm run dev` → Vite; `npm run build` → `tsc && vite build`; `npm run preview` → Vite preview; `npm run lint` → ESLint command (dependency absent).
- Database: backend expects `MONGODB_URI`; README describes Mongo setup/import but dump path/format is inconsistent with repository.
- Type check used in this audit: `tsc --noEmit`; it produced the failures documented above. A command-line override of `ignoreDeprecations` was used only to reveal further diagnostics; no files were changed.
- No `npm test`/test script is defined. No test command should be assumed.

## 39. Deployment & Production

❓ **Deployment state UNKNOWN.** No Dockerfile, compose file, CI/CD workflow, process manager config, hosting manifest, Nginx config, worker, or production environment template was found. Vite production source maps are enabled. README setup is local-development oriented. Production DB, CORS, key rotation, HTTPS termination, monitoring, backup/restore and deployment topology are not verifiable.

## 40. Production Readiness

| Area | Status | Reason |
|---|---|---|
| Functionality | 🟠 PROBLEMATIC | Pages/routes exist, but build and several API flows fail statically or by contract mismatch. |
| Architecture | 🟡 NEEDS IMPROVEMENT | Simple understandable monolith; controllers mix concerns and API contracts vary. |
| Backend | 🟡 NEEDS IMPROVEMENT | Core handlers exist; runtime and DB startup not verified; race conditions and validations remain. |
| Frontend | 🔴 CRITICAL | TypeScript/build check fails with installed compiler and source errors. |
| Database integrity | 🟠 PROBLEMATIC | Schema refs/indexes exist; no overlap/capacity atomicity, migration or verified data lifecycle. |
| Security | 🟠 PROBLEMATIC | Auth/role/owner checks present; sample key, broad CORS, no rate limits and error detail concerns. |
| Testing | 🔴 CRITICAL | No project tests or automated validation pipeline found. |
| Performance | ⚪ UNKNOWN / 🟡 | No measurements; unbounded list queries are statically identified. |
| Error handling | 🟠 PROBLEMATIC | Duplicate handlers, raw messages, inconsistent local catches and no Error Boundary. |
| Logging/observability | 🟠 PROBLEMATIC | Console/Morgan only; no metrics/monitoring/audit trail found. |
| UI/UX | 🟡 NEEDS IMPROVEMENT | Rich screens exist; functional/content inconsistencies and runtime verification gaps. |
| Accessibility | ⚪ UNKNOWN | No automated/manual audit evidence. |
| Deployment | ⚪ UNKNOWN | Deployment configuration not found. |
| Maintainability | 🟠 PROBLEMATIC | Type errors, duplicate favorite path, no tests and stale docs. |

## 41. Prioritized Problems

### P0 — CRITICAL

None confirmed from static inspection.

### P1 — HIGH

- `ISSUE-BUILD-01`: Frontend type/build gate fails. Location: `frontend/tsconfig.json`, frontend pages and API config. Impact: release/build blocked. Dependencies: fix config and all diagnostics.
- `ISSUE-BOOK-01`: booking conflict check is not atomic. Location: `backend/controllers/bookingController.js`, `backend/models/Booking.js`. Impact: overlapping concurrent bookings. Depends on chosen reservation integrity design.
- `ISSUE-EVENT-01`: event capacity check is not atomic. Location: `backend/controllers/connectEventController.js`, `backend/models/ConnectEvent.js`. Impact: participant limit can be exceeded concurrently.
- `ISSUE-SEC-01`: static sample JWT key in template. Location: `backend/.env.example`. Impact applies if reused unchanged; value omitted. Verify and enforce deployment secret.

### P2 — MEDIUM

- `ISSUE-API-01` and `ISSUE-ADMIN-01`: incorrect/missing API contracts break account, venue and admin booking actions.
- `ISSUE-FAV-01`: duplicate favorite persistence and mismatched object/ID types.
- `ISSUE-EVENT-02`: moderation copy/flow does not match model/default status.
- `ISSUE-BOOK-02`: booking constraints do not cover stated venue/time rules.
- `ISSUE-SEC-02`: broad CORS and no visible auth rate limits.
- `ISSUE-DOC-01`: MongoDB setup/import guidance mismatches fixtures and includes destructive import flag.
- `ISSUE-DATA-01`: dashboard revenue includes unpaid confirmed bookings.
- `PERF-01`: unbounded list queries and ignored pagination inputs.

### P3 — LOW

- `UX-01`: route/dashboard naming and About page purpose conflict with docs.
- Unused symbols/potentially stale components and source-map policy review.

## 42. Working Well

- Backend separates route declarations, controllers, models and middleware into recognizable folders.
- Passwords use bcrypt and are excluded from normal User query selection.
- Admin authorization is checked server-side rather than relying only on frontend route hiding.
- Booking ownership and event creator/admin checks are explicitly present in relevant controller paths.
- Mongoose schemas define useful enums, required fields, refs, a geospatial index and several query indexes.
- Frontend has reusable layouts, contexts, venue cards and common loading/error/empty-state components.

These are source-level observations, not claims that full workflows have passed runtime tests.

## 43. Incomplete Implementations

| Feature/area | Existing implementation | Missing/incomplete evidence |
|---|---|---|
| Build/type system | TS strict config and build script | Current compiler option and source diagnostics fail. |
| Password lifecycle | Change-password controller | Client targets nonexistent route/method; reset/verification absent. |
| Admin booking management | List page and update API helper | Server update endpoint/controller absent. |
| Event moderation | Admin approve/reject endpoints and copy | No pending status; create publishes as open; list UI lacks approve/reject controls. |
| Favorites | User array + Favorite model routes | Two disconnected persistence strategies and front type mismatches. |
| Booking integrity | Conflict query and compound index | Non-atomic overlap prevention and no full venue/time policy. |
| Pagination | Frontend sends skip/limit for venues | Backend ignores it; other lists unbounded. |
| Auth security | JWT + bcrypt | No rate-limit, revoke/logout, reset, verification; static template key. |
| Testing | package scripts for build/lint | No tests; ESLint script dependency missing. |
| Deployment/operations | local startup docs, health endpoint | Production/deploy/monitoring/backup configuration not found. |

## 44. Unknowns & Verification Gaps

- The active `backend/.env` contents and production secrets/config were deliberately not inspected.
- No database connection or production dataset was inspected; fixture JSON values were not read.
- No backend server, browser, or UI flow was executed.
- No tests were run because no project test suite/script exists; runtime functionality remains unverified.
- No live accessibility/device/responsive checks, performance benchmark, dependency advisory audit, or penetration test was performed.
- Deployment, hosting, TLS/proxy, backup, monitoring, and operational ownership are unknown.
- Whether event approval, paid bookings, venue ownership, and profile sport values are intended business rules requires product confirmation.
- Screenshots/PDF were not treated as proof of current source behavior.

## 45. Recommended Next Steps

1. Restore a clean TypeScript build and make it a required delivery check.
2. Reconcile API paths and response envelopes; prioritize password change, venue update, booking detail and admin booking status.
3. Choose one favorite model and align API/UI types before data migration.
4. Make booking overlap and event capacity enforcement concurrency-safe; define business constraints for dates, times, opening hours and sport compatibility.
5. Decide event moderation and booking/payment status lifecycle; align model, UI and docs.
6. Harden configuration: secret validation, CORS allowlist, auth throttling, production-safe error messages.
7. Add automated tests around login/ownership, booking concurrency/cancellation, event capacity and admin route authorization.
8. Add server-side pagination/limits and verify indexes against real query patterns.
9. Correct onboarding/import docs and establish a deployment/observability/backup plan.
10. Conduct manual browser, responsive and accessibility review after build succeeds.

## 46. AI Handover

### READ THIS FIRST

Hobbook is a React/TypeScript SPA with Express/Mongoose backend for sports venues, bookings and Connect events. Frontend pages live in `frontend/src/pages`; Axios clients in `frontend/src/api`; contexts in `frontend/src/store`. Backend routes, controllers and schemas live in `backend/routes`, `backend/controllers` and `backend/models`. Business logic is directly in controllers/models, not a service layer.

### MOST IMPORTANT FILES TO READ FIRST

1. `frontend/src/App.tsx` and `frontend/src/store/AuthContext.tsx`
2. `frontend/src/api/axiosInstance.ts` and the API module for the feature
3. `backend/server.js` and the corresponding `backend/routes/*.js`
4. Corresponding `backend/controllers/*.js` and `backend/models/*.js`
5. `frontend/tsconfig.json`, `frontend/vite.config.ts`, both package manifests

### MOST IMPORTANT FEATURES / MODELS

- Booking: `Booking`, `Venue`, `User`; verify overlap, price, ownership and status lifecycle.
- Connect event: `ConnectEvent`, `User`; verify participant count/capacity and creator ownership.
- Auth/profile: `User`, JWT and localStorage token flow.
- Favorites: **two competing implementations** (`User.favorites` and `Favorite` documents); do not add another path.

### MOST IMPORTANT SERVICES

No service classes/modules found. Controllers directly query Mongoose.

### MOST IMPORTANT USER FLOWS

Registration/login; venue search/detail/booking; user booking cancellation; event create/join/leave; profile edit/password change; admin venue/event/booking management.

### MOST IMPORTANT KNOWN ISSUES

P1: frontend build/type check fails; booking overlap and event capacity are race-prone; static JWT example key must not be reused. P2: API mismatches, favorites duplication, moderation inconsistency, incomplete booking validation, missing admin booking update route, stale docs.

### HIGH-RISK AREAS

- Booking and event concurrency/data integrity.
- User/admin ownership checks and auth state changes.
- Schema enum changes and existing fixture/database values.
- Favorite consolidation and any migration.
- API response shape changes because pages have assumptions not represented in shared generated contracts.

### BEFORE MODIFYING ANYTHING

- Run/repair type check first; current baseline has known errors.
- Trace frontend API module → route → controller → model and verify response envelope.
- Check all pages/contexts consuming shared state, enum or model fields.
- Preserve server-side admin/ownership enforcement; client guards are not a substitute.
- Define desired capacity, opening-hour, moderation and payment rules before changing them.
- Do not expose or copy local env/fixture secrets or personal values.
- There are no tests; add targeted tests before risky business-rule changes.

### CURRENT UNKNOWNS

Active env, DB/deployment, runtime/browser behavior, test data validity, business decisions on approvals/payment/venue hours, and production operations are unverified.

## 47. Quick AI Context

- **Purpose:** venue discovery/booking and local sports-event platform.
- **Stack:** React 18, TS 5.9, Vite 5, React Router 6, Axios; Express 4, Mongoose 8, MongoDB; JWT/bcrypt.
- **Architecture:** React page → context/API client → Express route/middleware/controller → Mongoose model → MongoDB. No service/queue/cache layer.
- **Core features:** auth/profile, venues, bookings, Connect events, favorites, admin.
- **Core models:** User, Venue, Booking, ConnectEvent, Favorite.
- **Auth:** Bearer JWT from localStorage; backend hydrates current user; admin role middleware. Client logout route is absent.
- **Major issues:** build/typecheck fails; booking/event capacity race; API path/response mismatches; favorites duplicated; no tests; docs stale; static sample JWT key.
- **Development:** frontend dev port 5173; backend default 5000; `VITE_API_URL` defaults to localhost API; database requires `MONGODB_URI`.
- **Critical files:** `frontend/src/App.tsx`, `AuthContext.tsx`, `api/axiosInstance.ts`; `backend/server.js`, `routes/`, `controllers/`, `models/`.
- **Tests/deployment:** no project test suite or deployment pipeline/config found. Runtime production state unknown.
- **First action for future engineering work:** repair the TS baseline, then reconcile API contracts before feature edits.
