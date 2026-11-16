# Legacy Cleanup List

Hobbook is now a free community sports-event platform (see [product/FREE_SPORTS_EVENTS_USER_STORY.md](product/FREE_SPORTS_EVENTS_USER_STORY.md)). The venue marketplace, booking, favorites and "About/Dashboard" flows were **removed from the product UX** on 2026-11-16 but their files were kept so the removal is reversible. Delete them in a separate cleanup commit once the new product is accepted.

## Not mounted / not bundled anymore

### Backend (files exist, routes are not mounted in `backend/app.js`)
- `backend/routes/venueRoutes.js`, `backend/controllers/venueController.js`, `backend/models/Venue.js`
- `backend/routes/bookingRoutes.js`, `backend/controllers/bookingController.js`, `backend/models/Booking.js`
- `backend/routes/favoriteRoutes.js`, `backend/controllers/favoriteController.js`, `backend/models/Favorite.js`
- `User.favorites` field in `backend/models/User.js` (no longer read or written)
- `backend/middleware/errorHandler.js` (was never mounted; `app.js` has the single error handler)

Before deleting the models, decide what to do with existing `venues`, `bookings`, `favorites` collections in the database (export/archive, then drop).

### Frontend (moved to `frontend/src/legacy/`, excluded from TypeScript, ESLint and the bundle)
- `legacy/pages/main/*` — Home, Search, VenueDetail, Bookings, Favorites, Dashboard ("About us")
- `legacy/pages/admin/*` — venue/booking admin, old event admin and dashboard
- `legacy/pages/connect_old/*` — old Connect list and create form (replaced by `pages/events/*`)
- `legacy/components/*` — VenueCard, SearchBar, FilterPanel, FavoriteButton, JoinButton
- `legacy/store/*` — Venue, Booking, Event contexts
- `legacy/api/*` — venue, booking, favorite, old connectEvent API modules
- `legacy/images/*`

### Probably unused (verify, then delete)
- `frontend/src/constants/config.ts`, `frontend/src/constants/theme.ts` (no imports found)
- `frontend/src/assets/icons/*.png` (no imports found)
- `frontend/src/components/common/{Button,Input,ErrorMessage,EmptyState}.*` (new pages use the global `.btn`/`.input` styles)

## Data migration
Existing Connect events use the old shape (`date` + `startTime`/`endTime`, free-text location without verified coordinates). Run:

```bash
cd backend
npm run migrate:events            # dry run: prints what would change
npm run migrate:events -- --apply # writes
```

The script never invents coordinates. Events without a real point stay in the list but are not shown on the map.
