# Deployment (free tier)

Target setup: **Cloudflare Pages** (frontend) + **Render** free web service (API) + **MongoDB Atlas** M0 (database). All three have free plans. Their terms and limits change, so check them on the day you sign up.

Known limits of this setup:

- The Render free instance sleeps after about 15 minutes without requests. The first request afterwards can take up to a minute. The app shows a "Server startet gerade" notice while it waits.
- Atlas M0 has 512 MB of storage and no automatic backups. `.github/workflows/backup.yml` exports the data weekly.
- Render's free plan has no fixed outgoing IP address, so Atlas must accept connections from any address. The database password is then the only protection: make it long and random.

## 1. Secrets (do this first)

Earlier versions of this repository contained a database connection string and a JWT secret. Treat both as public.

1. In Atlas → Database Access: delete the old database user or change its password. Create a user with a new random password (40+ characters, letters and digits only so it needs no URL encoding).
2. Generate a new JWT secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. Never put these values in a file that is committed. They go into the hosting provider's settings (steps 3 and 4) and into your local `backend/.env`, which git ignores.

## 2. Database (MongoDB Atlas)

1. Use a cluster in Frankfurt (`eu-central-1`) so the data stays in the EU.
2. Network Access → allow `0.0.0.0/0` (see the limit above).
3. Copy the connection string and add a database name, e.g. `...mongodb.net/hobbook?retryWrites=true&w=majority`.
4. If the database still holds old test data from the venue/booking version, the simplest path is a fresh database name. To keep old events instead, run the migration first as a dry run:

   ```bash
   cd backend
   npm run migrate:events
   ```

## 3. API (Render)

1. New → Web Service → connect the GitHub repository.
2. Settings:

   | Setting | Value |
   |---|---|
   | Root directory | `backend` |
   | Build command | `npm ci --omit=dev` |
   | Start command | `node server.js` |
   | Region | Frankfurt |
   | Instance type | Free |
   | Health check path | `/health` |

3. Environment variables:

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | the Atlas connection string |
   | `JWT_SECRET` | the generated secret |
   | `CLIENT_URL` | the frontend address from step 4, e.g. `https://hobbook.pages.dev` (several addresses: comma-separated, no trailing slash) |
   | `TRUST_PROXY` | `1` |

4. After the deploy, open `https://<your-service>.onrender.com/health`. It must answer `{"status":"OK","db":"up",...}`.

The server refuses to start in production without `JWT_SECRET` or with a weak one. That is intended.

## 4. Frontend (Cloudflare Pages)

1. Workers & Pages → Create → Pages → connect the GitHub repository.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

3. Environment variables (Production):

   | Name | Value |
   |---|---|
   | `NODE_VERSION` | `20` |
   | `VITE_API_URL` | `https://<your-service>.onrender.com/api` |
   | `VITE_OPERATOR_NAME` | your full name (imprint) |
   | `VITE_OPERATOR_ADDRESS` | street and city, lines separated by `;` |
   | `VITE_OPERATOR_EMAIL` | contact address |
   | `VITE_SUPPORT_URL` | optional: your donation page (must start with `https://`) |

   The three `VITE_OPERATOR_*` values fill the imprint and the privacy page. While one is missing, both pages show a visible "not filled in yet" warning.

4. `frontend/public/_redirects` makes deep links such as `/events/123` work. `frontend/public/_headers` sets the security headers (Content-Security-Policy and others). Both are picked up automatically.
5. Go back to Render and set `CLIENT_URL` to the final Pages address, otherwise the browser blocks API calls (CORS).

## 5. First admin account

Register normally on the live site, then give that account the moderation role from your computer:

```bash
cd backend
MONGODB_URI="<atlas connection string>" npm run make-admin -- you@example.org
```

## 6. Backups

Repository → Settings → Secrets and variables → Actions → add `MONGODB_URI`. The backup workflow then runs every Monday and on demand (Actions → Database backup → Run workflow). The artifact contains personal data; the repository must stay private.

## 7. Check the live site

- `/health` answers `OK` with `db: up`.
- Landing page, discover list and map tiles load.
- Register (with the 16+ box), create an event, join it with a second account, cancel it.
- Open an event link directly in a new tab (tests the SPA fallback).
- Imprint and privacy page show your details and no warning.
- Repeat the main flow on one iPhone and one Android phone.

## Moving to other hosting later

Nothing in the code is tied to these providers. The API is a plain Node.js server configured by environment variables, the frontend is a static build. `_redirects` and `_headers` use the Cloudflare/Netlify file format; on another host, configure the same SPA fallback and headers there.

## Legal reminders (need your own check)

- The imprint and privacy texts describe what the code does. They are not legal advice.
- The privacy page names Cloudflare, Render and MongoDB Atlas. Update `frontend/src/pages/legal/LegalPages.tsx` if you host elsewhere.
- Donations to a private person can have tax consequences. Check this before enabling the support link.
