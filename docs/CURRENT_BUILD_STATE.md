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
- Use Render's External Database URL when testing locally against the hosted Render PostgreSQL database.
- Do not commit `.env`.

Required / useful values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://user:password@host:5432/database
DATABASE_SSL=false
DEMO_RESET_ENABLED=true
```

Notes:

- `DATABASE_URL` enables shared persistent state.
- For Render external PostgreSQL URLs, SSL is detected automatically by the app.
- `DATABASE_SSL=false` is mainly for a local non-SSL Postgres server.
- `DEMO_RESET_ENABLED=false` disables the practicum reset endpoint.

## Database Setup

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
- Workstation user/view selection is remembered in browser `localStorage`.
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

## Known Limitations

- User login is still a demo browser-side selection, not secure authentication.
- Same operator can still be selected in multiple browsers.
- Backend route permissions are not fully enforced yet.
- Audit events exist but do not yet capture full operator/session context for every action.
- Other browsers do not update automatically until refresh.
- Conflict handling is basic.
- No production-grade password handling, OAuth, or user administration.
- No room move, cancellation/no-show, refund, adjustment, group block, or night audit rollover workflow yet.
- Mock credit-card handling is only for training; never enter real card data.

## Next Logical Build Series

Recommended next series: `Operator Sessions and Audit Control`.

Suggested order:

1. Add server-backed login/session endpoint.
2. Create real `shift_sessions` on login.
3. Prevent one operator from being active in two browsers unless overridden later.
4. Attach `user_id`, `role`, `shift_session_id`, and `business_date_id` to all write actions.
5. Enforce role permissions on the backend.
6. Add a manual `Refresh State` control.
7. Add friendly stale-state/conflict messages.

