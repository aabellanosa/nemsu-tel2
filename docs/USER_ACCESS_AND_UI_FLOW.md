# Front Desk Console: User Access and UI Flow

## Purpose

- This document defines who uses the system, which tabs each role can access, and which operational actions each role may perform.
- It documents the current UI workflow before persistent storage and server-side authorization are implemented.
- In the current prototype, records remain available only during the open browser session and reset after page refresh.
- For production deployment, these permissions must be enforced by the server and recorded in a permanent audit trail.

## Browser and Device Support

- This prototype is intended for modern browsers and current hotel workstation/tablet use.
- Legacy mobile Safari is not an operational target.
- Target browser versions:
  - Chrome 120+.
  - Microsoft Edge 120+.
  - Firefox 120+.
  - Safari 17+.
  - iOS Safari 15.4+.
  - Chrome on iOS 15.4+.
  - Android Chrome 120+.
- Minimum expected support:
  - iOS Safari 13+.
  - Modern Chromium-based browsers.
- Older iOS versions may render the page but are not guaranteed to support all interactive workflows.
- For actual hotel operations, recommended devices are:
  - Desktop or laptop workstation for Front Desk, Cashiering, Night Audit, and Supervisor functions.
  - Modern tablet for housekeeping review or light operational lookup.
  - Phone-sized screens for demonstration or limited lookup only, not primary PMS operation.

## System Tabs

| Tab | Main Purpose |
| --- | --- |
| Front Desk | Daily overview of occupancy, arrivals, departures, in-house guests, room issues, room rack, and shift activity. |
| Reservations | Capture reservation details, view active reservations, assign rooms, and initiate check-in. |
| Room Rack | View room inventory and separate occupancy, housekeeping, and maintenance conditions. |
| Departures | Review in-house stays due for departure and complete check-out after folio settlement. |
| Services | Post add-on hotel service charges to active guest folios. |
| Housekeeping | Review room service queue and update housekeeping readiness. |
| Cashiering | Review folio transaction ledgers and post settlement payments. |
| Reports | Review operational reporting options for the active business date. |

## User Roles and Tab Access

| Role | Front Desk | Reservations | Room Rack | Departures | Services | Housekeeping | Cashiering | Reports |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Front Desk Agent | Yes | Yes | Yes | Yes | Yes | No | No | No |
| Front Desk Supervisor | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Cashier | Yes | No | No | Yes | Yes | No | Yes | No |
| Housekeeping Supervisor | No | No | Yes | No | No | Yes | No | No |
| Night Auditor | Yes | No | No | Yes | Yes | No | Yes | Yes |

## Permission Summary by Role

### Front Desk Agent

- Primary user of the reception/front-office console during guest arrival and departure activity.
- Can view daily front desk operational totals:
  - Occupancy.
  - Due-in arrivals.
  - Departures due today.
  - Active in-house stays.
  - Room issues requiring attention.
- Can create reservations and record:
  - Guest first name, guest last name, and contact information.
  - Guest nationality.
  - Guest ID type and ID number.
  - Arrival and departure dates.
  - Adults and children.
  - Requested room type.
  - Rate plan and nightly Philippine Peso rate.
  - Payment guarantee method.
  - VIP status and reservation notes.
- Can view reservation details and status.
- Can assign an eligible room to a due-in reservation.
  - Assignment requires a room matching the requested room type.
  - The room must be vacant.
  - The room must be clean or inspected.
  - The room must be in service.
- Can process guided guest check-in after:
  - A room has been assigned.
  - Room readiness has been verified.
  - Payment/guarantee method has been reviewed.
  - Identity or registration details have been confirmed.
  - Number of keys issued has been recorded.
- Can view Room Rack operational conditions.
- Can view in-house folios from the Front Desk overview.
- Can process check-out only when the folio balance is zero.
- Can post basic add-on service charges to active guest folios.
- Cannot post folio payments.
- Cannot certify housekeeping status changes.
- Cannot set a room out of service or out of order.
- Cannot access operational reports.

### Front Desk Supervisor

- Has full operational access across all tabs in the current UI.
- Can perform every Front Desk Agent workflow.
- Can access and supervise Housekeeping status workflows.
- Can access Cashiering settlement workflows.
- Can access Services and post add-on charges.
- Can access Reports.
- Can update housekeeping condition of rooms.
- Can update maintenance availability:
  - In Service.
  - Out of Service.
  - Out of Order.
- Intended production responsibilities:
  - Review room overrides and exceptions.
  - Approve upgrades, room moves, or operational status overrides.
  - Resolve front desk and housekeeping discrepancies.
  - Monitor shift handovers and unresolved work items.

### Cashier

- Focused on guest account settlement rather than reservation or room inventory management.
- Can view Front Desk summary information relevant to active operations.
- Can access Departures to identify guests requiring settlement prior to check-out.
- Can access Cashiering.
- Can access Services and post add-on charges.
- Can open a guest folio transaction ledger.
- Can post a payment transaction to settle an open balance.
- Can support completion of departure once the folio is settled.
- Cannot create reservations or assign rooms.
- Cannot process arrival check-in.
- Cannot update room housekeeping or maintenance status.
- Cannot access general reports in the current role configuration.

### Housekeeping Supervisor

- Focused on room readiness and service queue management.
- Can access Room Rack.
- Can access Housekeeping.
- Can view each room's separate operational conditions:
  - Front-office occupancy: Vacant, Assigned, Occupied.
  - Housekeeping condition: Clean, Dirty, Inspected, Pickup.
  - Maintenance condition: In Service, Out of Service, Out of Order.
- Can update housekeeping readiness, including marking completed rooms as inspected.
- Can review rooms affected by maintenance conditions.
- Cannot change front-office assignment or occupancy through housekeeping processing.
- Cannot set maintenance out-of-service or out-of-order conditions in the current permissions model.
- Cannot create reservations, process arrivals, post payments, or access reports.

### Night Auditor

- Focused on end-of-business-date control and financial/operational review.
- Can view Front Desk status.
- Can access Departures.
- Can access Cashiering.
- Can access Services and post add-on charges.
- Can access Reports.
- Can inspect unsettled folios and post settlement payments in the current prototype.
- Can review operational reports tied to the current business date.
- Cannot create reservations, assign rooms, check in guests, or modify room readiness in the current UI.
- Intended production responsibilities:
  - Verify unsettled folios and unresolved departures.
  - Validate posting totals.
  - Complete night audit and business-date rollover.
  - Produce end-of-day operational and financial reports.

## Room Status Model

- Room state is separated into three operational categories to avoid conflicting or incomplete room information.

### Front-Office Occupancy Status

| Status | Meaning | Updated By |
| --- | --- | --- |
| Vacant | Room is not assigned to or occupied by a guest. | System workflow after check-out; future supervisor workflows. |
| Assigned | Room is reserved for a due-in guest but guest has not checked in. | Front Desk Agent or Supervisor during room assignment. |
| Occupied | Guest has completed check-in and occupies the room. | Front Desk Agent or Supervisor during check-in. |

### Housekeeping Status

| Status | Meaning | Updated By |
| --- | --- | --- |
| Clean | Room is cleaned and may be ready for use subject to policy. | Housekeeping Supervisor / Front Desk Supervisor. |
| Inspected | Room cleanliness has been reviewed and certified ready. | Housekeeping Supervisor / Front Desk Supervisor. |
| Dirty | Room requires cleaning before assignment or check-in. | Check-out workflow or housekeeping/supervisor action. |
| Pickup | Room requires a minor housekeeping service or recheck. | Housekeeping Supervisor / Front Desk Supervisor. |

### Maintenance Status

| Status | Meaning | Updated By |
| --- | --- | --- |
| In Service | Room may be allocated if other conditions permit. | Front Desk Supervisor. |
| Out of Service | Room is temporarily unavailable for operational reasons. | Front Desk Supervisor. |
| Out of Order | Room is unavailable due to a significant issue or repair need. | Front Desk Supervisor. |

### Room Assignment Eligibility

- A room may be assigned to a due-in reservation only when all are true:
  - The room type matches the requested reservation room type.
  - Occupancy status is `Vacant`.
  - Housekeeping status is `Clean` or `Inspected`.
  - Maintenance status is `In Service`.
- Assigned rooms are removed from the immediately available room pool.
- Check-in cannot proceed if the assigned room is no longer ready or in service.

## Reservation Flow

### Create Reservation

- Accessible to Front Desk Agent and Front Desk Supervisor.
- User opens `New Reservation`.
- User captures:
  - Guest name.
  - Guest first name.
  - Guest last name.
  - Nationality.
  - Guest ID type.
  - Guest ID number.
  - Arrival date.
  - Departure date.
  - Requested room type.
  - Estimated arrival time.
  - Number of adults and children.
  - Rate plan.
  - Nightly rate in Philippine Peso.
  - Payment guarantee method.
  - Contact number and email.
  - VIP indicator.
  - Notes or preferences.
- System generates:
  - Confirmation number.
  - Guest profile reference for the prototype record.
- Reservation classification:
  - Arrival on the active business date becomes `Due In`.
  - Arrival on a future date remains `Reserved`.

### Review Reservation

- Reservations tab lists active reservations with:
  - Guest and confirmation information.
  - Guest first name and last name.
  - Nationality.
  - ID type and ID number.
  - Stay dates and number of nights.
  - Requested room type and assigned room.
  - Nightly rate, rate plan, and payment guarantee.
  - Reservation status.
- `Details` presents the complete captured reservation information.
- `Print Confirmation` produces a printable reservation confirmation containing:
  - Guest and confirmation details.
  - Nationality.
  - Stay dates, room type, and assigned room where available.
  - Occupancy, rate plan, nightly rate, and estimated accommodation total.
  - Guarantee method, contact information, VIP indicator, and notes.

### Assign Room

- Available for `Due In` reservations.
- Front Desk user selects assignment action.
- System locates an available room meeting assignment eligibility.
- On successful assignment:
  - Reservation stores the assigned room number.
  - Room occupancy status changes from `Vacant` to `Assigned`.
  - Guest name is associated with the assigned room.
  - Activity log records the assignment with the active operator and shift.

## Check-In Flow

- Accessible to Front Desk Agent and Front Desk Supervisor.
- User selects `Check In` from an assigned due-in reservation.
- System validates that:
  - Assigned room exists.
  - Room occupancy is `Assigned`.
  - Assigned guest matches the reservation.
  - Housekeeping condition is `Clean` or `Inspected`.
  - Maintenance condition is `In Service`.
- Check-in review screen displays:
  - Guest and confirmation number.
  - Nationality.
  - Guest ID type and ID number.
  - Stay dates and duration.
  - Assigned room and requested room type.
  - Nightly rate.
  - Room readiness.
  - Reservation notes.
- User confirms:
  - Payment method.
  - Number of keys issued.
  - Guest identity or registration details reviewed.
  - Room and payment guarantee confirmed.
- On completed check-in:
  - Reservation status changes to `Checked In`.
  - Room occupancy changes to `Occupied`.
  - An in-house stay record is created.
  - Initial room charge is posted to the guest folio ledger.
  - Activity log records the check-in and operator/shift attribution.

## In-House Guest and Folio Flow

### Folio Ledger

- In-house stays carry a transaction ledger instead of a manually overwritten balance.
- Current transaction examples:
  - Room Charge: positive amount owed by guest.
  - Payment: negative amount reducing guest balance.
- Balance due is calculated from all posted ledger transactions.
- Monetary values are presented in Philippine Peso.

### View Folio

- Front Desk overview allows visibility of an in-house guest folio.
- Cashiering provides the detailed operational list of open folios.
- Folio display includes:
  - Transaction type.
  - Description.
  - Reference number.
  - Amount.
  - Calculated balance due.
- `Print Folio` produces a guest-facing printable folio containing:
  - Guest, room, departure date, and settlement status.
  - All current session ledger postings.
  - Calculated Philippine Peso balance due.

### Post Payment

- Available to Cashier and Front Desk Supervisor; also available to Night Auditor in the current prototype.
- User selects `Post Payment` for an unsettled folio.
- User may settle by:
  - Cash.
  - Mock credit card sale.
  - Capture of an existing mock card authorization.
- For card payments, the prototype validates:
  - Supported card brand.
  - Luhn/card-number checksum.
  - Non-expired card date.
  - CVV length based on detected brand.
- Supported mock card brands:
  - Visa.
  - Mastercard.
  - American Express.
  - JCB.
  - Discover.
- The UI stores and displays only masked card details, not the full card number.
- On successful posting:
  - A payment transaction is appended to the folio ledger.
  - Folio balance recalculates.
  - Card sale or card capture reference is recorded.
  - Activity log records the payment approval/capture with active operator and shift.
- Future production version should additionally capture:
  - Payment method and tendered amount.
  - Receipt/reference number.
  - Cash drawer or cashier session.
  - Refunds, adjustments, voids, and approval requirements.
  - Payment-gateway token, authorization response, and settlement batch information.

### Mock Credit Card Authorization

- A card authorization is different from a payment posting.
- Authorization reserves funds but does not reduce the guest folio balance.
- Payment capture posts the actual payment transaction to the folio.
- During check-in, staff may enter a mock credit card and authorize an amount for room charges plus incidentals.
- The authorization record stores:
  - Mock authorization number.
  - Card brand.
  - Masked card number.
  - Cardholder name.
  - Authorized amount.
  - Authorization status.
  - Operator and shift.
- During cashiering, staff may capture an existing authorization if the guest pays by that card.
- Capturing an authorization creates the actual negative payment line in the folio ledger.
- Declined or invalid mock cards are recorded only in the session activity feed.

## Services / Add-On Charge Flow

- Services is a lightweight charge-posting workflow, not a full restaurant POS.
- Intended for hotel add-on services that should appear on the guest folio, such as:
  - Restaurant.
  - Room Service.
  - Minibar.
  - Laundry.
  - Spa.
  - Transportation.
  - Additional Bed.
  - Business Center.
  - Miscellaneous charges.
- Accessible in the current prototype to:
  - Front Desk Agent.
  - Front Desk Supervisor.
  - Cashier.
  - Night Auditor.
- User selects an active in-house guest / room.
- User captures:
  - Service category.
  - Description.
  - Quantity.
  - Unit price in Philippine Peso.
  - Optional service charge or tax amount.
  - POS check number, manual reference, or generated service reference.
  - Posting notes.
- System calculates:
  - `quantity x unit price + service charge/tax`.
- For `Additional Bed`, the prototype fills a room-type-based per-night rate:
  - Standard Queen: PHP 700.
  - Deluxe King or Deluxe Twin: PHP 1,000.
  - Executive Suite: PHP 1,500.
- These rates follow the common hotel practice of posting extra beds or extra persons as property-defined per-night add-on charges. Production rates should be configurable by room type, season, and rate plan.
- On posting:
  - A `Service Charge` transaction is appended to the selected guest folio.
  - Folio balance recalculates immediately.
  - The charge appears in the printable guest folio.
  - The posting appears in the Services workspace list.
  - Activity log records the category, amount, guest, room, operator, and shift.
- Future production version may replace or supplement this with POS integration, where restaurant or outlet systems post approved room charges directly to the PMS folio.

## Departure and Check-Out Flow

- Departures tab identifies in-house guests and displays:
  - Guest.
  - Room.
  - Departure date.
  - Folio balance.
- Front Desk Agent, Front Desk Supervisor, Cashier, and Night Auditor can access the Departures workspace under current role rules.
- User may open the folio to review transactions.
- Check-out control enforces:
  - Guest may not be checked out while a balance remains due.
  - Outstanding folio must first be settled through authorized cashiering action.
- On completed check-out:
  - Stay status changes to `Checked Out`.
  - Associated reservation status changes to `Checked Out`, where applicable.
  - Room occupancy status changes to `Vacant`.
  - Room housekeeping condition changes to `Dirty`.
  - Room returns to the housekeeping queue before it can be reassigned.
  - Activity log records completion of departure.

## Housekeeping Flow

- Housekeeping workspace shows rooms requiring operational attention.
- Queue includes:
  - Dirty rooms.
  - Pickup rooms.
  - Rooms with out-of-service or out-of-order maintenance conditions for visibility.
- Housekeeping Supervisor or Front Desk Supervisor may mark a cleaned room as `Inspected`.
- Inspection returns the housekeeping component of room readiness to an assignable condition, provided:
  - Room is vacant.
  - Maintenance remains `In Service`.
- Housekeeping users do not control reservation assignment, check-in, or guest financial transactions.

## Shift and Operator Flow

### Active Operator Context

- Header displays:
  - Signed-in employee.
  - Assigned role.
  - Current shift.
  - Business date.
- Operational activity records are labeled with the user and shift performing the action.

### Change Shift / Handover

- Signed-in operator selects `Change Shift`.
- Handover summary displays:
  - Outgoing operator and role.
  - Outgoing shift.
  - Number of unassigned due-in arrivals.
  - Number of unsettled folios.
- Outgoing operator records:
  - Incoming employee.
  - Incoming shift.
  - Handover notes.
  - Confirmation that pending work and cashier responsibility were reviewed.
- On transfer:
  - Active operator and role change to the incoming employee.
  - Tab access adjusts to the incoming role.
  - Handover is recorded in session state.
  - Activity log attributes the handover event to the outgoing operator.

### Sign Out / Sign In

- Operator may select `Sign Out`.
- System records sign-out in activity history.
- Operator selection screen is displayed before further work proceeds.
- New operator selects:
  - Employee identity and assigned role.
  - Active shift.
- On sign-in:
  - Accessible tabs update according to role.
  - Sign-in is recorded in activity history.

## Reports Flow

- Reports tab is accessible to Front Desk Supervisor and Night Auditor.
- Current prototype report actions include:
  - Arrival Forecast.
  - Room State Summary.
  - Cashier Ledger.
  - Services Summary.
  - Departure List.
- Selecting a report opens a print-formatted browser document and invokes the browser print dialog.
- Printable reports contain only records available in the current browser session:
  - Arrival Forecast lists current active reservations and room assignment status.
  - Room State Summary lists occupancy, housekeeping, and maintenance status by room.
  - Cashier Ledger summarizes open in-house folios and outstanding balance totals.
  - Services Summary lists service charges posted during the current browser session.
  - Departure List identifies in-house guests, balances, and readiness for check-out.
- Printing actions are reflected in the current shift activity log.
- The UI does not yet save report copies, assign official report numbers, or archive printed output.
- Production reporting should be based on:
  - Business date.
  - Persisted reservations and stays.
  - Folio transactions.
  - Room operations history.
  - Operator and audit history.

## Audit and Accountability Requirements for Production

- Persist every significant action with:
  - User identity.
  - Role.
  - Shift session.
  - Business date.
  - Timestamp.
  - Action performed.
  - Affected record.
  - Previous and new values where applicable.
- Actions that require permanent audit entries:
  - Reservation creation or modification.
  - Room assignment or reassignment.
  - Check-in and check-out.
  - Housekeeping or maintenance status update.
  - Folio charge, payment, adjustment, void, refund, or transfer.
  - Sign-in, sign-out, and shift handover.
  - Supervisor override.
- Audit entries should be append-only in the production system.

## Current Prototype Limitations

- All state is held in browser memory and resets on page refresh.
- User selection demonstrates roles but is not secure authentication.
- Permissions are enforced in the UI only; a production API must enforce authorization.
- Folio workflow presently supports sample charges and settlement payments only.
- Credit card handling is simulated only; it does not contact a real payment gateway and must never be used for real card processing.
- No cancellation, no-show, room move, upgrade, deposit processing, adjustment, refund, group block, or night-audit rollover workflow is included yet.
- Services posting is manual and does not integrate with a restaurant POS yet.
- Printable reports and folios are created from browser-session data only and are not generated from persisted records or archived.

## Recommended SQLite Transition Scope

- Persist core entities:
  - Users, roles, and permissions.
  - Shift sessions and handovers.
  - Guest profiles.
  - Reservations.
  - Guest nationality data on guest profiles/reservations.
  - Rooms and room-state history.
  - Stays.
  - Folio transactions.
  - Service charge source/category metadata.
  - Room-type add-on pricing for items such as additional beds.
  - Audit events.
  - Business-date configuration.
- Enforce role permissions in Node.js API routes rather than relying on visible tab access alone.
- Keep folio entries and audit events append-oriented so historical accountability is preserved.
