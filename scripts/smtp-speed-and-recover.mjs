/**
 * SMTP 587 speed probe + recover Jam citizen credentials.
 * Finds profile by phone 0594612222 (or name), resets Auth password, emails via STARTTLS 587.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import crypto from "node:crypto";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const smtpUser = process.env.SMTP_USER;
const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const smtpPort = String(process.env.SMTP_PORT || "");
const smtpSecure = String(process.env.SMTP_SECURE || "");

console.log("Env SMTP_PORT=", smtpPort, "| SMTP_SECURE=", smtpSecure);
if (smtpPort !== "587" || smtpSecure === "true") {
  console.error("ABORT: .env.local must be SMTP_PORT=587 and SMTP_SECURE=false");
  process.exit(1);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
    tls: { rejectUnauthorized: false, minVersion: "TLSv1.2" },
  });
}

async function sendMail(to, password, nationalId) {
  const started = Date.now();
  const info = await createTransporter().sendMail({
    from: `"منظومة الهوية الرقمية الفلسطينية — PALPASS" <${smtpUser}>`,
    to,
    subject: "PALPASS | بيانات الدخول المعتمدة — دولة فلسطين",
    text: `المواطن صاحب الهوية :#${nationalId} , هذه كلمة السر الجديدة : ${password}`,
    html: `<div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;padding:24px;text-align:center">
      <h2 style="color:#064e3b">PALPASS — كلمة المرور السيادية</h2>
      <p>الهوية: <strong>#${nationalId}</strong></p>
      <p style="font-size:22px;font-family:monospace;background:#064e3b;color:#fff;display:inline-block;padding:12px 24px;border-radius:8px">${password}</p>
    </div>`,
  });
  return { messageId: info.messageId, elapsedMs: Date.now() - started };
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("\n[1] Speed probe (587 STARTTLS)…");
const probePass = crypto.randomBytes(4).toString("hex");
const probeTo = process.env.SMTP_PROBE_TO || smtpUser;
let probe;
try {
  probe = await sendMail(probeTo, probePass, "000000000");
  console.log("  Probe OK →", probeTo, "| MsgId:", probe.messageId, "| elapsedMs:", probe.elapsedMs);
  if (probe.elapsedMs > 5000) {
    console.warn("  WARNING: probe slower than 5s (target <2s under ideal network).");
  }
} catch (err) {
  console.error("  Probe FAILED:", err.message);
  console.error("  Port 587 reached Gmail (no 30s ETIMEDOUT). Auth/config must be fixed.");
  probe = { elapsedMs: null, error: err.message };
}

console.log("\n[2] Locate Jam citizen (phone 0594612222 / name)…");
let { data: profiles, error } = await admin
  .from("profiles")
  .select("id, national_id, full_name, email, phone, governorate, status")
  .eq("phone", "0594612222");

if (error) {
  console.error("Profile query failed:", error.message);
  process.exit(1);
}

if (!profiles?.length) {
  const byName = await admin
    .from("profiles")
    .select("id, national_id, full_name, email, phone, governorate, status")
    .ilike("full_name", "%محمد حسن حسن%");
  profiles = byName.data || [];
}

if (!profiles.length) {
  console.error("Citizen not found. Registration may have used a different phone/NID.");
  process.exit(1);
}

const citizen = profiles[0];
console.log("  Found:", {
  name: citizen.full_name,
  nid: citizen.national_id,
  email: citizen.email,
  phone: citizen.phone,
  governorate: citizen.governorate,
  status: citizen.status,
});

const newPassword = crypto.randomBytes(4).toString("hex");
console.log("\n[3] Reset Auth password + resend email…");
const { error: updErr } = await admin.auth.admin.updateUserById(citizen.id, {
  password: newPassword,
});
if (updErr) {
  console.error("Password update failed:", updErr.message);
  process.exit(1);
}

console.log("  Auth password reset OK");
console.log("  National ID:", citizen.national_id);
console.log("  Email:", citizen.email);
console.log("  New password:", newPassword);

try {
  const delivery = await sendMail(citizen.email, newPassword, citizen.national_id);
  console.log("  Delivered MsgId:", delivery.messageId);
  console.log("  SMTP elapsedMs:", delivery.elapsedMs);
  if (delivery.elapsedMs <= 2000) {
    console.log("\nPASS: SMTP under 2 seconds.");
  } else if (delivery.elapsedMs <= 5000) {
    console.log("\nACCEPTABLE: SMTP under 5 seconds (network variance).");
  } else {
    console.log("\nSLOW: SMTP over 5 seconds.");
    process.exitCode = 2;
  }
} catch (err) {
  console.error("  EMAIL SEND FAILED:", err.message);
  console.error("  Citizen can still sign in with National ID + password printed above.");
  console.error("  Fix Gmail App Password (535 BadCredentials), then re-run this script.");
  process.exitCode = 3;
}

console.log("\nDONE. Use National ID + password at /auth/login");
