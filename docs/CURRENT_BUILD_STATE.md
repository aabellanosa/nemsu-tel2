# HMSystem Current Build State

## Purpose

- HMSystem is a practicum-ready hotel front desk / PMS prototype inspired by Micros-Fidelio style workflows.
- The current build is intended for student testing, demonstrations, and iterative PMS workflow development.
- It now runs as a Node.js app with shared PostgreSQL state, so different browsers/devices can view and test the same active dataset.
- This is still a training/demo system, not a production PMS.

## Current Tech Stack

- Frontend:
  - Plain `HTML`, `CSS`, and browser JavaScript.
  - Main files live in `public/`.
  - Tailwind CLI is included as a styling enhancement layer.
  - Generated CSS output is `public/tailwind.css`.
- Backend:
  - Dependency-light Node.js HTTP server in `server.js`.
  - Static file serving for the UI.
  - JSON API routes under `/api/`.
- Database:
  - PostgreSQL through the `pg` Node package.
  - Render PostgreSQL is the current deployment target.
  - Schema lives in `db/schema.sql`.
  - Demo/practicum seed data lives in `db/seed.sql`.
- Deployment:
  - Render web service runs the Node app.
  - Render PostgreSQL stores shared PMS state.
  - Namecheap static hosting is now legacy for the earlier non-persistent prototype.

## Important Files

- `public/index.html` - main UI shell and modals.
- `public/app.js` - UI rendering, role behavior, API calls, and workflow handlers.
- `public/styles.css` - primary handcrafted UI styling.
- `src/tailwind.css` - Tailwind input file.
- `public/tailwind.css` - generated Tailwind output.
- `server.js` - Node static server plus API.
- `db/schema.sql` - database schema.
- `db/seed.sql` - practicum baseline data.
- `scripts/db-migrate.js` - runs schema migration.
- `scripts/db-seed.js` - runs seed data.
- `.env.example` - local environment template.
- `render.yaml` - Render service/database blueprint.

## Local Development

- Install dependencies:

```powershell
npm install
```

- Build Tailwind CSS:

```powershell
npm run build:css
```

- Start the local server:

```powershell
npm start
```

- Open:

```text
http://localhost:3000
```

- Optional Tailwind watch mode in another terminal:

```powershell
npm run watch:css
```

## Local Environment Variables

- Create `.env` from `.env.example`.
- For ordinary local testing, point `.env` at a local PostgreSQL database.
- Let Render inject its own `DATABASE_URL` for the deployed app.
- Use Render's External Database URL locally only when intentionally testing the exact deployed/shared database.
- Do not commit `.env`.

Required / useful values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hmsystem_local
DATABASE_SSL=false
DEMO_RESET_ENABLED=true
```

Notes:

- `DATABASE_URL` enables shared persistent state.
- Local and remote browsers will share sessions if both point to the same Render database.
- Run `npm run db:where` before testing when unsure which database is active.
- For Render external PostgreSQL URLs, SSL is detected automatically by the app.
- `DATABASE_SSL=false` is mainly for a local non-SSL Postgres server.
- `DEMO_RESET_ENABLED=false` disables the practicum reset endpoint.

## Database Setup

- Confirm the configured database target:

```powershell
npm run db:where
```

- Run schema migration:

```powershell
npm run db:migrate
```

- Seed the practicum baseline:

```powershell
npm run db:seed
```

- The seed uses the `Asia/Manila` business date for demo arrivals and departures.
- Reset behavior is also based on the same seed file.

## Current API Surface

- `GET /api/health`
  - Confirms the Node service is running.
  - Confirms PostgreSQL connectivity when `DATABASE_URL` is configured.
- `GET /api/state`
  - Returns the shared PMS snapshot used by the UI:
    - rooms
    - reservations
    - in-house stays
    - folios
    - card authorizations
    - activity feed
- `GET /api/bootstrap`
  - Returns roles, users, service categories, and current business date.
- `POST /api/session/login`
  - Opens a server-backed operator shift session for a selected demo user and shift.
  - Blocks a second active session for the same operator.
- `POST /api/session/logout`
  - Closes the active operator session.
- `GET /api/session/:id`
  - Validates the browser's remembered session after refresh.
- `POST /api/session/handover`
  - Closes the outgoing operator session and opens the incoming operator session.
- `GET /api/rooms`
  - Returns persisted room inventory.
- `POST /api/reservations`
  - Creates a reservation.
- `POST /api/reservations/:id/assign-room`
  - Assigns an eligible room to a due-in reservation.
- `POST /api/reservations/:id/check-in`
  - Checks in an assigned due-in reservation and creates stay/folio records.
- `PATCH /api/rooms/:roomNumber`
  - Updates housekeeping and maintenance status.
- `POST /api/stays/:id/service-charge`
  - Posts an add-on service charge to an open folio.
- `POST /api/stays/:id/payments`
  - Posts cash/card payment to an open folio.
- `POST /api/stays/:id/check-out`
  - Checks out a stay after folio balance is settled.
- `POST /api/demo/reset`
  - Resets practicum/demo data back to the baseline.

## Practicum Demo Reset

- Available from `Reports > Demo Sandbox > Reset Demo Data`.
- Intended for instructors/students to restore a known testing state.
- Current reset restores:
  - demo users and roles
  - service categories
  - room rack
  - due-in arrivals
  - assigned rooms for selected arrivals
  - active in-house guests
  - folios and initial payment examples
  - activity/audit baseline
- The reset clears operational data before rebuilding the seed baseline.
- Keep `DEMO_RESET_ENABLED=true` for training use.
- Set `DEMO_RESET_ENABLED=false` for any non-demo environment.

## Current User Roles

- Front Desk Agent:
  - Dashboard, reservations, room rack, departures, services.
  - Can create reservations, assign rooms, and check in guests.
  - Cannot post payments.
- Front Desk Supervisor:
  - Full access across current modules.
  - Can use demo reset.
- Cashier:
  - Dashboard, cashiering, departures, services.
  - Can post payments and service charges.
- Housekeeping Supervisor:
  - Room rack and housekeeping.
  - Can update housekeeping readiness.
- Night Auditor:
  - Dashboard, departures, cashiering, services, reports.
  - Can use demo reset.

## Current Persistence Behavior

- The UI loads shared state from `/api/state` on startup.
- If the API/database is unavailable, the browser falls back to local demo state.
- Operator sign-in is server-backed when PostgreSQL is configured.
- The browser remembers only the current session/workstation identifier in `localStorage`.
- Refresh validates the remembered session through the API before restoring the operator view.
- PostgreSQL keeps `shift_sessions` for sign-in, sign-out, and handover.
- The database prevents one demo operator from having two active sessions at the same time.
- Data changes persist in PostgreSQL and become visible to other browsers after refresh.
- Automatic realtime updates are not implemented yet.

## Current Supported Workflows

- View dashboard metrics.
- Create reservation.
- Assign eligible rooms.
- Check in assigned due-in reservations.
- View room rack and status.
- Update room housekeeping/maintenance conditions.
- View in-house stays.
- View and print folios.
- Post service/add-on charges.
- Post cash or mock-card payments.
- Use mock card authorization/capture flow.
- Complete check-out after folio settlement.
- Generate browser-printable operational reports.
- Reset practicum data to baseline.
- Server-backed operator sign-in, sign-out, and handover.
- Duplicate active login blocking for the same demo operator.

## Known Limitations

- User login is server-backed but still demo-grade; it does not use passwords, OAuth, MFA, or production user administration.
- Duplicate login blocking exists, but there is no supervisor override or forced stale-session release yet.
- Backend write routes require an active session and enforce named permissions for the documented role matrix.
- Audit events now receive session context for core write routes, but audit detail still needs hardening for production use.
- Other browsers do not update automatically until refresh.
- Conflict handling is basic.
- No room move, cancellation/no-show, refund, adjustment, group block, or night audit rollover workflow yet.
- Mock credit-card handling is only for training; never enter real card data.

## Next Logical Build Series

Recommended next series: `Backend Permissions and Audit Hardening`.

Suggested order:

1. Enforce role permissions on the backend for each write route.
2. Add a supervisor-only stale-session release or duplicate-login override.
3. Harden audit detail for previous/new values on sensitive actions.
4. Add a manual `Refresh State` control.
5. Add friendly stale-state/conflict messages.
6. Add optional polling or realtime refresh for concurrent users.

## Operator Session Test Run

Use this after migration and seed/reset to verify the current run:

1. Open the app in Browser A and sign in as a Front Desk user.
2. Open the app in Browser B or an incognito window.
3. Try signing in as the same user; the app should reject the duplicate active login.
4. Sign out in Browser A.
5. Sign in with the same user in Browser B; it should now be allowed.
6. Refresh the signed-in browser; the operator view should restore from the active server session.
7. Use `Change Shift`; the outgoing session should close and the incoming session should become active.
