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

async function handleApi(req, res, requestPath) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, message: "Method not allowed" });
    return true;
  }

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

  if (requestPath === "/api/rooms") {
    if (!requireDatabase(res)) return true;

    try {
      const result = await pool.query(`
        select
          id,
          room_number as "roomNumber",
          room_type as "roomType",
          occupancy_status as "occupancyStatus",
          housekeeping_status as "housekeepingStatus",
          maintenance_status as "maintenanceStatus",
          current_guest_name as "currentGuestName"
        from rooms
        order by room_number
      `);
      sendJson(res, 200, { ok: true, rooms: result.rows });
    } catch (error) {
      sendJson(res, 500, { ok: false, message: error.message });
    }
    return true;
  }

  if (requestPath === "/api/bootstrap") {
    if (!requireDatabase(res)) return true;

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
