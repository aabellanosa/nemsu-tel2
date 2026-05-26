# Front Desk Console

A Micros-Fidelio-inspired hotel property management UI prototype built with a dependency-free Node.js static server and browser-side demo state.

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
- Arrival filtering, room assignment, and check-in flow
- Room rack with housekeeping/status updates
- In-house guest folio launcher feedback
- Reservation creation modal
- Guest/confirmation/room quick lookup
- Shift activity feed

This first iteration is front-end functionality only. Data resets when the page reloads.
