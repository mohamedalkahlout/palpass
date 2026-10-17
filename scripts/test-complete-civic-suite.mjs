/**
 * PALPASS — Complete Civic Suite (SMTP + registration handoff + auth + gating)
 * Run: node --import ./scripts/auth-test-loader.mjs scripts/test-complete-civic-suite.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import nodemailer from "nodemailer";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_NID = "900000001";
const BENCH_EMAIL = "mohamed.kahlaout@outlook.com";
const ACTIVE_CITIZEN_REQUIRED =
  "هذه الخدمة تتطلب اعتماد الهوية الرقمية من قبل الشؤون المدنية أولاً.";

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
process.env.PALPASS_AUTH_TEST = "1";
globalThis.__PALPASS_TEST_COOKIES__ = { store: new Map() };

let passed = 0;
let failed = 0;
let generatedPassword = null;

function ok(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function tinyPngFile(name = "face.png", type = "image/png") {
  const buf = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  return new File([buf], name, { type });
}

function fdFrom(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) fd.append(k, v);
  }
  return fd;
}

async function purgeTestCitizen(admin) {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, verification_doc_url, personal_photo_url")
    .eq("national_id", TEST_NID)
    .maybeSingle();
  if (!profile?.id) return;
  const bucket = process.env.NEXT_PUBLIC_BUCKET_DOCS || "verification-docs";
  const paths = [profile.verification_doc_url, profile.personal_photo_url].filter(Boolean);
  if (paths.length) await admin.storage.from(bucket).remove(paths).catch(() => {});
  await admin.from("wallets").delete().eq("user_id", profile.id);
  await admin.from("notifications").delete().eq("user_id", profile.id);
  await admin.from("profiles").delete().eq("id", profile.id);
  await admin.auth.admin.deleteUser(profile.id).catch(() => {});
}

async function smtpBenchmark() {
  const smtpUser = process.env.SMTP_USER || "ajr999999999@gmail.com";
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    pool: true,
    maxConnections: 3,
    auth: {
      user: smtpUser,
      pass: (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, ""),
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 8000,
    greetingTimeout: 4000,
  });
  const started = Date.now();
  const info = await transporter.sendMail({
    from: `"PALPASS" <${smtpUser}>`,
    to: BENCH_EMAIL,
    subject: "PALPASS | بيانات الدخول المعتمدة — دولة فلسطين",
    text: `المواطن صاحب الهوية :#405050509 , هذه كلمة السر الجديدة : bench000`,
    html: `<div style="color:#064e3b">PALPASS benchmark</div>`,
  });
  const elapsedMs = Date.now() - started;
  await transporter.close();
  const response = String(info.response || "");
  ok("5.1 SMTP 250 OK", /250\s+2\.0\.0\s+OK/i.test(response), response);
  ok("5.1 SMTP under 2500ms", elapsedMs < 2500, `${elapsedMs}ms`);
}

async function main() {
  console.log("\n══ PALPASS Complete Civic Suite ══\n");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl =
    process.env.DATABASE_POOLER_URL ||
    process.env.DATABASE_URL ||
    "";

  if (!dbUrl) {
    console.error("Missing DATABASE_POOLER_URL/DATABASE_URL env var");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, max: 2 });
  try {
    const r = await pool.query("select 1 as ok");
    ok("0 pooler connection", r.rows[0]?.ok === 1);
    const { rows: bio } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='profiles'
      AND column_name IN ('personal_photo_url','governorate')
    `);
    ok("0 biometric columns", bio.length >= 2, bio.map((x) => x.column_name).join(","));
  } catch (e) {
    ok("0 pooler connection", false, e.message);
  }

  console.log("\n[5] SMTP Live Delivery");
  try {
    await smtpBenchmark();
  } catch (e) {
    ok("5.1 SMTP send", false, e.message);
  }

  await purgeTestCitizen(admin);

  const actionsUrl = pathToFileURL(resolve(root, "src/app/actions.js")).href;
  const { registerCitizen, signIn, forgotPassword, payBill } = await import(actionsUrl);

  console.log("\n[1] Dual-file registration + handoff payload");
  const email = `civic.${TEST_NID}@palpass-test.local`;
  const reg = await registerCitizen(
    fdFrom({
      email,
      nationalId: TEST_NID,
      fullName: "مواطن اختبار تجريبي رباعي",
      phone: "0591234567",
      city: "رام الله",
      governorate: "رام الله والبيرة",
      document: tinyPngFile("id.png"),
      personalPhoto: tinyPngFile("face.png"),
    })
  );
  generatedPassword = reg?.testPassword;
  ok("1.1 register success", reg?.success === true, JSON.stringify(reg));
  ok("1.2 nationalId returned", reg?.nationalId === TEST_NID);
  ok("1.2 maskedEmail returned", Boolean(reg?.maskedEmail) && reg.maskedEmail.includes("@"));

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("national_id", TEST_NID)
    .single();
  ok("1.3 profile pending + photos", profile?.status === "pending" && profile?.personal_photo_url && profile?.verification_doc_url);

  const { data: wallet } = await admin.from("wallets").select("balance").eq("user_id", profile.id).single();
  ok("1.4 wallet zero", Number(wallet?.balance) === 0);

  console.log("\n[2] Pending sign-in + gating");
  globalThis.__PALPASS_TEST_COOKIES__.store.clear();
  const login = await signIn(fdFrom({ nationalId: TEST_NID, password: generatedPassword }));
  ok(
    "2.1 pending login",
    login?.success === true && /dashboard/.test(String(login?.redirectUrl || "")),
    JSON.stringify(login)
  );

  const billGate = await payBill("00000000-0000-0000-0000-000000000001");
  ok(
    "2.2 payBill soft-lock",
    billGate?.error === ACTIVE_CITIZEN_REQUIRED || String(billGate?.error || "").includes("اعتماد"),
    JSON.stringify(billGate)
  );

  console.log("\n[3] Password reset");
  const forgot = await forgotPassword(fdFrom({ nationalId: TEST_NID }));
  ok("3.1 forgot success", forgot?.success === true);
  const newPw = forgot?.testPassword;
  ok("3.2 new password hex", Boolean(newPw) && /^[a-f0-9]{8}$/.test(newPw));
  if (newPw) {
    globalThis.__PALPASS_TEST_COOKIES__.store.clear();
    const relogin = await signIn(fdFrom({ nationalId: TEST_NID, password: newPw }));
    ok("3.3 re-login with new password", relogin?.success === true, JSON.stringify(relogin));
  }

  console.log("\n[4] Cleanup synthetic citizen");
  await purgeTestCitizen(admin);
  const { data: gone } = await admin.from("profiles").select("id").eq("national_id", TEST_NID).maybeSingle();
  ok("4.1 test NID purged", !gone?.id);

  await pool.end().catch(() => {});

  console.log(`\n══ Results: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
