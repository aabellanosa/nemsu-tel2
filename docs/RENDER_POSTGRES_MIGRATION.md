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
- `/api/session/login`, `/api/session/logout`, `/api/session/:id`, and `/api/session/handover` now manage demo operator sessions.
- PostgreSQL `shift_sessions` are created and closed by sign-in, sign-out, and handover.
- The database blocks two active sessions for the same demo operator.

## Local Development

Create a local `.env` from `.env.example` for local PostgreSQL testing.

```powershell
copy .env.example .env
```

Recommended local database target:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hmsystem_local
DATABASE_SSL=false
```

Check the active target before local tests or migrations:

```powershell
npm run db:where
```

If this prints `Database target: render`, local testing will share state with the deployed Render app. That is useful for deliberate remote verification, but it can also make local operator sessions block remote sign-ins.

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

Local `.env` is not used by Render. Keep local `.env` pointed at local PostgreSQL for routine development, and keep Render's database URL configured only in Render.

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
6. Add server-backed operator login, logout, refresh validation, and shift handover.
7. Block duplicate active sessions for the same demo operator.
8. Attach active session context to core API write actions.

Next:

1. Enforce role permissions in the backend.
2. Add supervisor-only stale-session release or duplicate-login override.
3. Harden operator/session audit detail for every write.
4. Add manual refresh, polling, or realtime refresh so concurrent users see shared state without browser reload.

## Important Boundary

The current UI role system is no longer purely browser-side because write routes require an active server session. Full role authorization still needs to be enforced in `server.js` or backend route modules, not only by hiding buttons in the browser.

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
- duplicate-active-session protection for demo users
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
