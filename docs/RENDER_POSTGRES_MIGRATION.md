# Render + PostgreSQL Migration

This branch migrates HMSystem from a static Namecheap prototype toward a shared Render-hosted app backed by PostgreSQL.

## Current Migration Slice

- The existing static UI remains in `public/`.
- `server.js` still serves the static frontend.
- `server.js` now also exposes API routes under `/api/`.
- `/api/health` verifies that the Node service is running.
- If `DATABASE_URL` is configured, `/api/health` also checks PostgreSQL connectivity.
- `/api/state` returns the shared PMS state used by the UI.
- The current UI writes reservations, room assignment, check-in, room status, service charges, payments, check-out, and demo reset through the API.
- `/api/rooms` returns persisted room inventory.
- `/api/bootstrap` returns persisted roles, users, service categories, and the active business date.

## Local Development

Create a local `.env` from `.env.example` if you want to test PostgreSQL locally.

```powershell
copy .env.example .env
```

Run the app:

```powershell
npm start
```

Health endpoint:

```text
http://localhost:3000/api/health
```

Without `DATABASE_URL`, the API should return `database.status = "not_configured"`.

Persistence endpoints:

```text
http://localhost:3000/api/state
http://localhost:3000/api/rooms
http://localhost:3000/api/bootstrap
```

Without `DATABASE_URL`, these return HTTP `503` with `DATABASE_URL is not configured`.

## Render Deployment Shape

`render.yaml` defines:

- a Node web service named `hmsystem`
- a PostgreSQL database named `hmsystem-postgres`
- `DATABASE_URL` injected from the Render database connection string

Render build command:

```bash
npm ci && npm run build:css
```

Render start command:

```bash
npm start
```

## Migration Phase Status

Completed:

1. Add PostgreSQL schema and seed scripts based on the static PMS data.
2. Add API endpoints for shared rooms, reservations, stays, folios, users, services, and reset.
3. Replace initial browser state with API-loaded state when a database is configured.
4. Replace current core frontend mutations with API writes.
5. Add practicum demo reset.

Next:

1. Add real login/session handling.
2. Enforce role permissions in the backend.
3. Add full operator/session audit logging for every write.
4. Add manual refresh, polling, or realtime refresh so concurrent users see shared state without browser reload.

## Important Boundary

The current UI role system is still frontend-only. Once writes move to the API, permissions must be enforced in `server.js` or backend route modules, not only by hiding buttons in the browser.

## Database Migration

The first schema lives at:

```text
db/schema.sql
```

Run it against the configured `DATABASE_URL`:

```powershell
npm run db:migrate
```

Seed baseline roles, demo users, service categories, business date, and room inventory:

```powershell
npm run db:seed
```

The schema currently covers:

- roles and users
- business dates and shift sessions
- rooms and room status history
- guest profiles and identification records
- reservations
- stays
- folios and folio transactions
- service categories
- mock card payment methods and authorizations
- audit events

Initial seed data currently covers:

- demo roles
- demo users
- service categories
- current business date
- room inventory/status baseline
- due-in arrivals for the current Asia/Manila business date
- active in-house guests
- folios and starter payment examples
- practicum reset baseline
