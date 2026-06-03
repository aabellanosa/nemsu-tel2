# Front Desk Console

A Micros-Fidelio-inspired hotel property management UI prototype built with a dependency-free Node.js static server and browser-side demo state.

## Functional Documentation

- [User Access and UI Flow](docs/USER_ACCESS_AND_UI_FLOW.md) defines roles, allowed tabs, operational permissions, reservation/check-in/cashiering/departure flow, shift handover, and the planned persistence boundary.
- [Static Deployment to Namecheap](docs/DEPLOYMENT.md) explains the GitHub Actions deployment flow and required repository secrets.

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
- Expanded reservation capture and presentation for split guest name, ID document, stay dates, occupants, rates, guarantee, contact, and notes
- Browser-printable reservation confirmations, guest folios, arrival forecasts, room state summaries, cashier ledgers, and departure lists
- Services / Post Charge workflow for restaurant, room service, minibar, laundry, spa, transport, and miscellaneous add-ons
- Mock credit-card validation, check-in authorization, and cashiering capture flow with masked card display
- Sticky operator topbar and responsive hamburger drawer navigation for narrow screens
- Guest/confirmation/room quick lookup
- Shift activity feed

This first iteration is front-end functionality only. Reservation, room, folio, user-session, and handover data reset when the page reloads. The session workflow is intended to establish the permission and audit model before adding SQLite persistence.

## Persistence-Ready Concepts

The current browser state is organized around concepts intended to become SQLite entities:

- Reservations retain lifecycle status, dates, requested/assigned rooms, rate and guarantee information.
- Rooms retain separate occupancy, housekeeping, and maintenance states.
- In-house stays reference reservations and hold append-style folio transaction ledgers.
- Shift activity entries retain operator attribution.

Role controls remain UI-level demonstrations until a server API enforces authorization.
