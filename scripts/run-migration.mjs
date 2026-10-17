import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function isUnreachableHost(error) {
  const code = error?.code || "";
  const message = String(error?.message || "");
  return (
    code === "ENOTFOUND" ||
    code === "ENETUNREACH" ||
    code === "EAI_AGAIN" ||
    message.includes("ENOTFOUND") ||
    message.includes("ENETUNREACH")
  );
}

function connectionLabel(connectionString) {
  try {
    return new URL(connectionString).host;
  } catch {
    return "configured host";
  }
}

loadEnvLocal();

const candidates = [process.env.DATABASE_URL, process.env.DATABASE_POOLER_URL].filter(Boolean);
if (candidates.length === 0) {
  console.error("DATABASE_URL is missing. Add it to palpass/.env.local");
  process.exit(1);
}

const sqlPath = resolve(root, "supabase", "align_core_schema.sql");
if (!existsSync(sqlPath)) {
  console.error("Migration file not found:", sqlPath);
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
let client;
let usedHost = "";

try {
  let lastError;
  for (const connectionString of candidates) {
    const next = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await next.connect();
      client = next;
      usedHost = connectionLabel(connectionString);
      break;
    } catch (error) {
      lastError = error;
      try {
        await next.end();
      } catch {
        // Already closed.
      }
      if (!isUnreachableHost(error)) {
        throw error;
      }
      console.warn("Could not reach", connectionLabel(connectionString), "-", error.code || error.message);
    }
  }

  if (!client) {
    throw lastError || new Error("No database connection could be opened.");
  }

  console.log("Connected to PostgreSQL via", usedHost);
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Applied supabase/align_core_schema.sql");

  try {
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("Requested PostgREST schema reload");
  } catch (notifyError) {
    console.warn("Schema reload notify skipped:", notifyError.message);
  }
} catch (error) {
  if (client) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Connection already closed or never opened a transaction.
    }
  }
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  if (client) {
    await client.end();
  }
}
