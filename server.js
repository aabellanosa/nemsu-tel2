const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (process.env.NODE_ENV === "production" || !fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

loadLocalEnv();

function getDatabaseSslConfig(connectionString) {
  if (process.env.DATABASE_SSL === "false") return false;

  const host = new URL(connectionString).hostname;
  const isLocalDatabase = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return isLocalDatabase ? false : { rejectUnauthorized: false };
}

const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT) || 3000;
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: getDatabaseSslConfig(databaseUrl)
    })
  : null;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function toKebabStatus(value) {
  return String(value || "").replace(/_/g, "-");
}

function toSnakeStatus(value) {
  return String(value || "").replace(/-/g, "_").toLowerCase();
}

function toUiMaintenanceStatus(value) {
  return {
    in_service: "inService",
    out_of_service: "outOfService",
    out_of_order: "outOfOrder"
  }[value] || value;
}

function toDbMaintenanceStatus(value) {
  return {
    inService: "in_service",
    outOfService: "out_of_service",
    outOfOrder: "out_of_order"
  }[value] || value;
}

function formatDateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function requireDatabase(res) {
  if (pool) return true;
  sendJson(res, 503, { ok: false, message: "DATABASE_URL is not configured" });
  return false;
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    res.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

async function fetchRooms(client = pool) {
  const result = await client.query(`
    select
      id,
      room_number as "number",
      room_type as "type",
      occupancy_status as "occupancy",
      housekeeping_status as "housekeeping",
      maintenance_status,
      current_guest_name as "guest"
    from rooms
    order by room_number
  `);
  return result.rows.map((room) => ({
    ...room,
    maintenance: toUiMaintenanceStatus(room.maintenance_status),
    maintenance_status: undefined
  }));
}

async function fetchReservations(client = pool) {
  const result = await client.query(`
    select
      reservations.id,
      reservations.confirmation_number as confirmation,
      reservations.status,
      'GP-' || guest_profiles.id as "guestProfileId",
      guest_profiles.first_name as "guestFirstName",
      guest_profiles.last_name as "guestLastName",
      guest_profiles.nationality,
      guest_identifications.id_type as "idType",
      guest_identifications.id_number as "idNumber",
      guest_profiles.phone,
      guest_profiles.email,
      reservations.arrival_date as "arrivalDate",
      reservations.departure_date as "departureDate",
      reservations.eta,
      reservations.requested_room_type as "roomType",
      rooms.room_number as room,
      reservations.adults,
      reservations.children,
      reservations.rate_plan as "ratePlan",
      reservations.nightly_rate as "nightlyRate",
      reservations.payment_method as "paymentMethod",
      reservations.notes,
      guest_profiles.vip
    from reservations
    join guest_profiles on guest_profiles.id = reservations.guest_profile_id
    left join guest_identifications on guest_identifications.guest_profile_id = guest_profiles.id
    left join rooms on rooms.id = reservations.assigned_room_id
    order by reservations.arrival_date, reservations.id
  `);
  return result.rows.map((reservation) => ({
    ...reservation,
    status: toKebabStatus(reservation.status),
    arrivalDate: formatDateOnly(reservation.arrivalDate),
    departureDate: formatDateOnly(reservation.departureDate),
    nightlyRate: Number(reservation.nightlyRate)
  }));
}

async function fetchStays(client = pool) {
  const result = await client.query(`
    select
      stays.id,
      stays.reservation_id as "reservationId",
      guest_profiles.first_name || ' ' || guest_profiles.last_name as guest,
      rooms.room_number as room,
      rooms.room_type as "roomTypeCode",
      reservations.requested_room_type as "reservationRoomType",
      stays.departure_date as "departureDate",
      stays.status,
      coalesce(
        json_agg(
          json_build_object(
            'id', folio_transactions.id,
            'type', case folio_transactions.transaction_type
              when 'room_charge' then 'Room Charge'
              when 'service_charge' then 'Service Charge'
              when 'payment' then 'Payment'
              when 'room_move' then 'Room Move'
              else 'Adjustment'
            end,
            'source', folio_transactions.source,
            'category', service_categories.name,
            'description', folio_transactions.description,
            'amount', folio_transactions.amount,
            'reference', folio_transactions.reference,
            'notes', folio_transactions.notes
          )
          order by folio_transactions.created_at
        ) filter (where folio_transactions.id is not null),
        '[]'::json
      ) as folio
    from stays
    join guest_profiles on guest_profiles.id = stays.guest_profile_id
    join rooms on rooms.id = stays.room_id
    left join reservations on reservations.id = stays.reservation_id
    left join folios on folios.stay_id = stays.id
    left join folio_transactions on folio_transactions.folio_id = folios.id
    left join service_categories on service_categories.id = folio_transactions.service_category_id
    group by stays.id, guest_profiles.id, rooms.id, reservations.id
    order by stays.status, stays.id desc
  `);
  return result.rows.map((stay) => ({
    id: stay.id,
    reservationId: stay.reservationId,
    guest: stay.guest,
    room: stay.room,
    roomType: stay.reservationRoomType || { STD: "Standard Queen", DLX: "Deluxe", STE: "Executive Suite" }[stay.roomTypeCode] || stay.roomTypeCode,
    departureDate: formatDateOnly(stay.departureDate),
    status: toKebabStatus(stay.status),
    folio: stay.folio.map((item) => ({ ...item, amount: Number(item.amount) }))
  }));
}

async function fetchCardData(client = pool) {
  const [methods, authorizations] = await Promise.all([
    client.query(`
      select
        id,
        'card' as type,
        brand,
        masked_number as "maskedNumber",
        cardholder_name as cardholder,
        expiry_month as "expiryMonth",
        expiry_year as "expiryYear",
        token,
        reservation_id as "reservationId",
        stay_id as "stayId"
      from card_payment_methods
      order by id
    `),
    client.query(`
      select
        card_authorizations.authorization_code as id,
        card_authorizations.payment_method_id as "paymentMethodId",
        card_payment_methods.brand,
        card_payment_methods.masked_number as "maskedNumber",
        card_payment_methods.cardholder_name as cardholder,
        card_authorizations.amount,
        initcap(card_authorizations.status) as status,
        card_authorizations.authorized_at as "authorizedAt",
        card_authorizations.captured_at as "capturedAt",
        card_authorizations.reservation_id as "reservationId",
        card_authorizations.stay_id as "stayId"
      from card_authorizations
      join card_payment_methods on card_payment_methods.id = card_authorizations.payment_method_id
      order by card_authorizations.id
    `)
  ]);

  return {
    paymentMethods: methods.rows,
    cardAuthorizations: authorizations.rows.map((authorization) => ({
      ...authorization,
      amount: Number(authorization.amount)
    }))
  };
}

async function fetchActivity(client = pool) {
  const result = await client.query(`
    select
      summary as title,
      coalesce(entity_type || case when entity_id is null then '' else ' #' || entity_id end, event_type) as text,
      event_type as actor
    from audit_events
    order by created_at desc
    limit 8
  `);
  return result.rows;
}

async function fetchAppState(client = pool) {
  const [rooms, reservations, stays, activity, cardData] = await Promise.all([
    fetchRooms(client),
    fetchReservations(client),
    fetchStays(client),
    fetchActivity(client),
    fetchCardData(client)
  ]);
  return {
    rooms,
    reservations,
    stays,
    activity,
    paymentMethods: cardData.paymentMethods,
    cardAuthorizations: cardData.cardAuthorizations
  };
}

async function logAudit(client, eventType, entityType, entityId, summary) {
  await client.query(
    "insert into audit_events (event_type, entity_type, entity_id, summary) values ($1, $2, $3, $4)",
    [eventType, entityType, entityId == null ? null : String(entityId), summary]
  );
}

async function createCardAuthorization(client, authorization, links = {}) {
  if (!authorization) return null;
  const methodResult = await client.query(
    `insert into card_payment_methods
      (guest_profile_id, reservation_id, stay_id, brand, masked_number, cardholder_name, expiry_month, expiry_year, token)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id`,
    [
      links.guestProfileId || null,
      links.reservationId || authorization.reservationId || null,
      links.stayId || authorization.stayId || null,
      authorization.brand,
      authorization.maskedNumber,
      authorization.cardholder,
      authorization.expiryMonth || "00",
      authorization.expiryYear || "0000",
      `tok_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`
    ]
  );

  await client.query(
    `insert into card_authorizations
      (payment_method_id, reservation_id, stay_id, authorization_code, amount, status, captured_at)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      methodResult.rows[0].id,
      links.reservationId || authorization.reservationId || null,
      links.stayId || authorization.stayId || null,
      authorization.id || `AUTH-${Date.now().toString().slice(-6)}`,
      authorization.amount,
      toSnakeStatus(authorization.status || "Authorized"),
      authorization.capturedAt || null
    ]
  );
}

async function handleMutation(req, res, requestPath) {
  const body = await readJsonBody(req);

  if (req.method === "POST" && requestPath === "/api/reservations") {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const guest = await client.query(
        `insert into guest_profiles (first_name, last_name, nationality, phone, email, vip, notes)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [body.guestFirstName, body.guestLastName, body.nationality, body.phone || null, body.email || null, Boolean(body.vip), body.notes || null]
      );
      await client.query(
        "insert into guest_identifications (guest_profile_id, id_type, id_number) values ($1, $2, $3)",
        [guest.rows[0].id, body.idType, body.idNumber]
      );
      const reservation = await client.query(
        `insert into reservations
          (confirmation_number, guest_profile_id, status, arrival_date, departure_date, eta, requested_room_type, adults, children, rate_plan, nightly_rate, payment_method, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         returning id, confirmation_number`,
        [
          `GH-${Date.now().toString().slice(-5)}`,
          guest.rows[0].id,
          body.status === "due-in" ? "due_in" : "reserved",
          body.arrivalDate,
          body.departureDate,
          body.eta,
          body.roomType,
          body.adults,
          body.children,
          body.ratePlan,
          body.nightlyRate,
          body.paymentMethod,
          body.notes || null
        ]
      );
      await logAudit(client, "reservation", "reservation", reservation.rows[0].id, `Reservation created for ${body.guestFirstName} ${body.guestLastName}`);
      await client.query("commit");
      sendJson(res, 201, { ok: true, state: await fetchAppState() });
    } catch (error) {
      await client.query("rollback");
      sendJson(res, 500, { ok: false, message: error.message });
    } finally {
      client.release();
    }
    return true;
  }

  const assignMatch = requestPath.match(/^\/api\/reservations\/(\d+)\/assign-room$/);
  if (req.method === "POST" && assignMatch) {
    const reservationId = Number(assignMatch[1]);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const reservation = await client.query("select id, requested_room_type, guest_profile_id from reservations where id = $1 for update", [reservationId]);
      if (!reservation.rows[0]) throw new Error("Reservation not found.");
      const roomTypeCode = { "Standard Queen": "STD", "Deluxe King": "DLX", "Deluxe Twin": "DLX", "Executive Suite": "STE", Deluxe: "DLX" }[reservation.rows[0].requested_room_type];
      const room = await client.query(
        `select id, room_number from rooms
         where room_type = $1 and occupancy_status = 'vacant' and housekeeping_status in ('clean', 'inspected') and maintenance_status = 'in_service'
         order by room_number
         limit 1
         for update`,
        [roomTypeCode]
      );
      if (!room.rows[0]) throw new Error(`No ready ${reservation.rows[0].requested_room_type} rooms are available.`);
      const guest = await client.query("select first_name || ' ' || last_name as name from guest_profiles where id = $1", [reservation.rows[0].guest_profile_id]);
      await client.query("update reservations set assigned_room_id = $1 where id = $2", [room.rows[0].id, reservationId]);
      await client.query("update rooms set occupancy_status = 'assigned', current_guest_name = $1 where id = $2", [guest.rows[0].name, room.rows[0].id]);
      await logAudit(client, "room_assignment", "reservation", reservationId, `Room ${room.rows[0].room_number} assigned to ${guest.rows[0].name}`);
      await client.query("commit");
      sendJson(res, 200, { ok: true, state: await fetchAppState() });
    } catch (error) {
      await client.query("rollback");
      sendJson(res, 500, { ok: false, message: error.message });
    } finally {
      client.release();
    }
    return true;
  }

  const checkInMatch = requestPath.match(/^\/api\/reservations\/(\d+)\/check-in$/);
  if (req.method === "POST" && checkInMatch) {
    const reservationId = Number(checkInMatch[1]);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await client.query(
        `select reservations.*, rooms.id as room_id, rooms.room_number, guest_profiles.first_name || ' ' || guest_profiles.last_name as guest_name
         from reservations
         join rooms on rooms.id = reservations.assigned_room_id
         join guest_profiles on guest_profiles.id = reservations.guest_profile_id
         where reservations.id = $1
         for update`,
        [reservationId]
      );
      const reservation = result.rows[0];
      if (!reservation) throw new Error("Reservation not found or room is not assigned.");
      await client.query("update reservations set status = 'checked_in', payment_method = $1 where id = $2", [body.paymentMethod, reservationId]);
      await client.query("update rooms set occupancy_status = 'occupied', current_guest_name = $1 where id = $2", [reservation.guest_name, reservation.room_id]);
      const stay = await client.query(
        `insert into stays (reservation_id, guest_profile_id, room_id, departure_date)
         values ($1, $2, $3, $4)
         returning id`,
        [reservation.id, reservation.guest_profile_id, reservation.room_id, reservation.departure_date]
      );
      const folio = await client.query("insert into folios (stay_id) values ($1) returning id", [stay.rows[0].id]);
      const nights = Math.max(1, Math.round((new Date(reservation.departure_date) - new Date(reservation.arrival_date)) / 86400000));
      await client.query(
        `insert into folio_transactions (folio_id, transaction_type, source, description, amount, reference)
         values ($1, 'room_charge', 'front_desk', $2, $3, $4)`,
        [folio.rows[0].id, `${nights} night accommodation`, Number(reservation.nightly_rate) * nights, `POST-${reservation.confirmation_number}`]
      );
      if (body.authorization) {
        await createCardAuthorization(client, body.authorization, {
          guestProfileId: reservation.guest_profile_id,
          reservationId,
          stayId: stay.rows[0].id
        });
      }
      await logAudit(client, "check_in", "stay", stay.rows[0].id, `${reservation.guest_name} checked in to room ${reservation.room_number}`);
      await client.query("commit");
      sendJson(res, 200, { ok: true, state: await fetchAppState() });
    } catch (error) {
      await client.query("rollback");
      sendJson(res, 500, { ok: false, message: error.message });
    } finally {
      client.release();
    }
    return true;
  }

  const roomMatch = requestPath.match(/^\/api\/rooms\/([^/]+)$/);
  if (req.method === "PATCH" && roomMatch) {
    await pool.query(
      "update rooms set housekeeping_status = $1, maintenance_status = $2 where room_number = $3",
      [body.housekeeping, toDbMaintenanceStatus(body.maintenance), decodeURIComponent(roomMatch[1])]
    );
    await logAudit(pool, "room_status", "room", decodeURIComponent(roomMatch[1]), `Room ${decodeURIComponent(roomMatch[1])} status updated`);
    sendJson(res, 200, { ok: true, state: await fetchAppState() });
    return true;
  }

  const serviceMatch = requestPath.match(/^\/api\/stays\/(\d+)\/service-charge$/);
  if (req.method === "POST" && serviceMatch) {
    const stayId = Number(serviceMatch[1]);
    const category = await pool.query("select id from service_categories where name = $1", [body.category]);
    const folio = await pool.query("select id from folios where stay_id = $1 and status = 'open' limit 1", [stayId]);
    if (!folio.rows[0]) return sendJson(res, 404, { ok: false, message: "Open folio not found." });
    await pool.query(
      `insert into folio_transactions
        (folio_id, transaction_type, source, service_category_id, description, amount, reference, notes)
       values ($1, 'service_charge', 'services', $2, $3, $4, $5, $6)`,
      [folio.rows[0].id, category.rows[0]?.id || null, body.description, body.amount, body.reference, body.notes || null]
    );
    await logAudit(pool, "service_charge", "stay", stayId, `Service charge posted: ${body.description}`);
    sendJson(res, 200, { ok: true, state: await fetchAppState() });
    return true;
  }

  const paymentMatch = requestPath.match(/^\/api\/stays\/(\d+)\/payments$/);
  if (req.method === "POST" && paymentMatch) {
    const stayId = Number(paymentMatch[1]);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const stay = await client.query("select guest_profile_id, reservation_id from stays where id = $1", [stayId]);
      const folio = await client.query("select id from folios where stay_id = $1 and status = 'open' limit 1", [stayId]);
      if (!folio.rows[0] || !stay.rows[0]) throw new Error("Open folio not found.");
      if (body.authorizationId) {
        await client.query("update card_authorizations set status = 'captured', captured_at = now() where authorization_code = $1", [body.authorizationId]);
      }
      if (body.authorization) {
        await createCardAuthorization(client, body.authorization, {
          guestProfileId: stay.rows[0].guest_profile_id,
          reservationId: stay.rows[0].reservation_id,
          stayId
        });
      }
      await client.query(
        `insert into folio_transactions (folio_id, transaction_type, source, description, amount, reference)
         values ($1, 'payment', $2, $3, $4, $5)`,
        [folio.rows[0].id, body.source, body.description, -Math.abs(Number(body.amount)), body.reference]
      );
      await logAudit(client, "payment", "stay", stayId, `Payment posted: ${body.description}`);
      await client.query("commit");
      sendJson(res, 200, { ok: true, state: await fetchAppState() });
    } catch (error) {
      await client.query("rollback");
      sendJson(res, 500, { ok: false, message: error.message });
    } finally {
      client.release();
    }
    return true;
  }

  const checkoutMatch = requestPath.match(/^\/api\/stays\/(\d+)\/check-out$/);
  if (req.method === "POST" && checkoutMatch) {
    const stayId = Number(checkoutMatch[1]);
    const client = await pool.connect();
    try {
      await client.query("begin");
      const stay = await client.query("select room_id, reservation_id from stays where id = $1 for update", [stayId]);
      if (!stay.rows[0]) throw new Error("Stay not found.");
      await client.query("update stays set status = 'checked_out', checked_out_at = now() where id = $1", [stayId]);
      await client.query("update folios set status = 'closed' where stay_id = $1", [stayId]);
      await client.query("update rooms set occupancy_status = 'vacant', housekeeping_status = 'dirty', current_guest_name = null where id = $1", [stay.rows[0].room_id]);
      if (stay.rows[0].reservation_id) await client.query("update reservations set status = 'checked_out' where id = $1", [stay.rows[0].reservation_id]);
      await logAudit(client, "check_out", "stay", stayId, "Guest checked out");
      await client.query("commit");
      sendJson(res, 200, { ok: true, state: await fetchAppState() });
    } catch (error) {
      await client.query("rollback");
      sendJson(res, 500, { ok: false, message: error.message });
    } finally {
      client.release();
    }
    return true;
  }

  return false;
}

async function handleApi(req, res, requestPath) {
  if (requestPath === "/api/health") {
    const payload = {
      ok: true,
      service: "hmsystem",
      mode: "render-postgres-migration",
      database: {
        configured: Boolean(pool),
        status: pool ? "checking" : "not_configured"
      }
    };

    if (pool) {
      try {
        const result = await pool.query("select now() as checked_at");
        payload.database.status = "ok";
        payload.database.checkedAt = result.rows[0].checked_at;
      } catch (error) {
        payload.ok = false;
        payload.database.status = "error";
        payload.database.message = error.message;
      }
    }

    sendJson(res, payload.ok ? 200 : 503, payload);
    return true;
  }

  if (!requireDatabase(res)) return true;

  if (requestPath === "/api/state" && req.method === "GET") {
    try {
      sendJson(res, 200, { ok: true, state: await fetchAppState() });
    } catch (error) {
      sendJson(res, 500, { ok: false, message: error.message });
    }
    return true;
  }

  if (req.method !== "GET") {
    try {
      if (await handleMutation(req, res, requestPath)) return true;
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
      return true;
    }
    sendJson(res, 405, { ok: false, message: "Method not allowed" });
    return true;
  }

  if (requestPath === "/api/rooms") {
    try {
      sendJson(res, 200, { ok: true, rooms: await fetchRooms() });
    } catch (error) {
      sendJson(res, 500, { ok: false, message: error.message });
    }
    return true;
  }

  if (requestPath === "/api/bootstrap") {
    try {
      const [roles, users, serviceCategories, businessDates] = await Promise.all([
        pool.query("select id, name, description from roles order by id"),
        pool.query(`
          select
            users.id,
            users.display_name as "displayName",
            users.username,
            roles.name as role
          from users
          join roles on roles.id = users.role_id
          where users.is_active = true
          order by users.id
        `),
        pool.query("select id, name from service_categories where is_active = true order by name"),
        pool.query("select id, business_date as \"businessDate\", status from business_dates order by business_date desc limit 1")
      ]);
      sendJson(res, 200, {
        ok: true,
        roles: roles.rows,
        users: users.rows,
        serviceCategories: serviceCategories.rows,
        businessDate: businessDates.rows[0] || null
      });
    } catch (error) {
      sendJson(res, 500, { ok: false, message: error.message });
    }
    return true;
  }

  if (requestPath.startsWith("/api/")) {
    sendJson(res, 404, { ok: false, message: "API route not found" });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);

  if (await handleApi(req, res, requestPath)) {
    return;
  }

  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(publicDir, relativePath));
  const fileWithinPublicDir = path.relative(publicDir, filePath);

  if (fileWithinPublicDir.startsWith("..") || path.isAbsolute(fileWithinPublicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Front Desk Console running at http://localhost:${port}`);
});

process.on("SIGTERM", async () => {
  if (pool) await pool.end();
  server.close(() => process.exit(0));
});
