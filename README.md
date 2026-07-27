# Front Desk Console

A Micros-Fidelio-inspired hotel property management UI prototype built with a Node.js server, browser UI, Tailwind styling support, and PostgreSQL-backed shared state for practicum testing.

## Functional Documentation

- [User Access and UI Flow](docs/USER_ACCESS_AND_UI_FLOW.md) defines roles, allowed tabs, operational permissions, reservation/check-in/cashiering/departure flow, shift handover, and the planned persistence boundary.
- [Current Build State](docs/CURRENT_BUILD_STATE.md) summarizes the present Render/PostgreSQL build, local setup, API surface, demo reset, limitations, and next build series.
- [Static Deployment to Namecheap](docs/DEPLOYMENT.md) explains the GitHub Actions deployment flow and required repository secrets.
- [Render + PostgreSQL Migration](docs/RENDER_POSTGRES_MIGRATION.md) tracks the migration from static prototype to shared persistent deployment.

## Browser Support

This prototype is designed for modern browsers and tested/targeted for current desktop and tablet usage. Legacy mobile Safari is not an operational target.

Target browsers:

- Chrome 120+
- Microsoft Edge 120+
- Firefox 120+
- Safari 17+
- iOS Safari 15.4+
- Chrome on iOS 15.4+
- Android Chrome 120+

Minimum expected support:

- iOS Safari 13+
- Modern Chromium-based browsers

Older iOS versions may display the page but are not guaranteed to support all interactive workflows.

## Run

```powershell
npm install
npm run build:css
npm start
```

Open `http://localhost:3000`.

For live Tailwind rebuilding while customizing the UI, run this in a second terminal:

```powershell
npm run watch:css
```

## Database

For local development, configure `.env` to use a local PostgreSQL database. The Render deployment should keep using the Render-managed `DATABASE_URL` injected by `render.yaml`.

Recommended local shape:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hmsystem_local
DATABASE_SSL=false
```

Check which database your current terminal will use:

```powershell
npm run db:where
```

Run local migration and seed against that target:

```powershell
npm run db:migrate
npm run db:seed
```

Avoid pointing local `.env` at the Render External Database URL during ordinary testing, because local and deployed sessions will share the same operator locks and PMS state.

Useful local checks:

```text
http://localhost:3000/api/health
http://localhost:3000/api/state
```

## Styling

The existing navy and gold screen remains usable before Tailwind is built. Tailwind is loaded as an enhancement layer from `public/tailwind.css`, so migration can happen gradually without disturbing the current interface.

- Change shared theme colors in `src/tailwind.css`.
- Add reusable component styles under its `@layer components` block.
- Use Tailwind utilities directly in `public/index.html` for new screens and controls.
- Extend design tokens and content scanning in `tailwind.config.js`.

## Included Core UI

- Front desk dashboard and operating metrics
- Functional module navigation for Reservations, Room Rack, Housekeeping, Cashiering, and Reports
- Departures and check-out workspace with outstanding-balance protection
- Demo operator sign-in, sign-out, and shift handover workflow
- Role-aware navigation for front desk, supervisor, cashier, housekeeping, and night audit users
- Operator and shift attribution on operational activity entries
- Arrival filtering, room-type-aware assignment, and guided check-in review flow
- Separate front-office occupancy, housekeeping, and maintenance room statuses
- In-house folio ledger with charge/payment postings and calculated balances
- Expanded reservation capture and presentation for split guest name, nationality, ID document, stay dates, occupants, rates, guarantee, contact, and notes
- Browser-printable reservation confirmations, guest folios, arrival forecasts, room state summaries, cashier ledgers, and departure lists
- Services / Post Charge workflow for restaurant, room service, minibar, laundry, spa, transport, additional bed, and miscellaneous add-ons
- Mock credit-card validation, check-in authorization, and cashiering capture flow with masked card display
- Sticky operator topbar and responsive hamburger drawer navigation for narrow screens
- Guest/confirmation/room quick lookup
- Shift activity feed
- PostgreSQL-backed state hydration and writes for the current core PMS workflow
- Practicum demo reset from the Reports module
- Server-backed demo operator login, logout, refresh validation, and shift handover
- Duplicate active-login blocking for the same demo operator

## Persistence Notes

The current shared database state is organized around these PostgreSQL-backed concepts:

- Reservations retain lifecycle status, guest nationality, dates, requested/assigned rooms, rate and guarantee information.
- Rooms retain separate occupancy, housekeeping, and maintenance states.
- In-house stays reference reservations and hold append-style folio transaction ledgers.
- Additional-bed charges are modeled as room-type-priced service postings on the folio ledger.
- Shift sessions track demo operator sign-in, sign-out, and handover.
- Core write routes require an active operator session when PostgreSQL is configured.

Role controls still need full backend enforcement. The next recommended build slice is backend permission hardening, stale-session release/override, and stronger audit detail.
