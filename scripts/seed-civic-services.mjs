/**
 * Seed realistic Palestinian civic data for pending citizens.
 * Uses direct PostgreSQL pooler (DATABASE_URL from .env.local).
 *
 * Usage: node scripts/seed-civic-services.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const dueInDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: pending } = await client.query(
      `SELECT id, national_id, full_name
       FROM profiles
       WHERE status = 'pending' AND role = 'citizen'
       ORDER BY created_at ASC`
    );

    if (pending.length === 0) {
      console.log("No pending citizens found — nothing to seed for user-scoped rows.");
    } else {
      console.log(`Pending citizens: ${pending.length}`);
    }

    for (const citizen of pending) {
      console.log(`\n→ Seeding civic rows for ${citizen.full_name} (${citizen.national_id})`);

      await client.query(
        `INSERT INTO bills (user_id, provider, amount, due_date, status)
         SELECT $1, $2, $3, $4::date, 'unpaid'
         WHERE NOT EXISTS (
           SELECT 1 FROM bills WHERE user_id = $1 AND provider = $2 AND status = 'unpaid'
         )`,
        [
          citizen.id,
          "فاتورة كهرباء وتوزيع غزة والوسطى",
          180.0,
          dueInDays(14),
        ]
      );

      await client.query(
        `INSERT INTO bills (user_id, provider, amount, due_date, status)
         SELECT $1, $2, $3, $4::date, 'unpaid'
         WHERE NOT EXISTS (
           SELECT 1 FROM bills WHERE user_id = $1 AND provider = $2 AND status = 'unpaid'
         )`,
        [
          citizen.id,
          "مستحقات مياه وبلدية دير البلح",
          45.0,
          dueInDays(10),
        ]
      );

      await client.query(
        `INSERT INTO violations (user_id, type, reason, location, amount, status, issued_at)
         SELECT $1, $2, $3, $4, $5, 'unpaid', CURRENT_DATE
         WHERE NOT EXISTS (
           SELECT 1 FROM violations
           WHERE user_id = $1 AND type = $2 AND location = $4 AND status = 'unpaid'
         )`,
        [
          citizen.id,
          "مخالفة سير",
          "عدم ارتداء حزام الأمان",
          "شارع صلاح الدين",
          150.0,
        ]
      );

      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         SELECT $1, $2, $3, 'system', false
         WHERE NOT EXISTS (
           SELECT 1 FROM notifications
           WHERE user_id = $1 AND title = $2
         )`,
        [
          citizen.id,
          "مرحباً بك في PALPASS",
          "تم استلام طلب هويتك الرقمية وهو قيد المراجعة لدى الشؤون المدنية. يمكنك متابعة الحالة من لوحة المواطن.",
        ]
      );
    }

    // Shared transport catalog (idempotent by name)
    const taxis = [
      {
        name: "مكتب القدس للتاكسي",
        city: "Gaza",
        phone: "0599001001",
        description: "مكتب معتمد يخدم دير البلح — غزة برحلات فورية وآمنة.",
      },
      {
        name: "مكتب الكرامة",
        city: "Ramallah",
        phone: "0599001002",
        description: "شبكة تاكسي بين رام الله ونابلس بترخيص بلدي.",
      },
    ];

    for (const taxi of taxis) {
      await client.query(
        `INSERT INTO taxi_offices (name, city, phone, description, is_approved)
         SELECT $1, $2, $3, $4, TRUE
         WHERE NOT EXISTS (SELECT 1 FROM taxi_offices WHERE name = $1)`,
        [taxi.name, taxi.city, taxi.phone, taxi.description]
      );
    }

    await client.query(
      `INSERT INTO bus_routes (bus_number, from_city, to_city, schedule, driver_name, is_active)
       SELECT $1, $2, $3, $4::jsonb, $5, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM bus_routes WHERE bus_number = $1 AND from_city = $2 AND to_city = $3
       )`,
      [
        "وطنية-01",
        "Jerusalem",
        "Bethlehem",
        JSON.stringify(["06:30", "09:00", "12:30", "16:00", "19:30"]),
        "باصات الوطنية المركزية",
      ]
    );

    await client.query("COMMIT");

    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM bills) AS bills,
        (SELECT count(*)::int FROM violations) AS violations,
        (SELECT count(*)::int FROM taxi_offices WHERE is_approved) AS taxis,
        (SELECT count(*)::int FROM bus_routes WHERE is_active) AS buses,
        (SELECT count(*)::int FROM notifications) AS notifications
    `);

    console.log("\n✅ Civic seed complete:");
    console.log(counts.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
