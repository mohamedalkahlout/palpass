/**
 * Admin accreditation queue sanity check. Read/assert, promote the named admin if needed.
 * Usage: node scripts/check-admin-queue.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN_EMAIL = "ajr999999999@gmail.com";

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

async function readable(url) {
  if (!url) return false;
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  return res.ok;
}

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  try {
    let named = await client.query(
      `SELECT id, email, role, status, is_verified
       FROM profiles
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [ADMIN_EMAIL]
    );

    let promoted = false;
    if (named.rowCount) {
      const row = named.rows[0];
      if (row.role !== "admin" || row.status !== "active" || row.is_verified !== true) {
        await client.query(
          `UPDATE profiles
           SET role = 'admin', status = 'active', is_verified = true, updated_at = NOW()
           WHERE id = $1`,
          [row.id]
        );
        promoted = true;
      }
    }

    const admin = await client.query(
      `SELECT id, email, role, status, is_verified
       FROM profiles
       WHERE role = 'admin' AND status = 'active' AND is_verified = true
       ORDER BY (lower(email) = lower($1)) DESC, created_at ASC
       LIMIT 1`,
      [ADMIN_EMAIL]
    );

    const pending = await client.query(
      `SELECT id, full_name, national_id,
              verification_doc_url IS NOT NULL AND length(trim(verification_doc_url)) > 0 AS has_doc,
              personal_photo_url IS NOT NULL AND length(trim(personal_photo_url)) > 0 AS has_photo,
              verification_doc_url, personal_photo_url
       FROM profiles
       WHERE role = 'citizen' AND status = 'pending'
       ORDER BY created_at ASC`
    );

    const readyPending = pending.rows.filter((r) => r.has_doc && r.has_photo);
    const sample = readyPending[0] || null;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const bucket = process.env.NEXT_PUBLIC_BUCKET_DOCS || "verification-docs";

    async function sign(path) {
      if (!path) return null;
      if (/^https?:\/\//i.test(path)) return path;
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }

    let signedPass = false;
    let docReadable = false;
    let photoReadable = false;
    if (sample) {
      const [docUrl, photoUrl] = await Promise.all([
        sign(sample.verification_doc_url),
        sign(sample.personal_photo_url),
      ]);
      docReadable = await readable(docUrl);
      photoReadable = await readable(photoUrl);
      signedPass = Boolean(docUrl && photoUrl && docReadable && photoReadable);
    }

    const adminRow = admin.rows[0];
    const adminReady = Boolean(
      adminRow && adminRow.role === "admin" && adminRow.status === "active" && adminRow.is_verified === true
    );

    console.log(
      JSON.stringify(
        {
          adminReady,
          adminEmail: adminRow?.email || null,
          adminRole: adminRow?.role || null,
          adminStatus: adminRow?.status || null,
          adminVerified: adminRow?.is_verified ?? null,
          promoted,
          pendingCount: pending.rowCount,
          pendingWithBothFiles: readyPending.length,
          sampleNationalId: sample?.national_id || null,
          signedUrlGenerator: signedPass ? "Pass" : "Fail",
          docReadable,
          photoReadable,
        },
        null,
        2
      )
    );

    if (!adminReady || !signedPass || readyPending.length < 1) process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
