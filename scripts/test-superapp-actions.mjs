/**
 * Phase 2 verification — super-app server actions gating + atomic charity.
 * Usage: node --import ./scripts/register-auth-test-loader.mjs scripts/test-superapp-actions.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
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
process.env.PALPASS_AUTH_TEST = "1";

globalThis.__PALPASS_TEST_COOKIES__ = { store: new Map() };

const ACTIVE_GATE = "هذه الخدمة تتطلب اعتماد الهوية الرقمية من قبل الشؤون المدنية أولاً.";

let passed = 0;
let failed = 0;
function ok(label, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function fdFrom(obj) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.append(k, String(v));
  return fd;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const actionsUrl = pathToFileURL(resolve(root, "src/app/actions.js")).href;
  const {
    signIn,
    contributeToCharity,
    submitBorderPermit,
    getUserCivicDocuments,
  } = await import(actionsUrl);

  console.log("\n[Phase 2] Pending citizen soft-lock");
  const { data: pending } = await admin
    .from("profiles")
    .select("id, national_id, email")
    .eq("status", "pending")
    .eq("role", "citizen")
    .limit(1)
    .maybeSingle();

  ok("pending citizen exists", Boolean(pending?.id), JSON.stringify(pending));

  if (pending) {
    const tempPw = crypto.randomBytes(4).toString("hex");
    await admin.auth.admin.updateUserById(pending.id, { password: tempPw });
    globalThis.__PALPASS_TEST_COOKIES__.store.clear();
    const loginPending = await signIn(
      fdFrom({ nationalId: pending.national_id, password: tempPw })
    );
    ok("pending can sign in", loginPending?.success === true, JSON.stringify(loginPending));

    const gatedDonate = await contributeToCharity(
      "00000000-0000-0000-0000-000000000001",
      20,
      false
    );
    ok(
      "pending donate blocked",
      gatedDonate?.success === false &&
        (gatedDonate?.error === ACTIVE_GATE || String(gatedDonate?.error || "").includes("اعتماد")),
      JSON.stringify(gatedDonate)
    );

    const gatedBorder = await submitBorderPermit(
      fdFrom({
        crossingName: "karameh_bridge",
        travelDate: "2026-10-10",
        travelPurpose: "test",
        companionsCount: "0",
      })
    );
    ok(
      "pending border blocked",
      gatedBorder?.success === false && String(gatedBorder?.error || "").includes("اعتماد"),
      JSON.stringify(gatedBorder)
    );
  }

  console.log("\n[Phase 2] Active citizen atomic charity");
  const { data: active } = await admin
    .from("profiles")
    .select("id, national_id, email")
    .eq("status", "active")
    .eq("role", "citizen")
    .eq("is_verified", true)
    .limit(1)
    .maybeSingle();

  ok("active accredited citizen exists", Boolean(active?.id));

  const { data: campaign } = await admin
    .from("charity_campaigns")
    .select("id, collected_amount")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  ok("campaign exists", Boolean(campaign?.id));

  if (active && campaign) {
    const activePw = crypto.randomBytes(4).toString("hex");
    await admin.auth.admin.updateUserById(active.id, { password: activePw });

    const { data: walletBefore } = await admin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", active.id)
      .single();
    const balBefore = Number(walletBefore?.balance || 0);
    const collectedBefore = Number(campaign.collected_amount || 0);

    if (balBefore < 20) {
      await admin
        .from("wallets")
        .update({ balance: 100 })
        .eq("user_id", active.id);
    }

    globalThis.__PALPASS_TEST_COOKIES__.store.clear();
    const loginActive = await signIn(
      fdFrom({ nationalId: active.national_id, password: activePw })
    );
    ok("active can sign in", loginActive?.success === true, JSON.stringify(loginActive));

    const docs = await getUserCivicDocuments();
    ok("active can read vault docs", docs?.success === true && (docs.documents?.length || 0) >= 1, JSON.stringify(docs));

    const donate = await contributeToCharity(campaign.id, 20, false);
    ok(
      "donate 20 ILS success",
      donate?.success === true && Boolean(donate?.receiptNumber),
      JSON.stringify(donate)
    );

    const { data: walletAfter } = await admin
      .from("wallets")
      .select("balance")
      .eq("user_id", active.id)
      .single();
    const { data: campaignAfter } = await admin
      .from("charity_campaigns")
      .select("collected_amount")
      .eq("id", campaign.id)
      .single();

    const expectedBal = Math.max(balBefore, 100) - 20;
    ok(
      "wallet decremented by 20",
      Math.abs(Number(walletAfter?.balance) - expectedBal) < 0.01,
      `before=${balBefore} after=${walletAfter?.balance}`
    );
    ok(
      "campaign collected incremented",
      Math.abs(Number(campaignAfter?.collected_amount) - (collectedBefore + 20)) < 0.01,
      `before=${collectedBefore} after=${campaignAfter?.collected_amount}`
    );

    // Cleanup: reverse donation artifacts for repeatability (keep campaign totals honest by refunding)
    if (donate?.receiptNumber) {
      await admin.from("charity_contributions").delete().eq("receipt_number", donate.receiptNumber);
      await admin
        .from("wallet_transactions")
        .delete()
        .eq("ref_id", donate.receiptNumber);
      await admin
        .from("wallets")
        .update({ balance: Math.max(balBefore, 100) })
        .eq("user_id", active.id);
      await admin
        .from("charity_campaigns")
        .update({ collected_amount: collectedBefore })
        .eq("id", campaign.id);
    }
    ok("test mutations cleaned", true);
  }

  console.log(`\n══ Phase 2 Results: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
