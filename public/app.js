const today = new Date();
const dateKey = today.toISOString().split("T")[0];
const statusLabels = {
  available: "Vacant Clean",
  occupied: "Occupied",
  dirty: "Vacant Dirty",
  out: "Out of Order"
};

const state = {
  arrivalFilter: "all",
  activeRoom: null,
  arrivals: [
    { id: 1, guest: "Alicia Fernandez", confirmation: "GH-28491", eta: "12:30 PM", room: "402", status: "ready", vip: true },
    { id: 2, guest: "Robert Delgado", confirmation: "GH-28506", eta: "2:00 PM", room: "318", status: "ready", vip: false },
    { id: 3, guest: "Maria Velasco", confirmation: "GH-28524", eta: "3:15 PM", room: "Unassigned", status: "pending", vip: true },
    { id: 4, guest: "James Wu", confirmation: "GH-28538", eta: "5:30 PM", room: "Unassigned", status: "pending", vip: false }
  ],
  rooms: [
    { number: "201", type: "STD", status: "available" },
    { number: "202", type: "STD", status: "occupied", guest: "Ana Romero" },
    { number: "203", type: "DLX", status: "available" },
    { number: "204", type: "DLX", status: "dirty" },
    { number: "205", type: "STD", status: "available" },
    { number: "301", type: "STD", status: "occupied", guest: "Jose Rivera" },
    { number: "302", type: "DLX", status: "available" },
    { number: "303", type: "DLX", status: "occupied", guest: "Linda Park" },
    { number: "304", type: "STE", status: "out" },
    { number: "305", type: "STD", status: "available" },
    { number: "401", type: "DLX", status: "occupied", guest: "Ramon Cruz" },
    { number: "402", type: "STE", status: "available" },
    { number: "403", type: "DLX", status: "dirty" },
    { number: "404", type: "STE", status: "available" },
    { number: "405", type: "STD", status: "occupied", guest: "Emily Tan" }
  ],
  guests: [
    { name: "Daniel Reyes", room: "305", depart: "May 29", balance: "$286.50" },
    { name: "Linda Park", room: "303", depart: "May 28", balance: "$74.00" },
    { name: "Ramon Cruz", room: "401", depart: "May 30", balance: "$0.00" }
  ],
  activity: [
    { title: "Room 204 marked dirty", text: "Housekeeping queue updated - 8:16 AM" },
    { title: "Advance deposit posted", text: "GH-28491 - $220.00 - 7:48 AM" },
    { title: "VIP arrival flagged", text: "Maria Velasco requested late checkout" }
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
  roomModal: document.querySelector("#roomModal")
};

document.querySelector("#businessDate").textContent = today.toLocaleDateString("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric"
});

function renderMetrics() {
  const occupied = state.rooms.filter((room) => room.status === "occupied").length;
  const serviceRooms = state.rooms.filter((room) => room.status === "dirty" || room.status === "out").length;
  const occupancy = Math.round((occupied / state.rooms.length) * 100);
  const cards = [
    { label: "Occupancy", value: `${occupancy}%`, detail: "+4.2% vs yesterday", className: "positive" },
    { label: "Arrivals", value: state.arrivals.length, detail: `${state.arrivals.filter((arrival) => arrival.vip).length} VIP guests` },
    { label: "Departures", value: "31", detail: "18 checked out" },
    { label: "In House", value: occupied + 82, detail: `${occupied} recent check-ins` },
    { label: "Room Issues", value: serviceRooms, detail: "Needs action", className: serviceRooms ? "negative" : "positive" }
  ];

  elements.metrics.innerHTML = cards.map((card) => `
    <article class="metric">
      <p class="label">${card.label}</p>
      <strong>${card.value}</strong>
      <small class="${card.className || ""}">${card.detail}</small>
    </article>
  `).join("");
}

function renderArrivals() {
  const filtered = state.arrivals.filter((arrival) => {
    if (state.arrivalFilter === "vip") return arrival.vip;
    if (state.arrivalFilter === "unassigned") return arrival.room === "Unassigned";
    return true;
  });

  elements.arrivalsTable.innerHTML = filtered.length ? filtered.map((arrival) => `
    <tr>
      <td>${arrival.guest}${arrival.vip ? '<span class="tag vip">VIP</span>' : ""}</td>
      <td>${arrival.confirmation}</td>
      <td>${arrival.eta}</td>
      <td>${arrival.room}</td>
      <td><span class="tag ${arrival.status}">${arrival.status === "ready" ? "Ready" : "Pending"}</span></td>
      <td><button class="row-action" data-check-in="${arrival.id}">${arrival.room === "Unassigned" ? "Assign" : "Check In"}</button></td>
    </tr>
  `).join("") : '<tr><td colspan="6">No arrivals match this view.</td></tr>';
}

function renderRooms() {
  elements.roomRack.innerHTML = state.rooms.map((room) => `
    <button class="room ${room.status}" data-room="${room.number}">
      ${room.number}<small>${room.type}</small>
    </button>
  `).join("");
}

function renderGuests() {
  document.querySelector("#inHouseCount").textContent = `${state.guests.length} Active`;
  elements.inHouseGuests.innerHTML = state.guests.map((guest) => `
    <div class="guest-card">
      <div>
        <strong>${guest.name}</strong>
        <p>Room ${guest.room} | Departure ${guest.depart}</p>
      </div>
      <div class="folio">
        <strong>${guest.balance}</strong>
        <button class="text-button" data-folio="${guest.name}">View Folio</button>
      </div>
    </div>
  `).join("");
}

function renderActivity() {
  elements.activityFeed.innerHTML = state.activity.map((entry) => `
    <div class="activity-item">
      <strong>${entry.title}</strong>
      ${entry.text}
    </div>
  `).join("");
}

function addActivity(title, text) {
  state.activity.unshift({ title, text });
  state.activity = state.activity.slice(0, 4);
  renderActivity();
}

let toastTimer;
function notify(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}

function assignAvailableRoom(arrival) {
  const room = state.rooms.find((candidate) => candidate.status === "available");
  if (!room) {
    notify("No vacant clean rooms available.");
    return false;
  }
  arrival.room = room.number;
  arrival.status = "ready";
  addActivity(`Room ${room.number} assigned`, `${arrival.guest} - ${arrival.confirmation}`);
  return true;
}

function handleArrivalAction(id) {
  const arrival = state.arrivals.find((item) => item.id === Number(id));
  if (arrival.room === "Unassigned") {
    if (assignAvailableRoom(arrival)) {
      renderArrivals();
      notify(`${arrival.guest} assigned to room ${arrival.room}.`);
    }
    return;
  }

  const room = state.rooms.find((candidate) => candidate.number === arrival.room);
  if (room) {
    room.status = "occupied";
    room.guest = arrival.guest;
  }
  state.guests.unshift({ name: arrival.guest, room: arrival.room, depart: "May 29", balance: "$0.00" });
  state.arrivals = state.arrivals.filter((item) => item.id !== arrival.id);
  addActivity(`${arrival.guest} checked in`, `Room ${arrival.room} - keys encoded`);
  renderAll();
  notify(`Check-in completed for ${arrival.guest}.`);
}

function openRoom(number) {
  const room = state.rooms.find((candidate) => candidate.number === number);
  state.activeRoom = room;
  document.querySelector("#roomModalTitle").textContent = `Room ${room.number}`;
  document.querySelector("#roomDetails").innerHTML = `
    <strong>${room.type} Room</strong><br>
    Current Status: ${statusLabels[room.status]}<br>
    ${room.guest ? `Registered Guest: ${room.guest}` : "No active guest assigned"}
  `;
  document.querySelector("#roomStatusSelect").value = room.status;
  elements.roomModal.showModal();
}

function renderAll() {
  renderMetrics();
  renderArrivals();
  renderRooms();
  renderGuests();
  renderActivity();
}

document.querySelector("#newReservationButton").addEventListener("click", () => {
  document.querySelector('[name="arrivalDate"]').value = dateKey;
  elements.reservationModal.showModal();
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
});

document.querySelector("#reservationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const id = Date.now();
  const confirmation = `GH-${String(id).slice(-5)}`;
  const eta = values.get("eta");
  const arrival = {
    id,
    guest: values.get("guestName"),
    confirmation,
    eta: new Date(`2000-01-01T${eta}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    room: "Unassigned",
    status: "pending",
    vip: values.get("vip") === "true"
  };
  state.arrivals.push(arrival);
  addActivity("Reservation created", `${arrival.guest} - ${confirmation}`);
  renderAll();
  form.reset();
  elements.reservationModal.close();
  notify(`Reservation ${confirmation} saved.`);
});

document.querySelector("#arrivalTabs").addEventListener("click", (event) => {
  const filter = event.target.dataset.filter;
  if (!filter) return;
  state.arrivalFilter = filter;
  document.querySelectorAll("#arrivalTabs button").forEach((button) => button.classList.toggle("active", button.dataset.filter === filter));
  renderArrivals();
});

elements.arrivalsTable.addEventListener("click", (event) => {
  if (event.target.dataset.checkIn) handleArrivalAction(event.target.dataset.checkIn);
});

elements.roomRack.addEventListener("click", (event) => {
  const roomButton = event.target.closest("[data-room]");
  if (roomButton) openRoom(roomButton.dataset.room);
});

document.querySelector("#roomForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const previousStatus = state.activeRoom.status;
  state.activeRoom.status = document.querySelector("#roomStatusSelect").value;
  if (state.activeRoom.status !== "occupied") delete state.activeRoom.guest;
  addActivity(`Room ${state.activeRoom.number} updated`, `${statusLabels[previousStatus]} to ${statusLabels[state.activeRoom.status]}`);
  elements.roomModal.close();
  renderAll();
  notify(`Room ${state.activeRoom.number} marked ${statusLabels[state.activeRoom.status]}.`);
});

document.querySelector("#assignRoomButton").addEventListener("click", () => {
  const pending = state.arrivals.find((arrival) => arrival.room === "Unassigned");
  if (!pending) return notify("All arrivals already have rooms assigned.");
  if (assignAvailableRoom(pending)) {
    renderAll();
    notify(`Room ${pending.room} assigned to ${pending.guest}.`);
  }
});

document.querySelector("#showAllRooms").addEventListener("click", () => {
  notify(`${state.rooms.length} rooms displayed in current rack.`);
});

document.querySelector("#inHouseGuests").addEventListener("click", (event) => {
  if (event.target.dataset.folio) {
    notify(`Opened folio for ${event.target.dataset.folio}.`);
  }
});

document.querySelector("#globalSearch").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  const feedback = document.querySelector("#searchFeedback");
  if (!query) {
    feedback.textContent = "Ready for lookup";
    return;
  }
  const arrival = state.arrivals.find((item) => item.guest.toLowerCase().includes(query) || item.confirmation.toLowerCase().includes(query) || item.room.toLowerCase().includes(query));
  const guest = state.guests.find((item) => item.name.toLowerCase().includes(query) || item.room.includes(query));
  feedback.textContent = arrival ? `Arrival: ${arrival.guest}` : guest ? `In House: ${guest.name}` : "No matching guest found";
});

document.querySelector("#navigation").addEventListener("click", (event) => {
  const selected = event.target.closest(".nav-item");
  if (!selected) return;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
  selected.classList.add("active");
  const labels = {
    dashboard: "Today's Front Desk Overview",
    reservations: "Reservations Management",
    rooms: "Rooms and Availability",
    housekeeping: "Housekeeping Status",
    cashiering: "Cashiering and Folios",
    reports: "Operational Reports"
  };
  document.querySelector("#viewTitle").textContent = labels[selected.dataset.view];
  notify(`${selected.textContent.trim()} workspace selected.`);
});

renderAll();
