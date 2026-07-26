# Render + PostgreSQL Migration

This branch migrates HMSystem from a static Namecheap prototype toward a shared Render-hosted app backed by PostgreSQL.

## Current Migration Slice

- The existing static UI remains in `public/`.
- `server.js` still serves the static frontend.
- `server.js` now also exposes API routes under `/api/`.
- `/api/health` verifies that the Node service is running.
- If `DATABASE_URL` is configured, `/api/health` also checks PostgreSQL connectivity.
- `/api/rooms` returns persisted room inventory once PostgreSQL is configured.
- `/api/bootstrap` returns persisted roles, users, service categories, and the active business date once PostgreSQL is configured.

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

Read-only persistence endpoints:

```text
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

## Planned Migration Phases

1. Add PostgreSQL schema and seed scripts based on the current static PMS data.
2. Add read-only API endpoints for rooms, reservations, stays, folios, users, shifts, and services.
3. Replace browser seed state with API-loaded state.
4. Replace frontend mutations with API writes.
5. Add real login/session handling.
6. Enforce role permissions in the backend.
7. Add audit logging for every write.
8. Add polling or realtime refresh so concurrent users see shared state.

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
