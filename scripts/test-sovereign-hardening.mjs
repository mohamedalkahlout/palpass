/**
 * Zero-trust pen test. Mutates only inside rolled-back sessions,
 * except the bill RPC which is asserted then fully reversed.
 * Usage: node scripts/test-sovereign-hardening.mjs
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

let passed = 0;
let failed = 0;
function ok(label, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function asCitizen(client, userId, fn) {
  await client.query("BEGIN");
  await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
  await client.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);
  await client.query("SET LOCAL ROLE authenticated");
  try {
    await fn();
  } finally {
    await client.query("ROLLBACK");
  }
}

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  try {
    const pending = await client.query(
      `SELECT id FROM profiles WHERE status = 'pending' AND role = 'citizen' LIMIT 1`
    );
    const active = await client.query(
      `SELECT id FROM profiles WHERE national_id = '556677889' AND status = 'active' AND is_verified = true LIMIT 1`
    );
    ok("pending citizen exists", pending.rowCount === 1);
    ok("active citizen 556677889 exists", active.rowCount === 1);
    if (!pending.rowCount || !active.rowCount) {
      console.log(`\n${passed} passed, ${failed} failed`);
      process.exitCode = 1;
      return;
    }
    const pendingId = pending.rows[0].id;
    const activeId = active.rows[0].id;

    console.log("\n[Attack 1] Self-elevation");
    let elevationBlocked = false;
    let elevationDetail = "";
    try {
      await asCitizen(client, pendingId, async () => {
        await client.query(`UPDATE profiles SET role = 'admin' WHERE id = $1`, [pendingId]);
      });
      elevationDetail = "update committed without exception";
    } catch (err) {
      elevationBlocked = /غير مصرح|42501|permission denied/i.test(String(err.message));
      elevationDetail = err.message.split("\n")[0];
    }
    ok("role update blocked by trigger", elevationBlocked, elevationDetail);

    const roleNow = await client.query(`SELECT role FROM profiles WHERE id = $1`, [pendingId]);
    ok("pending role unchanged", roleNow.rows[0].role === "citizen", roleNow.rows[0].role);

    console.log("\n[Attack 2] Wallet tamper");
    let walletBlocked = false;
    let walletDetail = "";
    try {
      await asCitizen(client, pendingId, async () => {
        const res = await client.query(
          `UPDATE wallets SET balance = 99999 WHERE user_id = $1 RETURNING balance`,
          [pendingId]
        );
        if (res.rowCount > 0) throw new Error(`rows updated: ${res.rowCount}`);
        throw new Error("zero rows and no permission error");
      });
    } catch (err) {
      walletBlocked = /42501|permission denied|zero rows/i.test(String(err.message));
      walletDetail = err.message.split("\n")[0];
      if (/rows updated/.test(err.message)) walletBlocked = false;
    }
    ok("wallet update rejected", walletBlocked, walletDetail);

    console.log("\n[Attack 3] Unverified charity RPC");
    const campaign = await client.query(
      `SELECT id FROM charity_campaigns WHERE status = 'active' LIMIT 1`
    );
    const rpc = await client.query(
      `SELECT public.contribute_to_charity_rpc($1, $2, 10, false) AS result`,
      [pendingId, campaign.rows[0].id]
    );
    const result = rpc.rows[0].result;
    ok(
      "unverified donation refused",
      result?.success === false && String(result?.error || "").includes("اعتماد"),
      JSON.stringify(result)
    );

    console.log("\n[Valid flow] Atomic bill payment");
    const before = await client.query(`SELECT balance FROM wallets WHERE user_id = $1`, [activeId]);
    const balBefore = Number(before.rows[0].balance);
    const inserted = await client.query(
      `INSERT INTO bills (user_id, provider, amount, status)
       VALUES ($1, 'PENTEST-UTILITY', 1.00, 'unpaid')
       RETURNING id`,
      [activeId]
    );
    const billId = inserted.rows[0].id;
    const paid = await client.query(`SELECT public.pay_bill_rpc($1, $2) AS result`, [activeId, billId]);
    const pay = paid.rows[0].result;
    const after = await client.query(
      `SELECT w.balance, b.status
       FROM wallets w, bills b
       WHERE w.user_id = $1 AND b.id = $2`,
      [activeId, billId]
    );
    ok("rpc success", pay?.success === true, JSON.stringify(pay));
    ok(
      "balance decreased by 1",
      Math.abs(Number(after.rows[0].balance) - (balBefore - 1)) < 0.001,
      `before=${balBefore} after=${after.rows[0].balance}`
    );
    ok("bill marked paid", after.rows[0].status === "paid", after.rows[0].status);

    await client.query(`DELETE FROM wallet_transactions WHERE ref_id = $1`, [billId]);
    await client.query(`DELETE FROM bills WHERE id = $1`, [billId]);
    await client.query(`UPDATE wallets SET balance = $2, last_updated = NOW() WHERE user_id = $1`, [
      activeId,
      balBefore,
    ]);
    const restored = await client.query(`SELECT balance FROM wallets WHERE user_id = $1`, [activeId]);
    ok(
      "wallet restored after assertion",
      Math.abs(Number(restored.rows[0].balance) - balBefore) < 0.001
    );

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exitCode = failed > 0 ? 1 : 0;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
