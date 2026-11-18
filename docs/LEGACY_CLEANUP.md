# Legacy Cleanup (done)

The venue marketplace, booking, favorites and "About/Dashboard" code was deleted on 2026-11-18. It remains available in git history (last present in commit `d52fba3`).

Removed:

- Backend: venue, booking and favorite routes, controllers and models; the unused `middleware/errorHandler.js`; the `favorites`, `phone` and `avatar` fields on `User`.
- Frontend: `src/legacy/`, `src/constants/config.ts`, `src/constants/theme.ts`, `src/assets/icons/`.

## Still open: old data in the database

Deleting the code does not touch the database. An existing database may still contain:

- `venues`, `bookings`, `favorites` collections: no longer read by any code. Export them if you want a record, then drop them.
- `favorites`, `phone`, `avatar` values on old user documents: ignored by the app. Remove them with an `$unset` update if you want the data gone.
- Old Connect events (date + time strings, free-text location). Migrate them with:

```bash
cd backend
npm run migrate:events            # dry run: prints what would change
npm run migrate:events -- --apply # writes
```

The script never invents coordinates. Events without a real point stay in the list but are not shown on the map.
