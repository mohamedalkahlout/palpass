/**
 * Print the PALPASS master architecture dossier to PDF with the local Chrome binary.
 * Usage: node scripts/generate-pdf-dossier.mjs
 */
import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(root, "PALPASS_Master_Architecture_Dossier.pdf");

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const pages = [
  ["/", "Public", "National landing"],
  ["/about", "Public", "Institutional overview"],
  ["/news", "Public", "Official bulletin feed"],
  ["/privacy", "Public", "Privacy policy"],
  ["/terms", "Public", "Terms of service"],
  ["/services", "Public", "Service catalog"],
  ["/services/government", "Public page", "Civil documents; mutation requires accreditation"],
  ["/services/bills", "Public page", "Bill payment via pay_bill_rpc after confirm"],
  ["/services/violations", "Public page", "Fine payment via pay_violation_rpc after confirm"],
  ["/services/border", "Public page", "Crossing permit via submit_border_permit_rpc"],
  ["/services/hajj", "Public page", "Hajj file; guest clicks open GuestAuthModal"],
  ["/services/licenses", "Public page", "Trade and driving licenses"],
  ["/services/aid", "Public page", "National assistance; gated submit"],
  ["/services/aid-ration", "Public page", "Ration entitlement"],
  ["/services/health-records", "Public page", "MOH record and immunization table"],
  ["/services/healthcare", "Public page", "Facility directory and referrals"],
  ["/services/reports", "Public page", "Incident report; guest clicks are intercepted"],
  ["/services/justice", "Public page", "Justice services"],
  ["/services/education", "Public page", "Tawjihi and equivalency"],
  ["/services/tax-clearance", "Public page", "Revenue clearance certificate"],
  ["/services/family", "Public page", "Civil family booklet"],
  ["/services/complaints", "Public page", "Cabinet complaint; accreditation required to submit"],
  ["/services/tenders", "Public page", "Brochure purchase via purchase_tender_brochure_rpc"],
  ["/services/cabinet-aid", "Public page", "Humanitarian request; accreditation required"],
  ["/services/gazette", "Public", "Official gazette, public read"],
  ["/services/jerusalem-fund", "Public page", "Jerusalem support; accreditation required"],
  ["/charity", "Public page", "Donation via contribute_to_charity_rpc after confirm"],
  ["/jobs", "Public", "Public employment listings"],
  ["/restaurants", "Public", "Establishments directory"],
  ["/restaurants/[id]", "Public", "Establishment detail"],
  ["/transport", "Public", "Accredited transport hub"],
  ["/transport/buses", "Public", "Intercity coaches"],
  ["/transport/taxis", "Public", "Licensed taxi roster"],
  ["/documents", "Public page", "Citizen document locker"],
  ["/appointments", "Public page", "MOH appointments; guest clicks are intercepted"],
  ["/auth/login", "Public auth", "National ID sign-in"],
  ["/auth/register", "Public auth", "Citizen registration"],
  ["/auth/pending", "Public auth", "Registration received"],
  ["/pending", "Public auth", "Accreditation holding page"],
  ["/dashboard", "Session", "Middleware requires a signed-in citizen"],
  ["/profile", "Session", "Middleware requires a signed-in citizen"],
  ["/profile/cv", "Session", "ATS resume builder under /profile"],
  ["/admin", "Admin", "profiles.role must be admin; metadata role is ignored"],
];

const platform = [
  ["/_not-found", "Asset", "Not-found shell"],
  ["/apple-icon.png", "Asset", "Apple touch icon"],
  ["/icon.png", "Asset", "Application icon"],
  ["/manifest.webmanifest", "Asset", "Web app manifest"],
  ["/api/verify", "Public API", "GET field check, 20 requests per minute per IP"],
  ["/auth/callback", "Public auth", "Root auth code exchange"],
];

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function routeRows() {
  const rows = [];
  for (const [path, access, note] of pages) {
    rows.push(["/", path === "/" ? "/" : path, "ar", access, note]);
    rows.push(["/en", path === "/" ? "/en" : `/en${path}`, "en", access, note]);
  }
  for (const [path, access, note] of platform) {
    rows.push(["—", path, "—", access, note]);
  }
  return rows;
}

const compiled = routeRows();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PALPASS Master Architecture Dossier</title>
<style>
  @page {
    size: A4;
    margin: 16mm 13mm 18mm;
    @bottom-center {
      content: "PALPASS  ·  State of Palestine  ·  " counter(page);
      font-family: "Segoe UI", sans-serif;
      font-size: 8.5pt;
      color: #64748b;
    }
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #1c1917;
    font-family: "Segoe UI", "Inter", sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cover {
    page-break-after: always;
    min-height: 250mm;
    background: #064e3b;
    color: #fafaf9;
    padding: 22mm 16mm;
    position: relative;
  }
  .cover .rule { height: 4px; width: 72px; background: #b45309; margin: 18px 0; }
  .kicker {
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-size: 9pt;
    color: #d6d3d1;
  }
  h1 { font-size: 28pt; line-height: 1.15; margin: 0; font-weight: 700; }
  .cover p { max-width: 140mm; color: #e7e5e4; }
  .gold { color: #b45309; }
  h2 {
    font-size: 14pt;
    color: #064e3b;
    border-bottom: 2px solid #b45309;
    padding-bottom: 4px;
    margin: 18px 0 8px;
    page-break-after: avoid;
  }
  h3 { font-size: 12pt; color: #064e3b; margin: 14px 0 6px; page-break-after: avoid; }
  p { margin: 0 0 8px; }
  ul { margin: 0 0 10px; padding-left: 18px; }
  li { margin: 0 0 4px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 14px;
    page-break-inside: auto;
    font-size: 8.4pt;
  }
  thead { display: table-header-group; }
  th {
    background: #064e3b;
    color: #fafaf9;
    text-align: left;
    font-weight: 650;
    padding: 5px 6px;
    border: 1px solid #064e3b;
  }
  td {
    padding: 4px 6px;
    border: 1px solid #e7e5e4;
    vertical-align: top;
  }
  tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #f5f5f4; }
  code, pre {
    font-family: Consolas, "Courier New", monospace;
    font-size: 8pt;
  }
  pre {
    background: #fafaf9;
    border-left: 3px solid #b45309;
    padding: 8px 10px;
    white-space: pre-wrap;
    page-break-inside: avoid;
    margin: 8px 0 12px;
  }
  .note {
    background: #fafaf9;
    border: 1px solid #e7e5e4;
    padding: 8px 10px;
    margin: 8px 0 12px;
  }
  .meta { margin-top: 28px; font-size: 10pt; color: #d6d3d1; }
</style>
</head>
<body>
<section class="cover">
  <div class="kicker">State of Palestine · General Secretariat of the Cabinet</div>
  <div class="rule"></div>
  <h1>PALPASS</h1>
  <p style="font-size:16pt;color:#fafaf9;margin-top:8px;">Master Architecture Dossier</p>
  <p>Palestinian National Digital Identity and Civic Super-App. Sovereign e-governance, cryptographic field verification, and distributed public administration.</p>
  <div class="rule"></div>
  <p>Principal systems architecture, application security, and civic full-stack specification for the production Next.js application.</p>
  <p class="meta">Issued 4 October 2026<br />Emerald #064e3b · Gold #b45309 · Currency ILS</p>
</section>

<h2>1. Meta-instructions and system identity</h2>
<h3>1.1 Operational role</h3>
<p>This document is the ground-truth technical specification for PALPASS. An engineer working in this codebase operates as Principal Systems Architect, Chief Cryptographic Security Officer, and Lead Full-Stack Civic Engineer, in the jurisdiction of the State of Palestine, interfacing with the General Secretariat of the Palestinian Cabinet and the line ministries of Interior, Finance, Health, Transport, Higher Education, and Awqaf.</p>
<p>The core directive is to keep all 92 production build outputs working, follow the DESIGN.md tokens, keep financial mutations inside row-locked stored procedures, keep the production build free of remote font and script hosts, and refuse unauthenticated privilege escalation.</p>
<h3>1.2 Non-negotiable guardrails</h3>
<ul>
  <li><strong>Financial immutability.</strong> Do not bypass, alter, or mock <code>pay_bill_rpc</code>, <code>pay_violation_rpc</code>, <code>submit_border_permit_rpc</code>, <code>purchase_tender_brochure_rpc</code>, or <code>contribute_to_charity_rpc</code>. A client component must never update <code>wallets</code> directly.</li>
  <li><strong>Offline build.</strong> <code>pnpm build</code> must exit 0 with no reference to fonts.googleapis.com, fonts.gstatic.com, or an unpinned public CDN.</li>
  <li><strong>Defense in depth.</strong> A guest cannot commit a mutation. Unauthenticated clicks open <code>GuestAuthModal</code>. Fee-incurring and legally binding actions require <code>SovereignConfirmModal</code>.</li>
  <li><strong>Data isolation.</strong> Private citizen tables (<code>wallets</code>, <code>family_registry</code>, <code>border_permits</code>, <code>citizen_cvs</code>) must not be opened with <code>SELECT USING (true)</code>.</li>
</ul>

<h2>2. System topology</h2>
<p>The platform is a Next.js App Router application with Arabic (default, unprefixed) and English (<code>/en</code>) localization. Message files are paired. Middleware protects <code>/dashboard</code>, <code>/profile</code>, and <code>/admin</code>. Admin authorization reads <code>profiles.role</code> only.</p>
<p>The last production build generated <strong>92 pages</strong>. The table below is that inventory: 43 localized surfaces for Arabic and English (86) plus 6 platform outputs.</p>
<table>
  <thead>
    <tr><th>#</th><th>Path</th><th>Locale</th><th>Access</th><th>Duty</th></tr>
  </thead>
  <tbody>
    ${compiled.map((row, index) => `<tr><td>${index + 1}</td><td><code>${esc(row[1])}</code></td><td>${esc(row[2])}</td><td>${esc(row[3])}</td><td>${esc(row[4])}</td></tr>`).join("")}
  </tbody>
</table>
<p class="note">Compiled count: ${compiled.length}. Desktop navigation is a single row from 1180px. Below that width, secondary links move into the off-canvas drawer. The crest and the citizen identity pill stay <code>shrink-0</code>.</p>

<h2>3. Database schematics and concurrency</h2>
<p>All entities live in PostgreSQL reached through the Supabase IPv4 session pooler. Wallet time is stored in <code>last_updated</code>. Financial deductions take <code>FOR UPDATE</code> on the wallet row before changing the balance.</p>
<h3>3.1 Specified entities</h3>
<table>
  <thead><tr><th>Entity</th><th>Duty</th><th>Integrity</th></tr></thead>
  <tbody>
    <tr><td><code>profiles</code></td><td>Demographic record and role</td><td>9-digit national ID, role citizen or admin</td></tr>
    <tr><td><code>wallets</code></td><td>ILS balance</td><td>Non-negative balance, one row per citizen, <code>last_updated</code></td></tr>
    <tr><td><code>border_permits</code></td><td>Crossing clearance</td><td>Fee fixed at 170.00 inside the RPC; direct writes revoked from anon and authenticated</td></tr>
    <tr><td><code>public_tenders</code></td><td>Cabinet procurement</td><td>Category works, supplies, consulting, or it_systems</td></tr>
    <tr><td><code>tender_purchases</code></td><td>Brochure voucher</td><td>Unique citizen and tender; token prefix BOU-TND-</td></tr>
    <tr><td><code>citizen_cvs</code></td><td>ATS resume</td><td>One active resume per citizen; professional or academic template</td></tr>
  </tbody>
</table>
<pre>${esc(`CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  national_id VARCHAR(9) UNIQUE NOT NULL CHECK (national_id ~ '^\\d{9}$'),
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  governorate VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
  currency VARCHAR(3) NOT NULL DEFAULT 'ILS',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('works', 'supplies', 'consulting', 'it_systems')),
  brochure_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  estimated_value NUMERIC(14,2) NOT NULL,
  submission_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_evaluation', 'awarded', 'cancelled')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE border_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permit_number VARCHAR(64) UNIQUE NOT NULL,
  crossing_point VARCHAR(50) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 170.00,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
  status VARCHAR(50) NOT NULL DEFAULT 'under_security_clearance',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE citizen_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL DEFAULT 'professional',
  personal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  work_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  academic_publications JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`)}</pre>
<h3>3.2 Atomic brochure purchase</h3>
<p>The purchase routine validates the open tender, rejects a second purchase, locks the wallet with <code>FOR UPDATE</code>, debits <code>brochure_price</code>, writes <code>last_updated</code>, and returns a <code>BOU-TND-</code> voucher. Execution is granted only to <code>service_role</code>.</p>
<pre>${esc(`CREATE OR REPLACE FUNCTION purchase_tender_brochure_rpc(
  p_user_id UUID,
  p_tender_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC(10,2);
  v_price NUMERIC(10,2);
  v_status TEXT;
  v_token TEXT;
BEGIN
  SELECT brochure_price, status INTO v_price, v_status
  FROM public_tenders WHERE id = p_tender_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tender not found');
  END IF;
  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tender bidding is closed');
  END IF;
  IF EXISTS (
    SELECT 1 FROM tender_purchases
    WHERE user_id = p_user_id AND tender_id = p_tender_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Brochure already purchased');
  END IF;
  SELECT balance INTO v_balance FROM wallets
  WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  UPDATE wallets
  SET balance = balance - v_price, last_updated = NOW()
  WHERE user_id = p_user_id;
  v_token := 'BOU-TND-' || upper(substr(md5(random()::text), 1, 8));
  INSERT INTO tender_purchases (user_id, tender_id, purchase_token, amount_paid)
  VALUES (p_user_id, p_tender_id, v_token, v_price);
  RETURN jsonb_build_object(
    'success', true,
    'purchase_token', v_token,
    'new_balance', v_balance - v_price
  );
END;
$$;`)}</pre>
<pre>${esc(`REVOKE ALL ON FUNCTION public.purchase_tender_brochure_rpc(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_tender_brochure_rpc(UUID, UUID) TO service_role;`)}</pre>
<table>
  <thead><tr><th>Procedure</th><th>anon EXECUTE</th><th>authenticated EXECUTE</th><th>service_role EXECUTE</th></tr></thead>
  <tbody>
    ${["pay_bill_rpc", "pay_violation_rpc", "contribute_to_charity_rpc", "submit_border_permit_rpc", "purchase_tender_brochure_rpc"]
      .map((name) => `<tr><td><code>${name}</code></td><td>false</td><td>false</td><td>true</td></tr>`)
      .join("")}
  </tbody>
</table>
<p><code>assert_actor_or_service</code> returns immediately for a <code>service_role</code> JWT, rejects a null <code>auth.uid()</code> or an <code>anon</code> role, and rejects a caller whose identity does not match the target citizen.</p>

<h2>4. Security posture</h2>
<h3>4.1 Response headers</h3>
<table>
  <thead><tr><th>Header</th><th>Value</th><th>Effect</th></tr></thead>
  <tbody>
    <tr><td>X-Frame-Options</td><td>DENY</td><td>Blocks framing and clickjacking</td></tr>
    <tr><td>X-Content-Type-Options</td><td>nosniff</td><td>Blocks MIME sniffing</td></tr>
    <tr><td>Referrer-Policy</td><td>strict-origin-when-cross-origin</td><td>Limits referrer leakage</td></tr>
    <tr><td>Permissions-Policy</td><td>camera=(), microphone=(), geolocation=(), browsing-topics=()</td><td>Disables those sensors</td></tr>
  </tbody>
</table>
<pre>${esc(`default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://*.supabase.co;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://*.pooler.supabase.com wss://*.supabase.co;
frame-ancestors 'none';
object-src 'none';
base-uri 'self';`)}</pre>
<h3>4.2 Field verification</h3>
<p><code>GET /api/verify</code> accepts a 9-digit <code>national_id</code> or <code>id</code>, or a token. The handler uses the service role and returns only the masked projection. Missing, malformed, or inactive identities answer HTTP 404. The response is <code>Cache-Control: no-store</code>. The in-memory limit is 20 requests per 60 seconds per IP, then HTTP 429.</p>
<pre>${esc(`{
  "valid": true,
  "full_name": "المواطن المعتمد",
  "national_id_masked": "***-***-773",
  "governorate": "غزة",
  "status": "active",
  "is_verified": true,
  "issued_at": "2026-01-01T00:00:00Z"
}`)}</pre>

<h2>5. Design tokens</h2>
<table>
  <thead><tr><th>Token</th><th>Value</th><th>Use</th></tr></thead>
  <tbody>
    <tr><td>Sovereign emerald</td><td>#064e3b</td><td>Authority surfaces and smart cards</td></tr>
    <tr><td>Interactive emerald</td><td>#047857</td><td>Buttons, active states, progress</td></tr>
    <tr><td>Parchment</td><td>#fafaf9 / #f5f5f4</td><td>Paper backgrounds</td></tr>
    <tr><td>Charcoal</td><td>#1c1917</td><td>Body text</td></tr>
    <tr><td>Slate</td><td>#334155 / #64748b</td><td>Secondary text</td></tr>
    <tr><td>Sovereign gold</td><td>#b45309</td><td>Crests, stamps, official current steps</td></tr>
    <tr><td>Seal gold</td><td>#d97706</td><td>Seal highlights</td></tr>
    <tr><td>Flag red</td><td>#dc2626</td><td>Unpaid balances and destructive confirmation</td></tr>
  </tbody>
</table>
<p>Bright amber is reserved for warning alerts, including the pending-accreditation banner. <code>TatreezDivider</code> draws a low-opacity Palestinian cross-stitch rule between structural sections. Motion uses a 250ms ease of cubic-bezier(0.16, 1, 0.3, 1), and reduced-motion preferences remove the lift.</p>

<h2>6. Ground-truth fixtures</h2>
<h3>6.1 Authority account</h3>
<table>
  <thead><tr><th>Field</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>National ID</td><td>407926773</td></tr>
    <tr><td>Password</td><td>PalPassAdmin#2026</td></tr>
    <tr><td>Role / status</td><td>admin / active, verified</td></tr>
    <tr><td>Wallet</td><td>Positive ILS balance</td></tr>
    <tr><td>Tawjihi</td><td>Scientific stream, seat GAZ-2010-4079, 94.60%</td></tr>
    <tr><td>Degree</td><td>Birzeit University, B.Sc. Computer Systems Engineering</td></tr>
    <tr><td>License</td><td>Class B private, expiry 2030, blood type O+, 0 demerit points</td></tr>
    <tr><td>Vehicle</td><td>Skoda Octavia 2.0 TDI (2023), plate 3-4079-90</td></tr>
    <tr><td>Family book</td><td>Spouse and two dependent children</td></tr>
    <tr><td>Jerusalem case</td><td>JLM-RES-SEED4079, Old City, Aqabat Al-Khaldiyya</td></tr>
  </tbody>
</table>
<h3>6.2 Accredited citizen</h3>
<p>National ID 556677889, role citizen, status active, verified. Records include a commercial taxi license and a confirmed Ministry of Health referral.</p>
<h3>6.3 Institutional geography</h3>
<ul>
  <li>Hospitals: Al-Shifa Medical Complex (Gaza), Palestine Medical Complex (Ramallah), Rafidia Surgical Hospital (Nablus), Makassed Islamic Charitable Hospital (Jerusalem), Augusta Victoria / Al-Mutlaa (Jerusalem).</li>
  <li>Transport: Saraya Central Terminal (Gaza), Al-Bireh Central Station (Ramallah), Nablus Western Station.</li>
  <li>Utilities: Jerusalem District Electricity Co. (JDECO), Jerusalem Water Undertaking (JWU), Gaza Electricity Distribution Co. (GEDCO).</li>
</ul>
</body>
</html>`;

function findBrowser() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      statSync(candidate);
      return candidate;
    } catch {
      /* try the next installed browser */
    }
  }
  return null;
}

function runBrowser(binary, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Browser print timed out"));
    }, 60000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(`Browser exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

const browser = findBrowser();
if (!browser) {
  console.error("Chrome or Edge was not found.");
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "palpass-dossier-"));
const htmlPath = join(work, "dossier.html");
const pdfPath = join(work, "dossier.pdf");
const profile = join(work, "profile");

try {
  writeFileSync(htmlPath, html, "utf8");
  if (compiled.length !== 92) {
    throw new Error(`Route inventory is ${compiled.length}, expected 92`);
  }
  await runBrowser(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--user-data-dir=${profile}`,
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ]);
  const size = statSync(pdfPath).size;
  if (size < 10000) throw new Error(`PDF is unexpectedly small (${size} bytes)`);
  copyFileSync(pdfPath, outputPath);
  console.log(JSON.stringify({
    ok: true,
    path: outputPath,
    bytes: statSync(outputPath).size,
    routes: compiled.length,
    browser,
  }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
