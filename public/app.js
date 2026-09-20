const today = new Date();
const dateKey = formatDateKey(today);
const occupancyLabels = { vacant: "Vacant", assigned: "Assigned", occupied: "Occupied" };
const housekeepingLabels = { clean: "Clean", dirty: "Dirty", inspected: "Inspected", pickup: "Pickup" };
const maintenanceLabels = { inService: "In Service", outOfService: "Out of Service", outOfOrder: "Out of Order" };
const roleAccess = {
  "Front Desk Agent": ["dashboard", "reservations", "rooms", "departures", "services"],
  "Front Desk Supervisor": ["dashboard", "reservations", "rooms", "departures", "services", "housekeeping", "cashiering", "reports"],
  "Cashier": ["dashboard", "cashiering", "departures", "services"],
  "Housekeeping Supervisor": ["housekeeping", "rooms"],
  "Night Auditor": ["dashboard", "departures", "cashiering", "services", "reports"]
};
const rolePermissions = {
  "Front Desk Agent": ["reservation.create", "room.assign", "guest.check_in", "service_charge.post", "guest.check_out"],
  "Front Desk Supervisor": ["reservation.create", "room.assign", "guest.check_in", "room.housekeeping.update", "room.maintenance.update", "service_charge.post", "payment.post", "guest.check_out", "report.view", "demo.reset"],
  Cashier: ["service_charge.post", "payment.post", "guest.check_out"],
  "Housekeeping Supervisor": ["room.housekeeping.update"],
  "Night Auditor": ["service_charge.post", "payment.post", "guest.check_out", "report.view", "demo.reset"]
};
const viewLabels = {
  dashboard: "Today's Front Desk Overview",
  reservations: "Reservations Management",
  rooms: "Rooms and Availability",
  departures: "Departures and Check-Out",
  services: "Services and Add-On Charges",
  housekeeping: "Housekeeping Status",
  cashiering: "Cashiering and Folios",
  reports: "Operational Reports"
};
const nationalityOptions = {
  Filipino: "🇵🇭 Filipino",
  American: "🇺🇸 American",
  Australian: "🇦🇺 Australian",
  British: "🇬🇧 British",
  Canadian: "🇨🇦 Canadian",
  Chinese: "🇨🇳 Chinese",
  French: "🇫🇷 French",
  German: "🇩🇪 German",
  Indian: "🇮🇳 Indian",
  Indonesian: "🇮🇩 Indonesian",
  Japanese: "🇯🇵 Japanese",
  Korean: "🇰🇷 Korean",
  Malaysian: "🇲🇾 Malaysian",
  Singaporean: "🇸🇬 Singaporean",
  Thai: "🇹🇭 Thai",
  Vietnamese: "🇻🇳 Vietnamese",
  Other: "🏳️ Other / Not listed"
};
const roomTypeCodes = {
  "Standard Queen": "STD",
  "Deluxe King": "DLX",
  "Deluxe Twin": "DLX",
  "Executive Suite": "STE"
};
const roomCodeLabels = {
  STD: "Standard Queen",
  DLX: "Deluxe",
  STE: "Executive Suite"
};
const additionalBedRates = {
  "Standard Queen": 700,
  "Deluxe": 1000,
  "Deluxe King": 1000,
  "Deluxe Twin": 1000,
  "Executive Suite": 1500
};

function twoDigit(value) {
  return value < 10 ? `0${value}` : String(value);
}

function formatDateKey(value) {
  return `${value.getFullYear()}-${twoDigit(value.getMonth() + 1)}-${twoDigit(value.getDate())}`;
}

function offsetDate(days) {
  const value = new Date(today);
  value.setDate(value.getDate() + days);
  return formatDateKey(value);
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

function nationalityLabel(value) {
  return nationalityOptions[value] || value || "Not recorded";
}

function roomTypeForStay(stay) {
  if (stay.roomType) return stay.roomType;
  const reservation = state.reservations.find((item) => item.id === stay.reservationId);
  if (reservation) return reservation.roomType;
  const room = state.rooms.find((item) => item.number === stay.room);
  return roomCodeLabels[room?.type] || "Standard Queen";
}

function additionalBedRateForStay(stay) {
  return additionalBedRates[roomTypeForStay(stay)] || additionalBedRates["Standard Queen"];
}

function cleanCardNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function detectCardBrand(number) {
  const card = cleanCardNumber(number);
  const firstTwo = Number(card.slice(0, 2));
  const firstFour = Number(card.slice(0, 4));
  if (/^4/.test(card)) return "Visa";
  if ((firstTwo >= 51 && firstTwo <= 55) || (firstFour >= 2221 && firstFour <= 2720)) return "Mastercard";
  if (/^3[47]/.test(card)) return "American Express";
  if (/^35/.test(card)) return "JCB";
  if (/^6(?:011|5)/.test(card)) return "Discover";
  return card ? "Unknown" : "No Card";
}

function passesLuhn(number) {
  const digits = cleanCardNumber(number).split("").reverse().map(Number);
  const sum = digits.reduce((total, digit, index) => {
    if (index % 2 === 0) return total + digit;
    const doubled = digit * 2;
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return digits.length >= 12 && sum % 10 === 0;
}

function validateExpiry(month, year) {
  const expiryMonth = Number(month);
  const expiryYear = Number(year);
  if (expiryMonth < 1 || expiryMonth > 12 || String(year).length !== 4) return false;
  const expiry = new Date(expiryYear, expiryMonth, 0, 23, 59, 59);
  return expiry >= new Date();
}

function validateMockCard({ cardholder, number, expiryMonth, expiryYear, cvv }) {
  const cleanNumber = cleanCardNumber(number);
  const brand = detectCardBrand(cleanNumber);
  if (!cardholder.trim()) return { valid: false, brand, message: "Cardholder name is required." };
  if (brand === "Unknown") return { valid: false, brand, message: "Unsupported or unrecognized card brand." };
  if (!passesLuhn(cleanNumber)) return { valid: false, brand, message: "Card number failed validation." };
  if (!validateExpiry(expiryMonth, expiryYear)) return { valid: false, brand, message: "Card expiry is invalid or expired." };
  const cvvLength = brand === "American Express" ? 4 : 3;
  if (!new RegExp(`^\\d{${cvvLength}}$`).test(String(cvv))) return { valid: false, brand, message: `${brand} CVV must be ${cvvLength} digits.` };
  return { valid: true, brand, message: `${brand} card validated.` };
}

function maskCard(number) {
  const cleanNumber = cleanCardNumber(number);
  return `**** **** **** ${cleanNumber.slice(-4)}`;
}

const state = {
  session: { user: "", role: "", shift: "", signedIn: false, sessionId: null, userId: null, permissions: [] },
  activeView: "dashboard",
  arrivalFilter: "all",
  activeRoom: null,
  activeReservationId: null,
  activePaymentStayId: null,
  pendingCheckInAuthorization: null,
  printableReservationId: null,
  printableStayId: null,
  apiConnected: false,
  handovers: [],
  paymentMethods: [],
  cardAuthorizations: [],
  reservations: [
    {
      id: 1, confirmation: "GH-28491", status: "due-in", guestProfileId: "GP-1001", guestFirstName: "Alicia", guestLastName: "Fernandez",
      nationality: "Filipino", idType: "Passport", idNumber: "P1234567",
      phone: "+63 917 555 0131", email: "alicia@example.com", arrivalDate: dateKey, departureDate: offsetDate(2),
      eta: "12:30 PM", roomType: "Executive Suite", room: "402", adults: 2, children: 0, ratePlan: "BAR",
      nightlyRate: 7200, paymentMethod: "Credit Card Guarantee", notes: "High floor preferred.", vip: true
    },
    {
      id: 2, confirmation: "GH-28506", status: "due-in", guestProfileId: "GP-1002", guestFirstName: "Robert", guestLastName: "Delgado",
      nationality: "American", idType: "Driver's License", idNumber: "N01-23-456789",
      phone: "+63 917 555 0132", email: "", arrivalDate: dateKey, departureDate: offsetDate(1),
      eta: "2:00 PM", roomType: "Deluxe King", room: "318", adults: 1, children: 0, ratePlan: "CORP",
      nightlyRate: 4800, paymentMethod: "Direct Bill", notes: "", vip: false
    },
    {
      id: 3, confirmation: "GH-28524", status: "due-in", guestProfileId: "GP-1003", guestFirstName: "Maria", guestLastName: "Velasco",
      nationality: "Filipino", idType: "National ID", idNumber: "1234-5678-9012",
      phone: "+63 917 555 0133", email: "maria@example.com", arrivalDate: dateKey, departureDate: offsetDate(3),
      eta: "3:15 PM", roomType: "Deluxe Twin", room: null, adults: 2, children: 1, ratePlan: "BAR",
      nightlyRate: 5250, paymentMethod: "Pay at Hostel", notes: "Late checkout requested.", vip: true
    },
    {
      id: 4, confirmation: "GH-28538", status: "due-in", guestProfileId: "GP-1004", guestFirstName: "James", guestLastName: "Wu",
      nationality: "Singaporean", idType: "Passport", idNumber: "E7654321",
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
      roomType: "Standard Queen",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 16500, reference: "POST-1001" }]
    },
    {
      id: 502, reservationId: null, guest: "Linda Park", room: "303", departureDate: dateKey, status: "in-house",
      roomType: "Deluxe",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 4250, reference: "POST-1002" }]
    },
    {
      id: 503, reservationId: null, guest: "Ramon Cruz", room: "401", departureDate: offsetDate(1), status: "in-house",
      roomType: "Deluxe",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 7800, reference: "POST-1003" }, { type: "Payment", description: "Card payment", amount: -7800, reference: "PAY-1001" }]
    },
    {
      id: 504, reservationId: null, guest: "Ana Romero", room: "202", departureDate: offsetDate(2), status: "in-house",
      roomType: "Standard Queen",
      folio: [{ type: "Room Charge", description: "Accommodation", amount: 3900, reference: "POST-1004" }, { type: "Payment", description: "Cash deposit", amount: -3900, reference: "PAY-1002" }]
    },
    {
      id: 505, reservationId: null, guest: "Jose Rivera", room: "301", departureDate: offsetDate(1), status: "in-house",
      roomType: "Standard Queen",
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
  postChargeModal: document.querySelector("#postChargeModal"),
  paymentModal: document.querySelector("#paymentModal"),
  dashboardWorkspace: document.querySelector("#dashboardWorkspace"),
  moduleWorkspace: document.querySelector("#moduleWorkspace"),
  newReservationButton: document.querySelector("#newReservationButton"),
  assignRoomButton: document.querySelector("#assignRoomButton"),
  handoverModal: document.querySelector("#handoverModal"),
  loginModal: document.querySelector("#loginModal"),
  menuButton: document.querySelector("#menuButton"),
  drawerCloseButton: document.querySelector("#drawerCloseButton"),
  sidebarOverlay: document.querySelector("#sidebarOverlay")
};

const workstationStateKey = "hmsystem.workstation";

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.session.sessionId) headers["X-Session-Id"] = String(state.session.sessionId);
  const response = await fetch(path, {
    headers,
    ...options
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(payload.message || "Request failed.");
  return payload;
}

function applyRemoteState(remoteState) {
  if (!remoteState) return;
  ["rooms", "reservations", "stays", "paymentMethods", "cardAuthorizations"].forEach((key) => {
    if (Array.isArray(remoteState[key])) state[key] = remoteState[key];
  });
  if (Array.isArray(remoteState.activity) && remoteState.activity.length) state.activity = remoteState.activity;
  state.apiConnected = true;
}

function applySession(session) {
  if (!session) {
    state.session = { user: "", role: "", shift: "", signedIn: false, sessionId: null, userId: null, permissions: [] };
    return;
  }
  state.session = {
    user: session.user,
    role: session.role,
    shift: session.shift,
    signedIn: session.signedIn !== false,
    sessionId: session.sessionId || null,
    userId: session.userId || null,
    username: session.username || "",
    permissions: Array.isArray(session.permissions) ? session.permissions : (rolePermissions[session.role] || [])
  };
}

async function refreshRemoteState() {
  const payload = await apiRequest("/api/state");
  applyRemoteState(payload.state);
  renderSession();
}

async function persistMutation(path, options, fallback) {
  if (!state.apiConnected) {
    fallback?.();
    return false;
  }
  let payload;
  try {
    payload = await apiRequest(path, options);
  } catch (error) {
    if (/session/i.test(error.message)) {
      applySession(null);
      renderSession();
      openModal(elements.loginModal);
    }
    throw error;
  }
  applyRemoteState(payload.state);
  if (payload.session) applySession(payload.session);
  renderSession();
  return true;
}

function loadWorkstationState() {
  try {
    const saved = JSON.parse(localStorage.getItem(workstationStateKey) || "{}");
    if (saved.session && saved.session.user && saved.session.role && saved.session.shift) {
      state.session = {
        user: saved.session.user,
        role: saved.session.role,
        shift: saved.session.shift,
        signedIn: saved.session.signedIn !== false,
        sessionId: saved.session.sessionId || null,
        userId: saved.session.userId || null,
        username: saved.session.username || "",
        permissions: Array.isArray(saved.session.permissions) ? saved.session.permissions : (rolePermissions[saved.session.role] || [])
      };
    }
    if (saved.activeView && viewLabels[saved.activeView]) {
      state.activeView = saved.activeView;
    }
  } catch {
    localStorage.removeItem(workstationStateKey);
  }
}

function saveWorkstationState() {
  try {
    localStorage.setItem(workstationStateKey, JSON.stringify({
      session: state.session,
      activeView: state.activeView
    }));
  } catch {
    // Storage may be blocked in some private/restricted browser modes.
  }
}

function clearWorkstationState() {
  localStorage.removeItem(workstationStateKey);
}

function syncTopbarOffset() {
  const topbar = document.querySelector(".topbar");
  document.documentElement.style.setProperty("--topbar-height", `${topbar.offsetHeight}px`);
}

document.querySelector("#businessDate").textContent = today.toLocaleDateString("en-PH", {
  weekday: "short", month: "short", day: "numeric", year: "numeric"
});

function openModal(modal) {
  if (modal.showModal) {
    modal.showModal();
    return;
  }
  modal.setAttribute("open", "");
  modal.classList.add("modal-fallback-open");
  document.body.classList.add("modal-fallback-active");
}

function closeModal(modal) {
  if (modal.close) {
    modal.close();
  } else {
    modal.removeAttribute("open");
  }
  modal.classList.remove("modal-fallback-open");
  if (!document.querySelector(".modal.modal-fallback-open")) {
    document.body.classList.remove("modal-fallback-active");
  }
}

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

function hasPermission(permission) {
  return (state.session.permissions || []).includes(permission);
}

function hasFrontDeskAccess() {
  return hasPermission("reservation.create");
}

function canUpdateHousekeeping() {
  return hasPermission("room.housekeeping.update");
}

function canUpdateMaintenance() {
  return hasPermission("room.maintenance.update");
}

function canCashier() {
  return permitted("cashiering");
}

function canPostPayments() {
  return hasPermission("payment.post");
}

function canPostServices() {
  return hasPermission("service_charge.post");
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
    <article class="panel workspace-panel"><div class="panel-heading"><div><p class="eyebrow">In House Accounts</p><h3>Open Folios</h3></div><button class="secondary-button" data-open-service-charge="true">Post Service Charge</button></div>
      <div class="workspace-table"><table><thead><tr><th>Guest</th><th>Room</th><th>Balance</th><th>Card Auth</th><th>Ledger</th><th></th></tr></thead><tbody>
        ${stays.map((stay) => `<tr><td>${stay.guest}</td><td>${stay.room}</td><td>${formatPeso(balanceFor(stay))}</td><td>${authorizationsForStay(stay.id).length ? `${authorizationsForStay(stay.id)[0].brand} ${formatPeso(authorizationsForStay(stay.id)[0].amount)}` : "None"}</td><td>${stay.folio.length} posting(s)</td>
        <td><button class="row-action" data-view-folio="${stay.id}">View Ledger</button> <button class="row-action" data-service-stay="${stay.id}">Post Charge</button> ${balanceFor(stay) !== 0 ? `<button class="row-action" data-settle-folio="${stay.id}">Post Payment</button>` : '<span class="tag ready">Settled</span>'}</td></tr>`).join("")}
      </tbody></table></div>
    </article>`;
}

function renderServicesWorkspace() {
  const servicePostings = [];
  inHouseStays().forEach((stay) => {
    stay.folio.filter((item) => item.source === "services").forEach((item) => {
      servicePostings.push(Object.assign({}, item, { guest: stay.guest, room: stay.room }));
    });
  });
  elements.moduleWorkspace.innerHTML = `
    <article class="panel module-banner">
      <div><p class="eyebrow">Guest Services</p><h3>Add-On Service Posting</h3></div>
      <p>Post room-service, restaurant, laundry, minibar, spa, and other service charges directly to guest folios.</p>
    </article>
    ${moduleStats([
      { label: "In-House Guests", value: inHouseStays().length },
      { label: "Service Postings", value: servicePostings.length },
      { label: "Service Total", value: formatPeso(servicePostings.reduce((sum, item) => sum + item.amount, 0)) }
    ])}
    <article class="panel workspace-panel">
      <div class="panel-heading"><div><p class="eyebrow">Posting</p><h3>Charge Guest Services</h3></div><button class="primary-button" data-open-service-charge="true">Post Charge</button></div>
      <div class="workspace-table"><table><thead><tr><th>Guest</th><th>Room</th><th>Category</th><th>Description</th><th>Reference</th><th>Amount</th></tr></thead><tbody>
        ${servicePostings.map((item) => `<tr><td>${item.guest}</td><td>${item.room}</td><td>${item.category}</td><td>${item.description}</td><td>${item.reference}</td><td>${formatPeso(item.amount)}</td></tr>`).join("") || '<tr><td colspan="6">No service charges posted in this session.</td></tr>'}
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
        ${["Arrival Forecast", "Room State Summary", "Cashier Ledger", "Services Summary", "Departure List"].map((report) => `<div class="report-tile"><strong>${report}</strong><p>Generated for the current business date.</p><button class="text-button" data-report="${report}">Generate Report</button></div>`).join("")}
      </div>
    </article>
    <article class="panel workspace-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Demo Sandbox</p><h3>Reset Practicum Dataset</h3></div>
        <button class="secondary-button" data-reset-demo="true">Reset Demo Data</button>
      </div>
      <p class="muted">Restores the initial rooms, arrivals, in-house guests, departures, folios, and service categories used for student testing.</p>
    </article>`;
}

function renderModuleWorkspace() {
  if (state.activeView === "dashboard") return;
  const renderers = {
    reservations: renderReservationsWorkspace,
    rooms: renderRoomsWorkspace,
    departures: renderDeparturesWorkspace,
    services: renderServicesWorkspace,
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

function setSidebarOpen(open) {
  document.body.classList.toggle("sidebar-open", open);
  elements.menuButton.setAttribute("aria-expanded", String(open));
}

function renderSession() {
  document.querySelector("#activeOperator").textContent = state.session.signedIn ? state.session.user : "Signed Out";
  document.querySelector("#activeRole").textContent = state.session.signedIn ? state.session.role : "No active role";
  document.querySelector("#activeShift").textContent = state.session.signedIn ? state.session.shift : "No Active Shift";
  const allowedViews = roleAccess[state.session.role] || [];
  document.querySelectorAll("#navigation .nav-item").forEach((button) => button.classList.toggle("hidden", !allowedViews.includes(button.dataset.view)));
  if (!allowedViews.includes(state.activeView)) state.activeView = allowedViews[0] || "dashboard";
  document.querySelectorAll("#navigation .nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === state.activeView));
  document.querySelector("#viewTitle").textContent = viewLabels[state.activeView];
  const dashboard = state.activeView === "dashboard";
  elements.dashboardWorkspace.classList.toggle("hidden", !dashboard);
  elements.moduleWorkspace.classList.toggle("hidden", dashboard);
  elements.newReservationButton.classList.toggle("hidden", !hasFrontDeskAccess());
  elements.assignRoomButton.classList.toggle("hidden", !hasFrontDeskAccess());
  renderAll();
  syncTopbarOffset();
  saveWorkstationState();
}

function assignAvailableRoom(reservation) {
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

async function assignRoomPersisted(reservation) {
  try {
    const assigned = await persistMutation(`/api/reservations/${reservation.id}/assign-room`, { method: "POST" }, () => {
      if (assignAvailableRoom(reservation)) {
        renderAll();
        notify(`${guestName(reservation)} assigned to room ${reservation.room}.`);
      }
    });
    if (assigned) {
      const updated = state.reservations.find((item) => item.id === reservation.id);
      notify(`${guestName(updated || reservation)} assigned to room ${(updated || reservation).room}.`);
    }
  } catch (error) {
    notify(error.message);
  }
}

function openReservationDetail(id) {
  const reservation = state.reservations.find((item) => item.id === Number(id));
  if (!reservation) return notify("Reservation record was not found. Refresh and try again.");
  state.printableReservationId = reservation.id;
  document.querySelector("#reservationDetailTitle").textContent = `${guestName(reservation)} | ${reservation.confirmation}`;
  document.querySelector("#reservationDetailContent").innerHTML = `
    <div class="detail-cell"><span>Status</span>${reservation.status.toUpperCase()}</div>
    <div class="detail-cell"><span>Guest Profile</span>${reservation.guestProfileId}</div>
    <div class="detail-cell"><span>First Name</span>${reservation.guestFirstName}</div>
    <div class="detail-cell"><span>Last Name</span>${reservation.guestLastName}</div>
    <div class="detail-cell"><span>Nationality</span>${nationalityLabel(reservation.nationality)}</div>
    <div class="detail-cell"><span>Stay Dates</span>${formatDate(reservation.arrivalDate)} - ${formatDate(reservation.departureDate)} (${nightsBetween(reservation.arrivalDate, reservation.departureDate)} night(s))</div>
    <div class="detail-cell"><span>Occupancy</span>${reservation.adults} adult(s), ${reservation.children} child(ren)</div>
    <div class="detail-cell"><span>Room</span>${reservation.roomType} / ${reservation.room || "Unassigned"}</div>
    <div class="detail-cell"><span>Rate</span>${reservation.ratePlan} | ${formatPeso(reservation.nightlyRate)} nightly</div>
    <div class="detail-cell"><span>Guarantee</span>${reservation.paymentMethod}</div>
    <div class="detail-cell"><span>ID Type</span>${reservation.idType}</div>
    <div class="detail-cell"><span>ID Number</span>${reservation.idNumber}</div>
    <div class="detail-cell"><span>Contact</span>${reservation.phone || "No phone"}<br>${reservation.email || "No email"}</div>
    <div class="detail-cell full"><span>Notes / Preferences</span>${reservation.notes || "None recorded"}</div>`;
  openModal(elements.reservationDetailModal);
}

async function beginArrivalAction(id) {
  if (!hasFrontDeskAccess()) return notify("Your role cannot process arrivals.");
  const reservation = state.reservations.find((item) => item.id === Number(id));
  if (!reservation) return notify("Reservation record was not found. Refresh and try again.");
  if (!reservation.room) {
    await assignRoomPersisted(reservation);
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
    Nationality: ${nationalityLabel(reservation.nationality)}<br>
    ID: ${reservation.idType} / ${reservation.idNumber}<br>
    Notes: ${reservation.notes || "None recorded"}
  `;
  document.querySelector("#checkInPaymentMethod").value = reservation.paymentMethod;
  document.querySelector("#checkInAuthAmount").value = (reservation.nightlyRate * nightsBetween(reservation.arrivalDate, reservation.departureDate) + 3000).toFixed(2);
  document.querySelector("#checkInCardholder").value = guestName(reservation);
  document.querySelector("#checkInCardNumber").value = "";
  document.querySelector("#checkInExpiryMonth").value = "";
  document.querySelector("#checkInExpiryYear").value = "";
  document.querySelector("#checkInCvv").value = "";
  state.pendingCheckInAuthorization = null;
  updateCheckInCardFeedback("Card authorization is optional for this prototype.", "No Card");
  document.querySelector("#checkInIdentity").checked = false;
  document.querySelector("#checkInRoomReady").checked = false;
  openModal(elements.checkInModal);
}

async function completeCheckIn() {
  if (!hasFrontDeskAccess()) return notify("Your role cannot complete check-in.");
  const reservation = state.reservations.find((item) => item.id === state.activeReservationId);
  const room = state.rooms.find((item) => item.number === reservation.room);
  const paymentMethod = document.querySelector("#checkInPaymentMethod").value;
  const keysIssued = document.querySelector("#checkInKeys").value;
  if (state.apiConnected) {
    try {
      await persistMutation(`/api/reservations/${reservation.id}/check-in`, {
        method: "POST",
        body: JSON.stringify({
          paymentMethod,
          keysIssued,
          authorization: state.pendingCheckInAuthorization
        })
      });
      state.pendingCheckInAuthorization = null;
      closeModal(elements.checkInModal);
      notify(`Check-in completed for ${guestName(reservation)}.`);
      return;
    } catch (error) {
      notify(error.message);
      return;
    }
  }
  reservation.status = "checked-in";
  reservation.paymentMethod = paymentMethod;
  room.occupancy = "occupied";
  room.guest = guestName(reservation);
  const lodgingTotal = reservation.nightlyRate * nightsBetween(reservation.arrivalDate, reservation.departureDate);
  const stay = {
    id: Date.now(),
    reservationId: reservation.id,
    guest: guestName(reservation),
    room: reservation.room,
    roomType: reservation.roomType,
    departureDate: reservation.departureDate,
    status: "in-house",
    folio: [{ type: "Room Charge", description: `${nightsBetween(reservation.arrivalDate, reservation.departureDate)} night accommodation`, amount: lodgingTotal, reference: `POST-${reservation.confirmation}` }]
  };
  state.stays.unshift(stay);
  if (state.pendingCheckInAuthorization) {
    const authorization = state.pendingCheckInAuthorization;
    authorization.reservationId = reservation.id;
    authorization.stayId = stay.id;
    const paymentMethod = state.paymentMethods.find((method) => method.id === authorization.paymentMethodId);
    if (paymentMethod) {
      paymentMethod.reservationId = reservation.id;
      paymentMethod.stayId = stay.id;
    }
  }
  state.pendingCheckInAuthorization = null;
  addActivity(`${guestName(reservation)} checked in`, `Room ${reservation.room} | ${keysIssued} key(s) issued`);
  closeModal(elements.checkInModal);
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
  openModal(elements.roomModal);
}

function openFolio(stayId) {
  const stay = state.stays.find((item) => item.id === Number(stayId));
  if (!stay) return notify("Folio record was not found. Refresh and try again.");
  state.printableStayId = stay.id;
  document.querySelector("#folioModalTitle").textContent = `${stay.guest} | Room ${stay.room}`;
  const auths = authorizationsForStay(stay.id);
  document.querySelector("#folioLedger").innerHTML = `
    ${auths.length ? `<div class="handover-summary">${auths.map((authorization) => `<strong>${authorization.id}</strong> ${authorization.brand} ${authorization.maskedNumber} authorized for ${formatPeso(authorization.amount)}`).join("<br>")}</div>` : ""}
    <table><thead><tr><th>Type</th><th>Description</th><th>Reference</th><th>Amount</th></tr></thead>
    <tbody>${stay.folio.map((item) => `<tr><td>${item.type}</td><td>${item.description}</td><td>${item.reference}</td><td>${formatPeso(item.amount)}</td></tr>`).join("")}</tbody></table>
    <div class="ledger-total"><span>Balance Due</span><span>${formatPeso(balanceFor(stay))}</span></div>`;
  openModal(elements.folioModal);
}

function authorizationsForStay(stayId) {
  return state.cardAuthorizations.filter((authorization) => authorization.stayId === Number(stayId) && authorization.status === "Authorized");
}

function createMockPaymentMethod({ cardholder, number, expiryMonth, expiryYear }, links = {}) {
  const brand = detectCardBrand(number);
  const paymentMethod = {
    id: `PM-${Date.now().toString().slice(-6)}-${state.paymentMethods.length + 1}`,
    type: "card",
    brand,
    maskedNumber: maskCard(number),
    cardholder: cardholder.trim(),
    expiryMonth: twoDigit(Number(expiryMonth)),
    expiryYear: String(expiryYear),
    token: `tok_mock_${Date.now().toString(36)}`,
    ...links
  };
  state.paymentMethods.push(paymentMethod);
  return paymentMethod;
}

function createMockAuthorization(paymentMethod, amount, links = {}) {
  const authorization = {
    id: `AUTH-${Date.now().toString().slice(-6)}`,
    paymentMethodId: paymentMethod.id,
    brand: paymentMethod.brand,
    maskedNumber: paymentMethod.maskedNumber,
    cardholder: paymentMethod.cardholder,
    amount,
    status: "Authorized",
    authorizedAt: new Date().toISOString(),
    capturedAt: null,
    operator: state.session.user,
    shift: state.session.shift,
    ...links
  };
  state.cardAuthorizations.push(authorization);
  return authorization;
}

function populateServiceStaySelect(selectedStayId = "") {
  const select = document.querySelector("#serviceStaySelect");
  select.innerHTML = inHouseStays().map((stay) => `
    <option value="${stay.id}" ${String(stay.id) === String(selectedStayId) ? "selected" : ""}>${stay.guest} - Room ${stay.room}</option>
  `).join("");
}

function selectedServiceStay() {
  return state.stays.find((item) => item.id === Number(document.querySelector("#serviceStaySelect").value));
}

function updateAdditionalBedDefaults() {
  const category = document.querySelector("#serviceCategorySelect").value;
  if (category !== "Additional Bed") return;
  const stay = selectedServiceStay();
  if (!stay) return;
  const roomType = roomTypeForStay(stay);
  document.querySelector('[name="description"]').value = `Additional bed - ${roomType} per night`;
  document.querySelector("#serviceUnitPrice").value = additionalBedRateForStay(stay).toFixed(2);
  document.querySelector('[name="quantity"]').value = "1";
}

function openPostCharge(stayId = "") {
  if (!canPostServices()) {
    notify("Service charge posting is not assigned to this role.");
    return;
  }
  document.querySelector("#postChargeForm").reset();
  populateServiceStaySelect(stayId);
  updateAdditionalBedDefaults();
  openModal(elements.postChargeModal);
}

function openPayment(stayId) {
  if (!canPostPayments()) {
    notify("Cashiering access is required to post payments.");
    return;
  }
  const stay = state.stays.find((item) => item.id === Number(stayId));
  if (!stay) return notify("Stay record was not found. Refresh and try again.");
  state.activePaymentStayId = stay.id;
  const balance = balanceFor(stay);
  document.querySelector("#paymentOverview").innerHTML = `
    <strong>${stay.guest}</strong> | Room ${stay.room}<br>
    Current folio balance: <strong>${formatPeso(balance)}</strong><br>
    Existing authorized cards may be captured, or a new mock card can be entered.`;
  document.querySelector("#paymentAmount").value = Math.max(balance, 0).toFixed(2);
  document.querySelector("#paymentMethodSelect").value = "card";
  document.querySelector("#paymentForm").reset();
  document.querySelector("#paymentAmount").value = Math.max(balance, 0).toFixed(2);
  document.querySelector("#paymentMethodSelect").value = "card";
  document.querySelector("#cardPaymentSection").classList.remove("hidden");
  const authorizations = populateAuthorizationSelect(stay.id);
  if (authorizations.length) {
    const authorization = authorizations[0];
    updatePaymentCardFeedback(`${authorization.id} available for capture: ${authorization.brand} ${authorization.maskedNumber} / ${formatPeso(authorization.amount)}.`, authorization.brand, "success");
  } else {
    updatePaymentCardFeedback("Use an existing authorization or enter a mock card.", "No Card");
  }
  openModal(elements.paymentModal);
}

function populateAuthorizationSelect(stayId) {
  const select = document.querySelector("#authorizationSelect");
  const authorizations = authorizationsForStay(stayId);
  select.innerHTML = authorizations.length
    ? authorizations.map((authorization, index) => `
      <option value="${authorization.id}" ${index === 0 ? "selected" : ""}>${authorization.brand} ${authorization.maskedNumber} | ${formatPeso(authorization.amount)} | ${authorization.id}</option>
    `).join("") + '<option value="">Enter new card / no authorization</option>'
    : '<option value="">Enter new card / no authorization</option>';
  return authorizations;
}

function updateCheckInCardFeedback(message, brand, status = "") {
  document.querySelector("#checkInCardBrand").textContent = brand;
  const feedback = document.querySelector("#checkInCardFeedback");
  feedback.textContent = message;
  feedback.className = `payment-feedback ${status}`;
}

function updatePaymentCardFeedback(message, brand, status = "") {
  document.querySelector("#paymentCardBrand").textContent = brand;
  const feedback = document.querySelector("#paymentCardFeedback");
  feedback.textContent = message;
  feedback.className = `payment-feedback ${status}`;
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
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
    ["Nationality", nationalityLabel(reservation.nationality)],
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
  if (report === "Services Summary") {
    const postings = [];
    inHouseStays().forEach((stay) => {
      stay.folio.filter((item) => item.source === "services").forEach((item) => {
        postings.push(Object.assign({}, item, { guest: stay.guest, room: stay.room }));
      });
    });
    body = printTable(
      ["Guest", "Room", "Category", "Description", "Reference", "Amount"],
      postings.map((item) => [item.guest, item.room, item.category, item.description, item.reference, formatPeso(item.amount)])
    ) + `<div class="total"><span>Service Total</span><span>${escapeHtml(formatPeso(postings.reduce((sum, item) => sum + item.amount, 0)))}</span></div>`;
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
  button.addEventListener("click", () => closeModal(document.querySelector(`#${button.dataset.close}`)));
});

document.querySelector("#printReservationButton").addEventListener("click", printReservation);
document.querySelector("#printFolioButton").addEventListener("click", printFolio);

elements.newReservationButton.addEventListener("click", () => {
  if (!hasFrontDeskAccess()) return notify("Reservation access is not assigned to this role.");
  document.querySelector('[name="arrivalDate"]').value = dateKey;
  document.querySelector('[name="departureDate"]').value = offsetDate(1);
  openModal(elements.reservationModal);
});

document.querySelector("#reservationForm").addEventListener("submit", async (event) => {
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
    nationality: values.get("nationality"),
    idType: values.get("idType"),
    idNumber: values.get("idNumber").trim(),
    arrivalDate: values.get("arrivalDate"),
    departureDate: values.get("departureDate"),
    eta: new Date(`2000-01-01T${values.get("eta")}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    roomType: values.get("roomType"), room: null, adults: Number(values.get("adults")), children: Number(values.get("children")),
    ratePlan: values.get("ratePlan"), nightlyRate: Number(values.get("nightlyRate")), paymentMethod: values.get("paymentMethod"),
    phone: values.get("phone"), email: values.get("email"), notes: values.get("notes"), vip: values.get("vip") === "true"
  };
  if (state.apiConnected) {
    try {
      await persistMutation("/api/reservations", {
        method: "POST",
        body: JSON.stringify(reservation)
      });
      event.target.reset();
      closeModal(elements.reservationModal);
      notify("Reservation saved to the shared database.");
      return;
    } catch (error) {
      notify(error.message);
      return;
    }
  }
  state.reservations.push(reservation);
  addActivity("Reservation created", `${guestName(reservation)} - ${reservation.confirmation}`);
  event.target.reset();
  closeModal(elements.reservationModal);
  renderAll();
  notify(`Reservation ${reservation.confirmation} saved.`);
});

document.querySelector("#postChargeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canPostServices()) return notify("Service charge posting is not assigned to this role.");
  if (!event.target.reportValidity()) return;
  const values = new FormData(event.target);
  const stay = state.stays.find((item) => item.id === Number(values.get("stayId")));
  if (!stay || stay.status !== "in-house") return notify("Select an active in-house guest.");
  const quantity = Number(values.get("quantity"));
  const unitPrice = Number(values.get("unitPrice"));
  const taxAmount = Number(values.get("taxAmount") || 0);
  const amount = (quantity * unitPrice) + taxAmount;
  if (amount <= 0) return notify("Charge amount must be greater than zero.");
  const category = values.get("category");
  const reference = values.get("reference").trim() || `SVC-${Date.now().toString().slice(-5)}`;
  const description = `${category}: ${values.get("description").trim()} x${quantity}`;
  if (state.apiConnected) {
    try {
      await persistMutation(`/api/stays/${stay.id}/service-charge`, {
        method: "POST",
        body: JSON.stringify({
          category,
          description,
          amount,
          reference,
          notes: values.get("notes").trim()
        })
      });
      closeModal(elements.postChargeModal);
      event.target.reset();
      notify(`${formatPeso(amount)} posted to ${stay.guest}'s folio.`);
      return;
    } catch (error) {
      notify(error.message);
      return;
    }
  }
  stay.folio.push({
    type: "Service Charge",
    source: "services",
    category,
    description,
    amount,
    reference,
    notes: values.get("notes").trim(),
    operator: state.session.user,
    shift: state.session.shift
  });
  addActivity("Service charge posted", `${stay.guest} / Room ${stay.room} - ${category} - ${formatPeso(amount)}`);
  closeModal(elements.postChargeModal);
  event.target.reset();
  renderAll();
  notify(`${formatPeso(amount)} posted to ${stay.guest}'s folio.`);
});

document.querySelector("#serviceCategorySelect").addEventListener("change", updateAdditionalBedDefaults);
document.querySelector("#serviceStaySelect").addEventListener("change", updateAdditionalBedDefaults);

document.querySelector("#paymentMethodSelect").addEventListener("change", (event) => {
  document.querySelector("#cardPaymentSection").classList.toggle("hidden", event.target.value !== "card");
});

document.querySelector("#authorizationSelect").addEventListener("change", (event) => {
  if (!event.target.value) {
    updatePaymentCardFeedback("Enter a new mock card for this payment.", "No Card");
    return;
  }
  const authorization = state.cardAuthorizations.find((item) => item.id === event.target.value);
  updatePaymentCardFeedback(`${authorization.id} selected for capture: ${authorization.brand} ${authorization.maskedNumber} / ${formatPeso(authorization.amount)}.`, authorization.brand, "success");
});

document.querySelector("#paymentCardNumber").addEventListener("input", (event) => {
  document.querySelector("#paymentCardBrand").textContent = detectCardBrand(event.target.value);
});

document.querySelector("#checkInCardNumber").addEventListener("input", (event) => {
  document.querySelector("#checkInCardBrand").textContent = detectCardBrand(event.target.value);
});

document.querySelector("#paymentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canPostPayments()) return notify("Cashiering access is required.");
  if (!event.target.reportValidity()) return;
  const stay = state.stays.find((item) => item.id === state.activePaymentStayId);
  const amount = Number(document.querySelector("#paymentAmount").value);
  if (!stay || stay.status !== "in-house") return notify("Select an active in-house stay.");
  if (amount <= 0) return notify("Payment amount must be greater than zero.");
  let source = "cash";
  let description = "Cash payment";
  let reference = `PAY-${Date.now().toString().slice(-5)}`;
  if (document.querySelector("#paymentMethodSelect").value === "card") {
    source = "card";
    const selectedAuthId = document.querySelector("#authorizationSelect").value;
    if (selectedAuthId) {
      const authorization = state.cardAuthorizations.find((item) => item.id === selectedAuthId);
      if (amount > authorization.amount) {
        updatePaymentCardFeedback("Capture amount exceeds authorized amount.", authorization.brand, "error");
        return;
      }
      authorization.status = "Captured";
      authorization.capturedAt = new Date().toISOString();
      description = `${authorization.brand} card capture ${authorization.maskedNumber}`;
      reference = `CAP-${authorization.id.replace("AUTH-", "")}`;
      if (state.apiConnected) {
        try {
          await persistMutation(`/api/stays/${stay.id}/payments`, {
            method: "POST",
            body: JSON.stringify({ amount, source, description, reference, authorizationId: authorization.id })
          });
          closeModal(elements.paymentModal);
          event.target.reset();
          notify(`${formatPeso(amount)} payment posted to ${stay.guest}'s folio.`);
          return;
        } catch (error) {
          notify(error.message);
          return;
        }
      }
      addActivity("Card authorization captured", `${stay.guest} - ${formatPeso(amount)} - ${authorization.id}`);
    } else {
      const cardData = {
        cardholder: document.querySelector("#paymentCardholder").value,
        number: document.querySelector("#paymentCardNumber").value,
        expiryMonth: document.querySelector("#paymentExpiryMonth").value,
        expiryYear: document.querySelector("#paymentExpiryYear").value,
        cvv: document.querySelector("#paymentCvv").value
      };
      const validation = validateMockCard(cardData);
      if (!validation.valid) {
        updatePaymentCardFeedback(validation.message, validation.brand, "error");
        addActivity("Card payment declined", `${stay.guest} - ${validation.message}`);
        return;
      }
      const paymentMethod = createMockPaymentMethod(cardData, { stayId: stay.id });
      const authorization = createMockAuthorization(paymentMethod, amount, { stayId: stay.id });
      authorization.status = "Captured";
      authorization.capturedAt = new Date().toISOString();
      description = `${paymentMethod.brand} card sale ${paymentMethod.maskedNumber}`;
      reference = `SALE-${authorization.id.replace("AUTH-", "")}`;
      if (state.apiConnected) {
        try {
          await persistMutation(`/api/stays/${stay.id}/payments`, {
            method: "POST",
            body: JSON.stringify({ amount, source, description, reference, authorization })
          });
          closeModal(elements.paymentModal);
          event.target.reset();
          notify(`${formatPeso(amount)} payment posted to ${stay.guest}'s folio.`);
          return;
        } catch (error) {
          notify(error.message);
          return;
        }
      }
      addActivity("Card payment approved", `${stay.guest} - ${formatPeso(amount)} - ${authorization.id}`);
    }
  }
  if (state.apiConnected) {
    try {
      await persistMutation(`/api/stays/${stay.id}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount, source, description, reference })
      });
      closeModal(elements.paymentModal);
      event.target.reset();
      notify(`${formatPeso(amount)} payment posted to ${stay.guest}'s folio.`);
      return;
    } catch (error) {
      notify(error.message);
      return;
    }
  }
  stay.folio.push({ type: "Payment", source, description, amount: -amount, reference });
  closeModal(elements.paymentModal);
  event.target.reset();
  renderAll();
  notify(`${formatPeso(amount)} payment posted to ${stay.guest}'s folio.`);
});

document.querySelector("#checkInForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.reportValidity()) await completeCheckIn();
});

document.querySelector("#authorizeCardButton").addEventListener("click", () => {
  const reservation = state.reservations.find((item) => item.id === state.activeReservationId);
  const cardData = {
    cardholder: document.querySelector("#checkInCardholder").value,
    number: document.querySelector("#checkInCardNumber").value,
    expiryMonth: document.querySelector("#checkInExpiryMonth").value,
    expiryYear: document.querySelector("#checkInExpiryYear").value,
    cvv: document.querySelector("#checkInCvv").value
  };
  const validation = validateMockCard(cardData);
  if (!validation.valid) {
    state.pendingCheckInAuthorization = null;
    updateCheckInCardFeedback(validation.message, validation.brand, "error");
    addActivity("Card authorization declined", `${reservation ? guestName(reservation) : "Guest"} - ${validation.message}`);
    return;
  }
  const amount = Number(document.querySelector("#checkInAuthAmount").value);
  if (amount <= 0) {
    updateCheckInCardFeedback("Authorization amount must be greater than zero.", validation.brand, "error");
    return;
  }
  const paymentMethod = createMockPaymentMethod(cardData, { reservationId: reservation.id });
  const authorization = createMockAuthorization(paymentMethod, amount, { reservationId: reservation.id, stayId: null });
  state.pendingCheckInAuthorization = authorization;
  updateCheckInCardFeedback(`${authorization.id} authorized for ${formatPeso(amount)} on ${paymentMethod.brand} ${paymentMethod.maskedNumber}.`, paymentMethod.brand, "success");
  addActivity("Card authorized", `${guestName(reservation)} - ${formatPeso(amount)} - ${authorization.id}`);
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

document.querySelector("#roomForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canUpdateHousekeeping() && !canUpdateMaintenance()) return notify("You have view-only access to room operations.");
  const room = state.activeRoom;
  const housekeeping = canUpdateHousekeeping() ? document.querySelector("#roomHousekeepingSelect").value : room.housekeeping;
  const maintenance = canUpdateMaintenance() ? document.querySelector("#roomMaintenanceSelect").value : room.maintenance;
  if (state.apiConnected) {
    try {
      await persistMutation(`/api/rooms/${encodeURIComponent(room.number)}`, {
        method: "PATCH",
        body: JSON.stringify({ housekeeping, maintenance })
      });
      closeModal(elements.roomModal);
      notify(`Operations status updated for room ${room.number}.`);
      return;
    } catch (error) {
      notify(error.message);
      return;
    }
  }
  room.housekeeping = housekeeping;
  room.maintenance = maintenance;
  addActivity(`Room ${room.number} status updated`, `${housekeepingLabels[room.housekeeping]} / ${maintenanceLabels[room.maintenance]}`);
  closeModal(elements.roomModal);
  renderAll();
  notify(`Operations status updated for room ${room.number}.`);
});

elements.assignRoomButton.addEventListener("click", async () => {
  if (!hasFrontDeskAccess()) return notify("Room assignment is restricted for this role.");
  const pending = dueInReservations().find((reservation) => !reservation.room);
  if (!pending) return notify("All due-in reservations already have assigned rooms.");
  await assignRoomPersisted(pending);
});

document.querySelector("#showAllRooms").addEventListener("click", () => notify(`${state.rooms.length} rooms displayed in the current rack.`));

elements.inHouseGuests.addEventListener("click", (event) => {
  if (event.target.dataset.folio) openFolio(event.target.dataset.folio);
});

elements.moduleWorkspace.addEventListener("click", (event) => {
  if (event.target.dataset.openServiceCharge) openPostCharge();
  if (event.target.dataset.serviceStay) openPostCharge(event.target.dataset.serviceStay);
  if (event.target.dataset.reservationDetail) openReservationDetail(event.target.dataset.reservationDetail);
  if (event.target.dataset.moduleArrival) beginArrivalAction(event.target.dataset.moduleArrival);
  if (event.target.dataset.openRoom) openRoom(event.target.dataset.openRoom);
  if (event.target.dataset.cleanRoom) {
    if (!canUpdateHousekeeping()) return notify("Housekeeping update permission is required.");
    const room = state.rooms.find((item) => item.number === event.target.dataset.cleanRoom);
    if (state.apiConnected) {
      persistMutation(`/api/rooms/${encodeURIComponent(room.number)}`, {
        method: "PATCH",
        body: JSON.stringify({ housekeeping: "inspected", maintenance: room.maintenance })
      }).then(() => notify(`Room ${room.number} is now inspected.`)).catch((error) => notify(error.message));
      return;
    }
    room.housekeeping = "inspected";
    addActivity(`Room ${room.number} inspected`, "Housekeeping marked the room inspected.");
    renderAll();
    notify(`Room ${room.number} is now inspected.`);
  }
  if (event.target.dataset.viewFolio) openFolio(event.target.dataset.viewFolio);
  if (event.target.dataset.settleFolio) {
    openPayment(event.target.dataset.settleFolio);
  }
  if (event.target.dataset.checkOut) {
    if (!permitted("departures")) return notify("Departure access is required.");
    const stay = state.stays.find((item) => item.id === Number(event.target.dataset.checkOut));
    if (balanceFor(stay) !== 0) return notify("Settle the folio balance before check-out.");
    if (state.apiConnected) {
      persistMutation(`/api/stays/${stay.id}/check-out`, { method: "POST" })
        .then(() => notify(`Check-out completed. Room ${stay.room} is vacant dirty.`))
        .catch((error) => notify(error.message));
      return;
    }
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
    if (!hasPermission("report.view")) return notify("Reporting access is required.");
    printReport(event.target.dataset.report);
    notify(`${event.target.dataset.report} opened for printing.`);
  }
  if (event.target.dataset.resetDemo) {
    if (!hasPermission("demo.reset")) return notify("Demo reset permission is required.");
    if (!state.apiConnected) return notify("Demo reset requires the shared database connection.");
    if (!window.confirm("Reset all practicum demo data to the initial arrivals, rooms, in-house guests, and folios?")) return;
    event.target.disabled = true;
    persistMutation("/api/demo/reset", { method: "POST" })
      .then(() => notify("Demo data reset to the practicum baseline."))
      .catch((error) => notify(error.message))
      .finally(() => {
        event.target.disabled = false;
      });
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
  setSidebarOpen(false);
});

elements.menuButton.addEventListener("click", () => setSidebarOpen(!document.body.classList.contains("sidebar-open")));
elements.drawerCloseButton.addEventListener("click", () => setSidebarOpen(false));
elements.sidebarOverlay.addEventListener("click", () => setSidebarOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setSidebarOpen(false);
});
window.addEventListener("resize", syncTopbarOffset);

document.querySelector("#changeShiftButton").addEventListener("click", () => {
  if (!state.session.signedIn) return;
  document.querySelector("#handoverSummary").innerHTML = `
    Outgoing operator: <strong>${state.session.user}</strong> (${state.session.role})<br>
    Active shift: <strong>${state.session.shift}</strong><br>
    Items to hand over: <strong>${dueInReservations().filter((reservation) => !reservation.room).length} unassigned arrivals</strong> and
    <strong>${inHouseStays().filter((stay) => balanceFor(stay) !== 0).length} unsettled folios</strong>`;
  openModal(elements.handoverModal);
});

document.querySelector("#handoverForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  const values = new FormData(event.target);
  const outgoing = { ...state.session };
  const [user, role] = values.get("incomingUser").split("|");
  if (state.apiConnected) {
    apiRequest("/api/session/handover", {
      method: "POST",
      body: JSON.stringify({
        sessionId: state.session.sessionId,
        incomingUser: user,
        incomingShift: values.get("incomingShift"),
        notes: values.get("notes")
      })
    }).then((payload) => {
      applySession(payload.session);
      applyRemoteState(payload.state);
      closeModal(elements.handoverModal);
      event.target.reset();
      renderSession();
      notify(`${state.session.shift} shift opened for ${state.session.user}.`);
    }).catch((error) => notify(error.message));
    return;
  }
  state.handovers.unshift({ outgoing, incoming: { user, role, shift: values.get("incomingShift") }, notes: values.get("notes") });
  state.session = { user, role, shift: values.get("incomingShift"), signedIn: true, permissions: rolePermissions[role] || [] };
  addActivity("Shift handover completed", `${outgoing.user} transferred duty to ${user}.`, `${outgoing.user} | ${outgoing.shift}`);
  closeModal(elements.handoverModal);
  event.target.reset();
  renderSession();
  notify(`${state.session.shift} shift opened for ${state.session.user}.`);
});

document.querySelector("#signOutButton").addEventListener("click", async () => {
  if (!state.session.signedIn) return;
  const signedOutUser = state.session.user;
  if (state.apiConnected && state.session.sessionId) {
    try {
      await apiRequest("/api/session/logout", {
        method: "POST",
        body: JSON.stringify({ sessionId: state.session.sessionId })
      });
      addActivity("Operator signed out", `${signedOutUser} closed access to this workstation.`);
      applySession(null);
      clearWorkstationState();
      renderSession();
      openModal(elements.loginModal);
    } catch (error) {
      notify(`Sign out failed: ${error.message}`);
    }
    return;
  }
  addActivity("Operator signed out", `${state.session.user} closed access to this workstation.`);
  applySession(null);
  clearWorkstationState();
  renderSession();
  openModal(elements.loginModal);
});

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = new FormData(event.target);
  const [user, role] = values.get("loginUser").split("|");
  if (state.apiConnected) {
    try {
      const payload = await apiRequest("/api/session/login", {
        method: "POST",
        body: JSON.stringify({ user, shift: values.get("loginShift") })
      });
      applySession(payload.session);
      applyRemoteState(payload.state);
      closeModal(elements.loginModal);
      renderSession();
      notify(`Welcome, ${state.session.user}. ${state.session.role} access enabled.`);
    } catch (error) {
      notify(error.message);
    }
    return;
  }
  state.session = { user, role, shift: values.get("loginShift"), signedIn: true, permissions: rolePermissions[role] || [] };
  addActivity("Operator signed in", `${user} opened the ${state.session.shift} workspace.`);
  closeModal(elements.loginModal);
  renderSession();
  notify(`Welcome, ${user}. ${role} access enabled.`);
});

elements.loginModal.addEventListener("cancel", (event) => {
  if (!state.session.signedIn) event.preventDefault();
});

async function initializeApp() {
  loadWorkstationState();
  try {
    await refreshRemoteState();
    if (state.session.sessionId) {
      try {
        const payload = await apiRequest(`/api/session/${state.session.sessionId}`);
        applySession(payload.session);
      } catch {
        applySession(null);
        clearWorkstationState();
      }
    }
    renderSession();
    if (!state.session.signedIn) openModal(elements.loginModal);
  } catch (error) {
    state.apiConnected = false;
    console.info("Using local demo state:", error.message);
    renderSession();
    syncTopbarOffset();
  }
}

initializeApp();
