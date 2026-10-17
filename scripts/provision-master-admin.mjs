/**
 * Provision the PALPASS sovereign master administrator.
 * Usage: node scripts/provision-master-admin.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = "mohamed.kahlaout@outlook.com";
const NID = "407926773";
const FULL_NAME = "محمد كحلوت";
const PASSWORD = "PalPassAdmin#2026";

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

const metadata = {
  national_id: NID,
  full_name: FULL_NAME,
  role: "admin",
};

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();

  try {
    const found = await client.query(
      `SELECT id, email
       FROM auth.users
       WHERE lower(email) = lower($1)
          OR raw_user_meta_data->>'national_id' = $2
       LIMIT 1`,
      [EMAIL, NID]
    );

    let userId;
    if (found.rowCount) {
      userId = found.rows[0].id;
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) throw error;
      console.log(`Auth User: ${EMAIL} [Updated]`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) throw error;
      userId = data.user.id;
      console.log(`Auth User: ${EMAIL} [Provisioned]`);
    }

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO profiles (
         id, national_id, full_name, email, phone, governorate, city, region,
         verification_doc_url, personal_photo_url, status, role, is_verified, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, '0599000000', 'غزة', 'غزة', 'غزة',
         'system/master-admin-doc.png', 'system/master-admin-face.png',
         'active', 'admin', true, NOW(), NOW()
       )
       ON CONFLICT (id) DO UPDATE SET
         national_id = EXCLUDED.national_id,
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         governorate = EXCLUDED.governorate,
         city = EXCLUDED.city,
         region = EXCLUDED.region,
         role = 'admin',
         status = 'active',
         is_verified = true,
         updated_at = NOW()`,
      [userId, NID, FULL_NAME, EMAIL]
    );

    await client.query(
      `UPDATE profiles
       SET role = 'admin', status = 'active', is_verified = true, email = $2, full_name = $3, updated_at = NOW()
       WHERE national_id = $1`,
      [NID, EMAIL, FULL_NAME]
    );

    await client.query(
      `INSERT INTO wallets (user_id, balance, currency, last_updated)
       VALUES ($1, 5000.00, 'ILS', NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         balance = GREATEST(wallets.balance, 5000.00),
         last_updated = NOW()`,
      [userId]
    );
    await client.query("COMMIT");

    const verify = await client.query(
      `SELECT p.national_id, p.full_name, p.email, p.role, p.status, p.is_verified, w.balance, w.currency
       FROM profiles p
       LEFT JOIN wallets w ON w.user_id = p.id
       WHERE p.id = $1`,
      [userId]
    );
    const row = verify.rows[0];

    const login = await admin.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (login.error) throw login.error;

    console.log(`NID: ${row.national_id} [Linked & Synchronized]`);
    console.log(`Name: ${row.full_name}`);
    console.log(`Role: ${row.role} | Status: ${row.status} | Verified: ${row.is_verified}`);
    console.log(`Wallet: ${Number(row.balance).toFixed(2)} ${row.currency} [Active]`);
    console.log("Login route credential check: [Pass]");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error(err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
