const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
  const envPath = path.join(__dirname, "..", ".env");
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

function classifyHost(hostname) {
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return "local";
  if (hostname.endsWith(".render.com")) return "render";
  return "remote";
}

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL is not configured.");
  process.exit(0);
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const target = classifyHost(databaseUrl.hostname);

console.log(`Database target: ${target}`);
console.log(`Host: ${databaseUrl.hostname}`);
console.log(`Database: ${databaseUrl.pathname.replace(/^\//, "") || "(not specified)"}`);

if (target === "render") {
  console.log("Warning: local runs will share state with the deployed Render app.");
}
