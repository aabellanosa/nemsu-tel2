const today = new Date();
const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const occupancyLabels = { vacant: "Vacant", assigned: "Assigned", occupied: "Occupied" };
const housekeepingLabels = { clean: "Clean", dirty: "Dirty", inspected: "Inspected", pickup: "Pickup" };
const maintenanceLabels = { inService: "In Service", outOfService: "Out of Service", outOfOrder: "Out of Order" };
const roleAccess = {
  "Front Desk Agent": ["dashboard", "reservations", "rooms", "departures"],
  "Front Desk Supervisor": ["dashboard", "reservations", "rooms", "departures", "housekeeping", "cashiering", "reports"],
  "Cashier": ["dashboard", "cashiering", "departures"],
  "Housekeeping Supervisor": ["housekeeping", "rooms"],
  "Night Auditor": ["dashboard", "departures", "cashiering", "reports"]
};
const viewLabels = {
  dashboard: "Today's Front Desk Overview",
  reservations: "Reservations Management",
  rooms: "Rooms and Availability",
  departures: "Departures and Check-Out",
  housekeeping: "Housekeeping Status",
  cashiering: "Cashiering and Folios",
  reports: "Operational Reports"
};

function offsetDate(days) {
  const value = new Date(today);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatPeso(amount) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

function nightsBetween(arrivalDate, departureDate) {
  return Math.max(1, Math.round((new Date(departureDate) - new Date(arrivalDate)) / 86400000));
}

function guestName(record) {
  return [record.guestFirstName, record.guestLastName].filter(Boolean).join(" ") || record.guest || "";
}

const state = {
  session: { user: "A. Santos", role: "Front Desk Agent", shift: "Morning", signedIn: true },
  activeView: "dashboard",
  arrivalFilter: "all",
  activeRoom: null,
  activeReservationId: null,
  printableReservationId: null,
  printableStayId: null,
  handovers: [],
  reservations: [
    {
      id: 1, confirmation: "GH-28491", status: "due-in", guestProfileId: "GP-1001", guestFirstName: "Alicia", guestLastName: "Fernandez",
      idType: "Passport", idNumber: "P1234567",
      phone: "+63 917 555 0131", email: "alicia@example.com", arrivalDate: dateKey, departureDate: offsetDate(2),
      eta: "12:30 PM", roomType: "Executive Suite", room: "402", adults: 2, children: 0, ratePlan: "BAR",
      nightlyRate: 7200, paymentMethod: "Credit Card Guarantee", notes: "High floor preferred.", vip: true
    },
    {
      id: 2, confirmation: "GH-28506", status: "due-in", guestProfileId: "GP-1002", guestFirstName: "Robert", guestLastName: "Delgado",
      idType: "Driver's License", idNumber: "N01-23-456789",
      phone: "+63 917 555 0132", email: "", arrivalDate: dateKey, departureDate: offsetDate(1),
      eta: "2:00 PM", roomType: "Deluxe King", room: "318", adults: 1, children: 0, ratePlan: "CORP",
      nightlyRate: 4800, paymentMethod: "Direct Bill", notes: "", vip: false
    },
    {
      id: 3, confirmation: "GH-28524", status: "due-in", guestProfileId: "GP-1003", guestFirstName: "Maria", guestLastName: "Velasco",
      idType: "National ID", idNumber: "1234-5678-9012",
      phone: "+63 917 555 0133", email: "maria@example.com", arrivalDate: dateKey, departureDate: offsetDate(3),
      eta: "3:15 PM", roomType: "Deluxe Twin", room: null, adults: 2, children: 1, ratePlan: "BAR",
      nightlyRate: 5250, paymentMethod: "Pay at Hostel", notes: "Late checkout requested.", vip: true
    },
    {
      id: 4, confirmation: "GH-28538", status: "due-in", guestProfileId: "GP-1004", guestFirstName: "James", guestLastName: "Wu",
      idType: "Passport", idNumber: "E7654321",
      phone: "", email: "", arrivalDate: dateKey, departureDate: offsetDate(1),
      eta: "5:30 PM", roomType: "Standard Queen", room: null, adults: 1, children: 0, ratePlan: "BAR",
      nightlyRate: 3900, paymentMethod: "Cash Deposit", notes: "", vip: false
    }
  ],
  rooms: [
    { number: "201", type: "STD", occupancy: "vacant", housekeeping: "clean", maintenance: "inService" },
    { number: "202", type: "STD", occupancy: "occupied", housekeeping: "clean", maintenance: "inService", guest: "Ana Romero" },
    { number: "203", type: "DLX", occupancy: "vacant", housekeeping: "inspected", maintenance: "inService" },
    { number: "204", type: "DLX", occupancy: "vacant", housekeeping: "dirty", maintenance: "inService" },
    { number: "205", type: "STD", occupancy: "vacant", housekeeping: "clean", maintenance: "inService" },
    { number: "301", type: "STD", occupancy: "occupied", housekeeping: "clean", maintenance: "inService", guest: "Jose Rivera" },
    { number: "302", type: "DLX", occupancy: "vacant", housekeeping: "clean", maintenance: "inService" },
    { number: "303", type: "DLX", occupancy: "occupied", housekeeping: "clean", maintenance: "inService", guest: "Linda Park" },
    { number: "304", type: "STE", occupancy: "vacant", housekeeping: "clean", maintenance: "outOfOrder" },
    { number: "305", type: "STD", occupancy: "occupied", housekeeping: "clean", maintenance: "inService", guest: "Daniel Reyes" },
    { number: "318", type: "DLX", occupancy: "assigned", housekeeping: "clean", maintenance: "inService", guest: "Robert Delgado" },
    { number: "401", type: "DLX", occupancy: "occupied", housekeeping: "clean", maintenance: "inService", guest: "Ramon Cruz" },
    { number: "402", type: "STE", occupancy: "assigned", housekeeping: "inspected", maintenance: "inService", guest: "Alicia Fernandez" },
    { number: "403", type: "DLX", occupancy: "vacant", housekeeping: "dirty", maintenance: "inService" },
    { number: "404", type: "STE", occupancy: "vacant", housekeeping: "clean", maintenance: "inService" }
  ],
  stays: [
    {
      id: 501, reservationId: null, guest: "Daniel Reyes", room: "305", departureDate: dateKey, status: "in-house",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 16500, reference: "POST-1001" }]
    },
    {
      id: 502, reservationId: null, guest: "Linda Park", room: "303", departureDate: dateKey, status: "in-house",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 4250, reference: "POST-1002" }]
    },
    {
      id: 503, reservationId: null, guest: "Ramon Cruz", room: "401", departureDate: offsetDate(1), status: "in-house",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 7800, reference: "POST-1003" }, { type: "Payment", description: "Card payment", amount: -7800, reference: "PAY-1001" }]
    },
    {
      id: 504, reservationId: null, guest: "Ana Romero", room: "202", departureDate: offsetDate(2), status: "in-house",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 3900, reference: "POST-1004" }, { type: "Payment", description: "Cash deposit", amount: -3900, reference: "PAY-1002" }]
    },
    {
      id: 505, reservationId: null, guest: "Jose Rivera", room: "301", departureDate: offsetDate(1), status: "in-house",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 3900, reference: "POST-1005" }]
    }
  ],
  activity: [
    { title: "Room 204 marked dirty", text: "Housekeeping queue updated - 8:16 AM", actor: "R. Villarin | Morning" },
    { title: "Advance deposit posted", text: `GH-28491 - ${formatPeso(12500)} - 7:48 AM`, actor: "C. Mendoza | Morning" },
    { title: "VIP arrival flagged", text: "Maria Velasco requested late checkout", actor: "A. Santos | Morning" }
  ]
};

const elements = {
  arrivalsTable: document.querySelector("#arrivalsTable"),
  roomRack: document.querySelector("#roomRack"),
  metrics: document.querySelector("#metrics"),
  inHouseGuests: document.querySelector("#inHouseGuests"),
  activityFeed: document.querySelector("#activityFeed"),
  toast: document.querySelector("#toast"),
  reservationModal: document.querySelector("#reservationModal"),
  reservationDetailModal: document.querySelector("#reservationDetailModal"),
  roomModal: document.querySelector("#roomModal"),
  checkInModal: document.querySelector("#checkInModal"),
  folioModal: document.querySelector("#folioModal"),
  dashboardWorkspace: document.querySelector("#dashboardWorkspace"),
  moduleWorkspace: document.querySelector("#moduleWorkspace"),
  newReservationButton: document.querySelector("#newReservationButton"),
  assignRoomButton: document.querySelector("#assignRoomButton"),
  handoverModal: document.querySelector("#handoverModal"),
  loginModal: document.querySelector("#loginModal")
};

document.querySelector("#businessDate").textContent = today.toLocaleDateString("en-PH", {
  weekday: "short", month: "short", day: "numeric", year: "numeric"
});

function dueInReservations() {
  return state.reservations.filter((reservation) => reservation.status === "due-in" && reservation.arrivalDate === dateKey);
}

function activeReservations() {
  return state.reservations.filter((reservation) => ["reserved", "due-in"].includes(reservation.status));
}

function inHouseStays() {
  return state.stays.filter((stay) => stay.status === "in-house");
}

function balanceFor(stay) {
  return stay.folio.reduce((total, transaction) => total + transaction.amount, 0);
}

function addActivity(title, text, actor = `${state.session.user} | ${state.session.shift}`) {
  state.activity.unshift({ title, text, actor });
  state.activity = state.activity.slice(0, 8);
}

function permitted(view) {
  return (roleAccess[state.session.role] || []).includes(view);
}

function hasFrontDeskAccess() {
  return permitted("reservations");
}

function canUpdateHousekeeping() {
  return ["Front Desk Supervisor", "Housekeeping Supervisor"].includes(state.session.role);
}

function canUpdateMaintenance() {
  return state.session.role === "Front Desk Supervisor";
}

function canCashier() {
  return permitted("cashiering");
}

function roomRackClass(room) {
  if (room.maintenance !== "inService") return "out";
  if (room.occupancy === "occupied") return "occupied";
  if (room.occupancy === "assigned") return "reserved";
  if (room.housekeeping === "dirty" || room.housekeeping === "pickup") return "dirty";
  return "available";
}

function roomIsAssignable(room) {
  return room.occupancy === "vacant"
    && ["clean", "inspected"].includes(room.housekeeping)
    && room.maintenance === "inService";
}

function statusPills(room) {
  const housekeepingClass = ["dirty", "pickup"].includes(room.housekeeping) ? "warning" : "";
  const maintenanceClass = room.maintenance !== "inService" ? "danger" : "";
  return `<span class="state-pill">${occupancyLabels[room.occupancy]}</span>
    <span class="state-pill ${housekeepingClass}">${housekeepingLabels[room.housekeeping]}</span>
    <span class="state-pill ${maintenanceClass}">${maintenanceLabels[room.maintenance]}</span>`;
}

function renderMetrics() {
  const occupied = state.rooms.filter((room) => room.occupancy === "occupied").length;
  const serviceRooms = state.rooms.filter((room) => room.housekeeping === "dirty" || room.maintenance !== "inService").length;
  const cards = [
    { label: "Occupancy", value: `${Math.round((occupied / state.rooms.length) * 100)}%`, detail: `${occupied} occupied rooms`, className: "positive" },
    { label: "Arrivals", value: dueInReservations().length, detail: `${dueInReservations().filter((reservation) => reservation.vip).length} VIP guests` },
    { label: "Departures", value: inHouseStays().filter((stay) => stay.departureDate === dateKey).length, detail: "Due out today" },
    { label: "In House", value: inHouseStays().length, detail: "Active stays" },
    { label: "Room Issues", value: serviceRooms, detail: "Needs action", className: serviceRooms ? "negative" : "positive" }
  ];
  elements.metrics.innerHTML = cards.map((card) => `
    <article class="metric"><p class="label">${card.label}</p><strong>${card.value}</strong><small class="${card.className || ""}">${card.detail}</small></article>
  `).join("");
}

function renderArrivals() {
  const filtered = dueInReservations().filter((reservation) => {
    if (state.arrivalFilter === "vip") return reservation.vip;
    if (state.arrivalFilter === "unassigned") return !reservation.room;
    return true;
  });
  elements.arrivalsTable.innerHTML = filtered.length ? filtered.map((reservation) => `
    <tr>
      <td>${guestName(reservation)}${reservation.vip ? '<span class="tag vip">VIP</span>' : ""}</td>
      <td>${reservation.confirmation}</td><td>${reservation.eta}</td><td>${reservation.room || "Unassigned"}</td>
      <td><span class="tag ${reservation.room ? "ready" : "pending"}">${reservation.room ? "Ready" : "Pending"}</span></td>
      <td><button class="row-action" data-arrival="${reservation.id}">${reservation.room ? "Review / Check In" : "Assign"}</button></td>
    </tr>
  `).join("") : '<tr><td colspan="6">No arrivals match this view.</td></tr>';
}

function renderRooms() {
  elements.roomRack.innerHTML = state.rooms.map((room) => `
    <button class="room ${roomRackClass(room)}" data-room="${room.number}">${room.number}<small>${room.type}</small></button>
  `).join("");
}

function renderGuests() {
  const stays = inHouseStays();
  document.querySelector("#inHouseCount").textContent = `${stays.length} Active`;
  elements.inHouseGuests.innerHTML = stays.map((stay) => `
    <div class="guest-card">
      <div><strong>${stay.guest}</strong><p>Room ${stay.room} | Departure ${formatDate(stay.departureDate)}</p></div>
      <div class="folio"><strong>${formatPeso(balanceFor(stay))}</strong><button class="text-button" data-folio="${stay.id}">View Folio</button></div>
    </div>
  `).join("");
}

function renderActivity() {
  elements.activityFeed.innerHTML = state.activity.slice(0, 4).map((entry) => `
    <div class="activity-item"><strong>${entry.title}</strong>${entry.text}<span class="activity-meta">${entry.actor}</span></div>
  `).join("");
}

function moduleStats(cards) {
  return `<div class="module-cards">${cards.map((card) => `<article class="panel module-stat"><p>${card.label}</p><strong>${card.value}</strong></article>`).join("")}</div>`;
}

function renderReservationsWorkspace() {
  const reservations = activeReservations();
  const dueToday = dueInReservations();
  elements.moduleWorkspace.innerHTML = `
    <article class="panel module-banner"><div><p class="eyebrow">Booking Control</p><h3>Active Reservations</h3></div><p>Reservation details, assignment, and guided check-in.</p></article>
    ${moduleStats([
      { label: "Due In Today", value: dueToday.length },
      { label: "Future Reserved", value: reservations.filter((item) => item.status === "reserved").length },
      { label: "Awaiting Room Today", value: dueToday.filter((item) => !item.room).length }
    ])}
    <article class="panel workspace-panel">
      <div class="panel-heading"><div><p class="eyebrow">Reservations</p><h3>Arrival Detail</h3></div></div>
      <div class="workspace-table"><table>
        <thead><tr><th>Guest / Confirmation</th><th>Stay</th><th>Room Type / Room</th><th>Rate / Guarantee</th><th></th></tr></thead>
        <tbody>${reservations.map((reservation) => `
          <tr>
            <td>${guestName(reservation)}<br><small>${reservation.confirmation}${reservation.vip ? " | VIP" : ""}</small></td>
            <td>${formatDate(reservation.arrivalDate)} - ${formatDate(reservation.departureDate)}<br><small>${nightsBetween(reservation.arrivalDate, reservation.departureDate)} night(s)</small></td>
            <td>${reservation.roomType}<br><small>${reservation.room || "Unassigned"}</small></td>
            <td>${formatPeso(reservation.nightlyRate)} / ${reservation.ratePlan}<br><small>${reservation.paymentMethod}</small></td>
            <td><button class="row-action" data-reservation-detail="${reservation.id}">Details</button> ${reservation.status === "reserved" ? '<span class="tag pending">Reserved</span>' : `<button class="row-action" data-module-arrival="${reservation.id}">${reservation.room ? "Check In" : "Assign Room"}</button>`}</td>
          </tr>`).join("") || '<tr><td colspan="5">All expected guests are checked in.</td></tr>'}</tbody>
      </table></div>
    </article>`;
}

function renderRoomsWorkspace() {
  elements.moduleWorkspace.innerHTML = `
    <article class="panel module-banner"><div><p class="eyebrow">Inventory Control</p><h3>Room Rack and Availability</h3></div><p>Front-office, housekeeping, and maintenance states are tracked separately.</p></article>
    ${moduleStats([
      { label: "Ready Vacant", value: state.rooms.filter(roomIsAssignable).length },
      { label: "Occupied", value: state.rooms.filter((room) => room.occupancy === "occupied").length },
      { label: "Assigned", value: state.rooms.filter((room) => room.occupancy === "assigned").length }
    ])}
    <article class="panel workspace-panel"><div class="panel-heading"><div><p class="eyebrow">Room Inventory</p><h3>All Floors</h3></div></div>
      <div class="status-board">${state.rooms.map((room) => `
        <div class="status-row"><div><strong>Room ${room.number}</strong><p>${room.type}${room.guest ? ` | ${room.guest}` : ""}</p></div>
        <div class="status-row-actions">${statusPills(room)}<button class="row-action" data-open-room="${room.number}">${canUpdateHousekeeping() ? "Update" : "View"}</button></div></div>`).join("")}</div>
    </article>`;
}

function renderHousekeepingWorkspace() {
  const queue = state.rooms.filter((room) => (!["clean", "inspected"].includes(room.housekeeping)) || room.maintenance !== "inService");
  elements.moduleWorkspace.innerHTML = `
    <article class="panel module-banner"><div><p class="eyebrow">Housekeeping</p><h3>Room Service Queue</h3></div><p>Housekeeping status is independent of room occupancy.</p></article>
    ${moduleStats([
      { label: "Dirty / Pickup", value: state.rooms.filter((room) => ["dirty", "pickup"].includes(room.housekeeping)).length },
      { label: "Out of Service", value: state.rooms.filter((room) => room.maintenance !== "inService").length },
      { label: "Inspected", value: state.rooms.filter((room) => room.housekeeping === "inspected").length }
    ])}
    <article class="panel workspace-panel"><div class="panel-heading"><div><p class="eyebrow">Work Queue</p><h3>Rooms Requiring Attention</h3></div></div>
      <div class="status-board">${queue.map((room) => `
        <div class="status-row"><div><strong>Room ${room.number}</strong><p>${room.type}${room.guest ? ` | ${room.guest}` : ""}</p></div>
        <div class="status-row-actions">${statusPills(room)}${["dirty", "pickup"].includes(room.housekeeping) ? `<button class="row-action" data-clean-room="${room.number}">Mark Inspected</button>` : `<button class="row-action" data-open-room="${room.number}">Review</button>`}</div></div>`).join("") || "<p>No rooms are awaiting housekeeping action.</p>"}</div>
    </article>`;
}

function renderDeparturesWorkspace() {
  const stays = inHouseStays();
  const dueToday = stays.filter((stay) => stay.departureDate === dateKey);
  elements.moduleWorkspace.innerHTML = `
    <article class="panel module-banner"><div><p class="eyebrow">Front Desk</p><h3>Departures and Check-Out</h3></div><p>Settle open folios before completing departure.</p></article>
    ${moduleStats([
      { label: "Due Out Today", value: dueToday.length },
      { label: "Outstanding Folios", value: stays.filter((stay) => balanceFor(stay) !== 0).length },
      { label: "Ready To Check Out", value: stays.filter((stay) => balanceFor(stay) === 0).length }
    ])}
    <article class="panel workspace-panel"><div class="panel-heading"><div><p class="eyebrow">Departures</p><h3>In-House Guests</h3></div></div>
      <div class="workspace-table"><table><thead><tr><th>Guest</th><th>Room</th><th>Departure</th><th>Folio Balance</th><th></th></tr></thead><tbody>
        ${stays.map((stay) => `<tr><td>${stay.guest}</td><td>${stay.room}</td><td>${formatDate(stay.departureDate)}</td><td>${formatPeso(balanceFor(stay))}</td>
        <td><button class="row-action" data-view-folio="${stay.id}">Folio</button> <button class="row-action" data-check-out="${stay.id}">Check Out</button></td></tr>`).join("")}
      </tbody></table></div>
    </article>`;
}

function renderCashieringWorkspace() {
  const stays = inHouseStays();
  elements.moduleWorkspace.innerHTML = `
    <article class="panel module-banner"><div><p class="eyebrow">Cashiering</p><h3>Guest Folios and Settlement</h3></div><p>Balances are calculated from posted ledger transactions.</p></article>
    ${moduleStats([
      { label: "Open Folios", value: stays.length },
      { label: "Due For Payment", value: stays.filter((stay) => balanceFor(stay) !== 0).length },
      { label: "Settled", value: stays.filter((stay) => balanceFor(stay) === 0).length }
    ])}
    <article class="panel workspace-panel"><div class="panel-heading"><div><p class="eyebrow">In House Accounts</p><h3>Open Folios</h3></div></div>
      <div class="workspace-table"><table><thead><tr><th>Guest</th><th>Room</th><th>Balance</th><th>Ledger</th><th></th></tr></thead><tbody>
        ${stays.map((stay) => `<tr><td>${stay.guest}</td><td>${stay.room}</td><td>${formatPeso(balanceFor(stay))}</td><td>${stay.folio.length} posting(s)</td>
        <td><button class="row-action" data-view-folio="${stay.id}">View Ledger</button> ${balanceFor(stay) !== 0 ? `<button class="row-action" data-settle-folio="${stay.id}">Post Payment</button>` : '<span class="tag ready">Settled</span>'}</td></tr>`).join("")}
      </tbody></table></div>
    </article>`;
}

function renderReportsWorkspace() {
  elements.moduleWorkspace.innerHTML = `
    <article class="panel module-banner"><div><p class="eyebrow">Reports</p><h3>Operational Report Center</h3></div><p>Business-date reporting for reservations, rooms, and ledgers.</p></article>
    ${moduleStats([
      { label: "Reservations Due In", value: dueInReservations().length },
      { label: "In House", value: inHouseStays().length },
      { label: "Ledger Postings", value: inHouseStays().reduce((count, stay) => count + stay.folio.length, 0) }
    ])}
    <article class="panel workspace-panel"><div class="panel-heading"><div><p class="eyebrow">Available Reports</p><h3>Daily Operations</h3></div></div>
      <div class="report-grid">
        ${["Arrival Forecast", "Room State Summary", "Cashier Ledger", "Departure List"].map((report) => `<div class="report-tile"><strong>${report}</strong><p>Generated for the current business date.</p><button class="text-button" data-report="${report}">Generate Report</button></div>`).join("")}
      </div>
    </article>`;
}

function renderModuleWorkspace() {
  if (state.activeView === "dashboard") return;
  const renderers = {
    reservations: renderReservationsWorkspace,
    rooms: renderRoomsWorkspace,
    departures: renderDeparturesWorkspace,
    housekeeping: renderHousekeepingWorkspace,
    cashiering: renderCashieringWorkspace,
    reports: renderReportsWorkspace
  };
  renderers[state.activeView]();
}

function renderAll() {
  renderMetrics();
  renderArrivals();
  renderRooms();
  renderGuests();
  renderActivity();
  renderModuleWorkspace();
}

let toastTimer;
function notify(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2700);
}

function renderSession() {
  document.querySelector("#activeOperator").textContent = state.session.signedIn ? state.session.user : "Signed Out";
  document.querySelector("#activeRole").textContent = state.session.signedIn ? state.session.role : "No active role";
  document.querySelector("#activeShift").textContent = state.session.signedIn ? state.session.shift : "No Active Shift";
  const allowedViews = roleAccess[state.session.role] || [];
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("hidden", !allowedViews.includes(button.dataset.view)));
  if (!allowedViews.includes(state.activeView)) state.activeView = allowedViews[0] || "dashboard";
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === state.activeView));
  document.querySelector("#viewTitle").textContent = viewLabels[state.activeView];
  const dashboard = state.activeView === "dashboard";
  elements.dashboardWorkspace.classList.toggle("hidden", !dashboard);
  elements.moduleWorkspace.classList.toggle("hidden", dashboard);
  elements.newReservationButton.classList.toggle("hidden", !hasFrontDeskAccess());
  elements.assignRoomButton.classList.toggle("hidden", !hasFrontDeskAccess());
  renderAll();
}

function assignAvailableRoom(reservation) {
  const roomTypeCodes = {
    "Standard Queen": "STD",
    "Deluxe King": "DLX",
    "Deluxe Twin": "DLX",
    "Executive Suite": "STE"
  };
  const requestedType = roomTypeCodes[reservation.roomType];
  const room = state.rooms.find((candidate) => candidate.type === requestedType && roomIsAssignable(candidate));
  if (!room) {
    notify(`No ready ${reservation.roomType} rooms are available.`);
    return false;
  }
  reservation.room = room.number;
  room.occupancy = "assigned";
  room.guest = guestName(reservation);
  addActivity(`Room ${room.number} assigned`, `${guestName(reservation)} - ${reservation.confirmation}`);
  return true;
}

function openReservationDetail(id) {
  const reservation = state.reservations.find((item) => item.id === Number(id));
  state.printableReservationId = reservation.id;
  document.querySelector("#reservationDetailTitle").textContent = `${guestName(reservation)} | ${reservation.confirmation}`;
  document.querySelector("#reservationDetailContent").innerHTML = `
    <div class="detail-cell"><span>Status</span>${reservation.status.toUpperCase()}</div>
    <div class="detail-cell"><span>Guest Profile</span>${reservation.guestProfileId}</div>
    <div class="detail-cell"><span>First Name</span>${reservation.guestFirstName}</div>
    <div class="detail-cell"><span>Last Name</span>${reservation.guestLastName}</div>
    <div class="detail-cell"><span>Stay Dates</span>${formatDate(reservation.arrivalDate)} - ${formatDate(reservation.departureDate)} (${nightsBetween(reservation.arrivalDate, reservation.departureDate)} night(s))</div>
    <div class="detail-cell"><span>Occupancy</span>${reservation.adults} adult(s), ${reservation.children} child(ren)</div>
    <div class="detail-cell"><span>Room</span>${reservation.roomType} / ${reservation.room || "Unassigned"}</div>
    <div class="detail-cell"><span>Rate</span>${reservation.ratePlan} | ${formatPeso(reservation.nightlyRate)} nightly</div>
    <div class="detail-cell"><span>Guarantee</span>${reservation.paymentMethod}</div>
    <div class="detail-cell"><span>ID Type</span>${reservation.idType}</div>
    <div class="detail-cell"><span>ID Number</span>${reservation.idNumber}</div>
    <div class="detail-cell"><span>Contact</span>${reservation.phone || "No phone"}<br>${reservation.email || "No email"}</div>
    <div class="detail-cell full"><span>Notes / Preferences</span>${reservation.notes || "None recorded"}</div>`;
  elements.reservationDetailModal.showModal();
}

function beginArrivalAction(id) {
  if (!hasFrontDeskAccess()) return notify("Your role cannot process arrivals.");
  const reservation = state.reservations.find((item) => item.id === Number(id));
  if (!reservation.room) {
    if (assignAvailableRoom(reservation)) {
      renderAll();
      notify(`${guestName(reservation)} assigned to room ${reservation.room}.`);
    }
    return;
  }
  const room = state.rooms.find((item) => item.number === reservation.room);
  if (!room || room.occupancy !== "assigned" || room.guest !== guestName(reservation) || room.maintenance !== "inService" || !["clean", "inspected"].includes(room.housekeeping)) {
    notify("Assigned room is not ready for check-in. Review room status first.");
    return;
  }
  state.activeReservationId = reservation.id;
  document.querySelector("#checkInOverview").innerHTML = `
    <strong>${guestName(reservation)}</strong> | ${reservation.confirmation}<br>
    Stay: ${formatDate(reservation.arrivalDate)} - ${formatDate(reservation.departureDate)} (${nightsBetween(reservation.arrivalDate, reservation.departureDate)} night(s))<br>
    Room: ${reservation.room} / ${reservation.roomType} | Rate: ${formatPeso(reservation.nightlyRate)} per night<br>
    Room Readiness: ${housekeepingLabels[room.housekeeping]} / ${maintenanceLabels[room.maintenance]}<br>
    ID: ${reservation.idType} / ${reservation.idNumber}<br>
    Notes: ${reservation.notes || "None recorded"}
  `;
  document.querySelector("#checkInPaymentMethod").value = reservation.paymentMethod;
  document.querySelector("#checkInIdentity").checked = false;
  document.querySelector("#checkInRoomReady").checked = false;
  elements.checkInModal.showModal();
}

function completeCheckIn() {
  if (!hasFrontDeskAccess()) return notify("Your role cannot complete check-in.");
  const reservation = state.reservations.find((item) => item.id === state.activeReservationId);
  const room = state.rooms.find((item) => item.number === reservation.room);
  reservation.status = "checked-in";
  reservation.paymentMethod = document.querySelector("#checkInPaymentMethod").value;
  room.occupancy = "occupied";
  room.guest = guestName(reservation);
  const lodgingTotal = reservation.nightlyRate * nightsBetween(reservation.arrivalDate, reservation.departureDate);
  state.stays.unshift({
    id: Date.now(),
    reservationId: reservation.id,
    guest: guestName(reservation),
    room: reservation.room,
    departureDate: reservation.departureDate,
    status: "in-house",
    folio: [{ type: "Room Charge", description: `${nightsBetween(reservation.arrivalDate, reservation.departureDate)} night accommodation`, amount: lodgingTotal, reference: `POST-${reservation.confirmation}` }]
  });
  addActivity(`${guestName(reservation)} checked in`, `Room ${reservation.room} | ${document.querySelector("#checkInKeys").value} key(s) issued`);
  elements.checkInModal.close();
  renderAll();
  notify(`Check-in completed for ${guestName(reservation)}.`);
}

function openRoom(number) {
  const room = state.rooms.find((item) => item.number === number);
  state.activeRoom = room;
  document.querySelector("#roomModalTitle").textContent = `Room ${room.number}`;
  document.querySelector("#roomDetails").innerHTML = `<strong>${room.type} Room</strong><br>${statusPills(room)}<br>${room.guest ? `Registered / assigned guest: ${room.guest}` : "No guest assigned"}`;
  document.querySelector("#roomOccupancySelect").value = room.occupancy;
  document.querySelector("#roomHousekeepingSelect").value = room.housekeeping;
  document.querySelector("#roomMaintenanceSelect").value = room.maintenance;
  document.querySelector("#roomOccupancySelect").disabled = true;
  document.querySelector("#roomHousekeepingSelect").disabled = !canUpdateHousekeeping();
  document.querySelector("#roomMaintenanceSelect").disabled = !canUpdateMaintenance();
  document.querySelector("#updateRoomStatusButton").classList.toggle("hidden", !canUpdateHousekeeping() && !canUpdateMaintenance());
  elements.roomModal.showModal();
}

function openFolio(stayId) {
  const stay = state.stays.find((item) => item.id === Number(stayId));
  state.printableStayId = stay.id;
  document.querySelector("#folioModalTitle").textContent = `${stay.guest} | Room ${stay.room}`;
  document.querySelector("#folioLedger").innerHTML = `
    <table><thead><tr><th>Type</th><th>Description</th><th>Reference</th><th>Amount</th></tr></thead>
    <tbody>${stay.folio.map((item) => `<tr><td>${item.type}</td><td>${item.description}</td><td>${item.reference}</td><td>${formatPeso(item.amount)}</td></tr>`).join("")}</tbody></table>
    <div class="ledger-total"><span>Balance Due</span><span>${formatPeso(balanceFor(stay))}</span></div>`;
  elements.folioModal.showModal();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function printTable(headers, rows) {
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
}

function openPrintDocument(title, subtitle, body) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    notify("Enable pop-ups to print documents.");
    return;
  }
  printWindow.document.write(`<!doctype html>
    <html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 34px; color: #172b3d; font-family: Arial, sans-serif; font-size: 12px; }
      .header { display: flex; justify-content: space-between; padding-bottom: 18px; border-bottom: 2px solid #102a43; }
      .hotel { font-family: Georgia, serif; font-size: 23px; color: #102a43; }
      .header p, .meta p { margin: 5px 0 0; color: #5c6c79; }
      .meta { text-align: right; }
      h1 { margin: 26px 0 5px; font-family: Georgia, serif; font-size: 22px; font-weight: normal; }
      .subtitle { margin-bottom: 23px; color: #5c6c79; }
      .details { display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid #dbe1e4; margin: 18px 0 24px; }
      .detail { padding: 11px 13px; border-bottom: 1px solid #e9edef; }
      .detail:nth-child(odd) { border-right: 1px solid #e9edef; }
      .detail span { display: block; margin-bottom: 4px; font-size: 10px; font-weight: bold; color: #657682; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin: 18px 0; }
      th { border-bottom: 2px solid #102a43; padding: 9px 7px; color: #536673; font-size: 10px; text-align: left; text-transform: uppercase; }
      td { border-bottom: 1px solid #dfe5e7; padding: 10px 7px; }
      .total { display: flex; justify-content: flex-end; gap: 40px; border-top: 2px solid #102a43; padding-top: 13px; font-size: 15px; font-weight: bold; }
      .footer { margin-top: 42px; border-top: 1px solid #dfe5e7; padding-top: 10px; color: #667682; font-size: 10px; }
      @media print { body { margin: 14mm; } .no-print { display: none; } }
    </style></head><body>
      <header class="header">
        <div><div class="hotel">Nemsu Tagbina Mini Hostel</div><p>Front Desk Console</p></div>
        <div class="meta"><p>Business Date: ${escapeHtml(document.querySelector("#businessDate").textContent)}</p><p>Printed by: ${escapeHtml(state.session.user)} | ${escapeHtml(state.session.shift)}</p></div>
      </header>
      <h1>${escapeHtml(title)}</h1><div class="subtitle">${escapeHtml(subtitle)}</div>
      ${body}
      <div class="footer">Generated from the current Front Desk Console session. Nemsu Tagbina Mini Hostel operational document.</div>
    </body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 180);
}

function printReservation() {
  const reservation = state.reservations.find((item) => item.id === state.printableReservationId);
  if (!reservation) return notify("Open a reservation before printing.");
  const details = [
    ["Confirmation No.", reservation.confirmation],
    ["Reservation Status", reservation.status.toUpperCase()],
    ["Guest First Name", reservation.guestFirstName],
    ["Guest Last Name", reservation.guestLastName],
    ["Guest Profile", reservation.guestProfileId],
    ["Arrival", formatDate(reservation.arrivalDate)],
    ["Departure", formatDate(reservation.departureDate)],
    ["Room Type", reservation.roomType],
    ["Assigned Room", reservation.room || "To be assigned"],
    ["Occupancy", `${reservation.adults} adult(s), ${reservation.children} child(ren)`],
    ["Rate Plan", reservation.ratePlan],
    ["Nightly Rate", formatPeso(reservation.nightlyRate)],
    ["Estimated Total", formatPeso(reservation.nightlyRate * nightsBetween(reservation.arrivalDate, reservation.departureDate))],
    ["Guarantee", reservation.paymentMethod],
    ["ID Type", reservation.idType],
    ["ID Number", reservation.idNumber],
    ["Contact", reservation.phone || "Not provided"],
    ["Email", reservation.email || "Not provided"],
    ["VIP", reservation.vip ? "Yes" : "No"]
  ];
  const detailHtml = `<div class="details">${details.map(([label, value]) => `<div class="detail"><span>${escapeHtml(label)}</span>${escapeHtml(value)}</div>`).join("")}</div>
    <div class="detail"><span>Notes / Preferences</span>${escapeHtml(reservation.notes || "None recorded")}</div>`;
  openPrintDocument("Reservation Confirmation", `${guestName(reservation)} | ${reservation.confirmation}`, detailHtml);
  addActivity("Reservation confirmation printed", reservation.confirmation);
  renderActivity();
}

function printFolio() {
  const stay = state.stays.find((item) => item.id === state.printableStayId);
  if (!stay) return notify("Open a folio before printing.");
  const ledger = printTable(
    ["Type", "Description", "Reference", "Amount"],
    stay.folio.map((item) => [item.type, item.description, item.reference, formatPeso(item.amount)])
  );
  const body = `<div class="details">
      <div class="detail"><span>Guest</span>${escapeHtml(stay.guest)}</div>
      <div class="detail"><span>Room</span>${escapeHtml(stay.room)}</div>
      <div class="detail"><span>Departure</span>${escapeHtml(formatDate(stay.departureDate))}</div>
      <div class="detail"><span>Folio Status</span>${balanceFor(stay) === 0 ? "Settled" : "Open"}</div>
    </div>${ledger}<div class="total"><span>Balance Due</span><span>${escapeHtml(formatPeso(balanceFor(stay)))}</span></div>`;
  openPrintDocument("Guest Folio", `${stay.guest} | Room ${stay.room}`, body);
  addActivity("Guest folio printed", `${stay.guest} - Room ${stay.room}`);
  renderActivity();
}

function printReport(report) {
  let subtitle = "Current business date operational report";
  let body = "";
  if (report === "Arrival Forecast") {
    body = printTable(
      ["Confirmation", "Guest", "Arrival", "Room Type", "Assigned Room", "Status"],
      activeReservations().map((item) => [item.confirmation, guestName(item), formatDate(item.arrivalDate), item.roomType, item.room || "Unassigned", item.status.toUpperCase()])
    );
  }
  if (report === "Room State Summary") {
    body = printTable(
      ["Room", "Type", "Occupancy", "Housekeeping", "Maintenance", "Guest"],
      state.rooms.map((room) => [room.number, room.type, occupancyLabels[room.occupancy], housekeepingLabels[room.housekeeping], maintenanceLabels[room.maintenance], room.guest || ""])
    );
  }
  if (report === "Cashier Ledger") {
    const stays = inHouseStays();
    body = printTable(
      ["Guest", "Room", "Postings", "Balance Due"],
      stays.map((stay) => [stay.guest, stay.room, String(stay.folio.length), formatPeso(balanceFor(stay))])
    ) + `<div class="total"><span>Total Outstanding</span><span>${escapeHtml(formatPeso(stays.reduce((sum, stay) => sum + balanceFor(stay), 0)))}</span></div>`;
  }
  if (report === "Departure List") {
    body = printTable(
      ["Guest", "Room", "Departure", "Balance", "Ready For Check-Out"],
      inHouseStays().map((stay) => [stay.guest, stay.room, formatDate(stay.departureDate), formatPeso(balanceFor(stay)), balanceFor(stay) === 0 ? "Yes" : "No"])
    );
  }
  openPrintDocument(report, subtitle, body);
  addActivity("Operational report printed", report);
  renderActivity();
}

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
});

document.querySelector("#printReservationButton").addEventListener("click", printReservation);
document.querySelector("#printFolioButton").addEventListener("click", printFolio);

elements.newReservationButton.addEventListener("click", () => {
  if (!hasFrontDeskAccess()) return notify("Reservation access is not assigned to this role.");
  document.querySelector('[name="arrivalDate"]').value = dateKey;
  document.querySelector('[name="departureDate"]').value = offsetDate(1);
  elements.reservationModal.showModal();
});

document.querySelector("#reservationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!hasFrontDeskAccess()) return notify("Reservation access is not assigned to this role.");
  if (!event.target.reportValidity()) return;
  const values = new FormData(event.target);
  if (values.get("departureDate") <= values.get("arrivalDate")) return notify("Departure must occur after arrival.");
  const id = Date.now();
  const reservation = {
    id, confirmation: `GH-${String(id).slice(-5)}`, status: values.get("arrivalDate") === dateKey ? "due-in" : "reserved", guestProfileId: `GP-${String(id).slice(-5)}`,
    guestFirstName: values.get("guestFirstName").trim(),
    guestLastName: values.get("guestLastName").trim(),
    idType: values.get("idType"),
    idNumber: values.get("idNumber").trim(),
    arrivalDate: values.get("arrivalDate"),
    departureDate: values.get("departureDate"),
    eta: new Date(`2000-01-01T${values.get("eta")}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    roomType: values.get("roomType"), room: null, adults: Number(values.get("adults")), children: Number(values.get("children")),
    ratePlan: values.get("ratePlan"), nightlyRate: Number(values.get("nightlyRate")), paymentMethod: values.get("paymentMethod"),
    phone: values.get("phone"), email: values.get("email"), notes: values.get("notes"), vip: values.get("vip") === "true"
  };
  state.reservations.push(reservation);
  addActivity("Reservation created", `${guestName(reservation)} - ${reservation.confirmation}`);
  event.target.reset();
  elements.reservationModal.close();
  renderAll();
  notify(`Reservation ${reservation.confirmation} saved.`);
});

document.querySelector("#checkInForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.reportValidity()) completeCheckIn();
});

document.querySelector("#arrivalTabs").addEventListener("click", (event) => {
  if (!event.target.dataset.filter) return;
  state.arrivalFilter = event.target.dataset.filter;
  document.querySelectorAll("#arrivalTabs button").forEach((button) => button.classList.toggle("active", button.dataset.filter === state.arrivalFilter));
  renderArrivals();
});

elements.arrivalsTable.addEventListener("click", (event) => {
  if (event.target.dataset.arrival) beginArrivalAction(event.target.dataset.arrival);
});

elements.roomRack.addEventListener("click", (event) => {
  const button = event.target.closest("[data-room]");
  if (button) openRoom(button.dataset.room);
});

document.querySelector("#roomForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!canUpdateHousekeeping() && !canUpdateMaintenance()) return notify("You have view-only access to room operations.");
  const room = state.activeRoom;
  if (canUpdateHousekeeping()) room.housekeeping = document.querySelector("#roomHousekeepingSelect").value;
  if (canUpdateMaintenance()) room.maintenance = document.querySelector("#roomMaintenanceSelect").value;
  addActivity(`Room ${room.number} status updated`, `${housekeepingLabels[room.housekeeping]} / ${maintenanceLabels[room.maintenance]}`);
  elements.roomModal.close();
  renderAll();
  notify(`Operations status updated for room ${room.number}.`);
});

elements.assignRoomButton.addEventListener("click", () => {
  if (!hasFrontDeskAccess()) return notify("Room assignment is restricted for this role.");
  const pending = dueInReservations().find((reservation) => !reservation.room);
  if (!pending) return notify("All due-in reservations already have assigned rooms.");
  if (assignAvailableRoom(pending)) {
    renderAll();
    notify(`Room ${pending.room} assigned to ${guestName(pending)}.`);
  }
});

document.querySelector("#showAllRooms").addEventListener("click", () => notify(`${state.rooms.length} rooms displayed in the current rack.`));

elements.inHouseGuests.addEventListener("click", (event) => {
  if (event.target.dataset.folio) openFolio(event.target.dataset.folio);
});

elements.moduleWorkspace.addEventListener("click", (event) => {
  if (event.target.dataset.reservationDetail) openReservationDetail(event.target.dataset.reservationDetail);
  if (event.target.dataset.moduleArrival) beginArrivalAction(event.target.dataset.moduleArrival);
  if (event.target.dataset.openRoom) openRoom(event.target.dataset.openRoom);
  if (event.target.dataset.cleanRoom) {
    if (!canUpdateHousekeeping()) return notify("Housekeeping update permission is required.");
    const room = state.rooms.find((item) => item.number === event.target.dataset.cleanRoom);
    room.housekeeping = "inspected";
    addActivity(`Room ${room.number} inspected`, "Housekeeping marked the room inspected.");
    renderAll();
    notify(`Room ${room.number} is now inspected.`);
  }
  if (event.target.dataset.viewFolio) openFolio(event.target.dataset.viewFolio);
  if (event.target.dataset.settleFolio) {
    if (!canCashier()) return notify("Cashiering access is required.");
    const stay = state.stays.find((item) => item.id === Number(event.target.dataset.settleFolio));
    const balance = balanceFor(stay);
    stay.folio.push({ type: "Payment", description: "Payment received", amount: -balance, reference: `PAY-${Date.now().toString().slice(-5)}` });
    addActivity("Payment posted", `${stay.guest} - ${formatPeso(balance)}`);
    renderAll();
    notify(`${stay.guest}'s payment was posted to the ledger.`);
  }
  if (event.target.dataset.checkOut) {
    if (!permitted("departures")) return notify("Departure access is required.");
    const stay = state.stays.find((item) => item.id === Number(event.target.dataset.checkOut));
    if (balanceFor(stay) !== 0) return notify("Settle the folio balance before check-out.");
    stay.status = "checked-out";
    const room = state.rooms.find((item) => item.number === stay.room);
    room.occupancy = "vacant";
    room.housekeeping = "dirty";
    delete room.guest;
    if (stay.reservationId) state.reservations.find((item) => item.id === stay.reservationId).status = "checked-out";
    addActivity(`${stay.guest} checked out`, `Room ${stay.room} released to housekeeping.`);
    renderAll();
    notify(`Check-out completed. Room ${stay.room} is vacant dirty.`);
  }
  if (event.target.dataset.report) {
    if (!permitted("reports")) return notify("Reporting access is required.");
    printReport(event.target.dataset.report);
    notify(`${event.target.dataset.report} opened for printing.`);
  }
});

document.querySelector("#globalSearch").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  const feedback = document.querySelector("#searchFeedback");
  if (!query) return void (feedback.textContent = "Ready for lookup");
  const reservation = state.reservations.find((item) => guestName(item).toLowerCase().includes(query) || item.confirmation.toLowerCase().includes(query) || item.idNumber.toLowerCase().includes(query) || (item.room || "").includes(query));
  const stay = inHouseStays().find((item) => item.guest.toLowerCase().includes(query) || item.room.includes(query));
  feedback.textContent = reservation ? `Reservation: ${guestName(reservation)}` : stay ? `In House: ${stay.guest}` : "No matching guest found";
});

document.querySelector("#navigation").addEventListener("click", (event) => {
  const selected = event.target.closest(".nav-item");
  if (!selected || !permitted(selected.dataset.view)) return;
  state.activeView = selected.dataset.view;
  renderSession();
});

document.querySelector("#changeShiftButton").addEventListener("click", () => {
  if (!state.session.signedIn) return;
  document.querySelector("#handoverSummary").innerHTML = `
    Outgoing operator: <strong>${state.session.user}</strong> (${state.session.role})<br>
    Active shift: <strong>${state.session.shift}</strong><br>
    Items to hand over: <strong>${dueInReservations().filter((reservation) => !reservation.room).length} unassigned arrivals</strong> and
    <strong>${inHouseStays().filter((stay) => balanceFor(stay) !== 0).length} unsettled folios</strong>`;
  elements.handoverModal.showModal();
});

document.querySelector("#handoverForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  const values = new FormData(event.target);
  const outgoing = { ...state.session };
  const [user, role] = values.get("incomingUser").split("|");
  state.handovers.unshift({ outgoing, incoming: { user, role, shift: values.get("incomingShift") }, notes: values.get("notes") });
  state.session = { user, role, shift: values.get("incomingShift"), signedIn: true };
  addActivity("Shift handover completed", `${outgoing.user} transferred duty to ${user}.`, `${outgoing.user} | ${outgoing.shift}`);
  elements.handoverModal.close();
  event.target.reset();
  renderSession();
  notify(`${state.session.shift} shift opened for ${state.session.user}.`);
});

document.querySelector("#signOutButton").addEventListener("click", () => {
  if (!state.session.signedIn) return;
  addActivity("Operator signed out", `${state.session.user} closed access to this workstation.`);
  state.session.signedIn = false;
  renderSession();
  elements.loginModal.showModal();
});

document.querySelector("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = new FormData(event.target);
  const [user, role] = values.get("loginUser").split("|");
  state.session = { user, role, shift: values.get("loginShift"), signedIn: true };
  addActivity("Operator signed in", `${user} opened the ${state.session.shift} workspace.`);
  elements.loginModal.close();
  renderSession();
  notify(`Welcome, ${user}. ${role} access enabled.`);
});

elements.loginModal.addEventListener("cancel", (event) => {
  if (!state.session.signedIn) event.preventDefault();
});

renderSession();
