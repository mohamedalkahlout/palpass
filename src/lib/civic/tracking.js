import { createAdminClient } from "@/lib/supabase/admin";

const KINDS = ["cabinet", "border", "tax", "education"];

const PREFIXES = [
  ["cabinet", /^PAL-?CAB/i],
  ["border", /^REF-?BOR/i],
  ["tax", /^PAL-?TAX/i],
  ["education", /^PAL-?EDU/i],
];

const SAFE_REF = /^[A-Z0-9_-]{1,120}$/;

const WINDOW_MS = 60_000;
const MAX_LOOKUPS = 20;
const MAX_TRACKED_IPS = 10_000;
const hits = new Map();

function isRateLimited(clientIp) {
  const key = clientIp || "local";
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_LOOKUPS) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_TRACKED_IPS) {
    const oldest = hits.keys().next().value;
    hits.delete(oldest);
  }
  return false;
}

export function detectKind(reference) {
  const ref = String(reference || "").trim();
  if (!ref) return null;
  const found = PREFIXES.find(([, pattern]) => pattern.test(ref));
  return found ? found[0] : null;
}

export function normalizeReference(reference) {
  return String(reference || "").trim().toUpperCase().replace(/\s+/g, "");
}

const CABINET_STAGES = {
  submitted: { stage: 0, statusKey: "pending" },
  under_ministerial_review: { stage: 1, statusKey: "pending" },
  resolved: { stage: 2, statusKey: "resolved" },
  dismissed: { stage: 2, statusKey: "rejected" },
};

function cabinetState(status) {
  return CABINET_STAGES[status] || { stage: 0, statusKey: "pending" };
}

function borderState(status) {
  const value = String(status || "").toLowerCase();
  if (["approved", "issued", "valid", "completed", "active"].includes(value)) {
    return { stage: 2, statusKey: "active" };
  }
  if (["rejected", "cancelled", "expired", "denied"].includes(value)) {
    return { stage: 2, statusKey: "rejected" };
  }
  if (["under_review", "review", "paid", "pending"].includes(value)) {
    return { stage: 1, statusKey: "pending" };
  }
  return { stage: 0, statusKey: "pending" };
}

function educationState(status) {
  const value = String(status || "").toLowerCase();
  if (["certified", "verified", "approved"].includes(value)) {
    return { stage: 2, statusKey: "active" };
  }
  if (["rejected", "revoked"].includes(value)) {
    return { stage: 2, statusKey: "rejected" };
  }
  return { stage: 1, statusKey: "pending" };
}

async function lookupCabinet(admin, ref) {
  const { data, error } = await admin
    .from("cabinet_complaints")
    .select("tracking_code, targeted_ministry, subject, details, status, sla_due_date, created_at")
    .eq("tracking_code", ref)
    .maybeSingle();
  if (error || !data) return null;
  const state = cabinetState(data.status);
  return {
    kind: "cabinet",
    reference: data.tracking_code,
    title: data.targeted_ministry || null,
    subject: data.subject || null,
    detail: data.details || null,
    stage: state.stage,
    statusKey: state.statusKey,
    slaDue: data.sla_due_date || null,
    createdAt: data.created_at || null,
  };
}

async function lookupBorder(admin, ref) {
  if (!SAFE_REF.test(ref)) return null;
  const { data, error } = await admin
    .from("border_permits")
    .select("clearance_tracking_code, permit_number, crossing_name, crossing, travel_purpose, status, sla_due_date, created_at")
    .or(`clearance_tracking_code.eq.${ref},permit_number.eq.${ref}`)
    .maybeSingle();
  if (error || !data) return null;
  const state = borderState(data.status);
  return {
    kind: "border",
    reference: data.clearance_tracking_code || data.permit_number || ref,
    title: data.crossing_name || data.crossing || null,
    subject: data.travel_purpose || null,
    detail: null,
    stage: state.stage,
    statusKey: state.statusKey,
    slaDue: data.sla_due_date || null,
    createdAt: data.created_at || null,
  };
}

async function lookupTax(admin, ref) {
  const { data, error } = await admin
    .from("tax_clearance_certificates")
    .select("clearance_code, purpose, valid_until, issued_at")
    .eq("clearance_code", ref)
    .maybeSingle();
  if (error || !data) return null;
  const expired = data.valid_until ? new Date(data.valid_until) < new Date() : false;
  return {
    kind: "tax",
    reference: data.clearance_code,
    title: data.purpose || null,
    subject: null,
    detail: null,
    stage: 2,
    statusKey: expired ? "resolved" : "active",
    slaDue: data.valid_until || null,
    createdAt: data.issued_at || null,
  };
}

async function lookupEducation(admin, ref) {
  const { data, error } = await admin
    .from("education_records")
    .select("verification_token, institution_name, degree_or_stream, completion_year, status, created_at")
    .eq("verification_token", ref)
    .maybeSingle();
  if (error || !data) return null;
  const state = educationState(data.status);
  return {
    kind: "education",
    reference: data.verification_token,
    title: data.institution_name || null,
    subject: data.degree_or_stream || null,
    detail: data.completion_year ? String(data.completion_year) : null,
    stage: state.stage,
    statusKey: state.statusKey,
    slaDue: null,
    createdAt: data.created_at || null,
  };
}

const LOOKUPS = {
  cabinet: lookupCabinet,
  border: lookupBorder,
  tax: lookupTax,
  education: lookupEducation,
};

export async function lookupTracking(reference, clientIp) {
  const ref = normalizeReference(reference);
  const kind = detectKind(ref);
  if (!kind || !KINDS.includes(kind) || !SAFE_REF.test(ref)) {
    return { found: false, reason: "invalid_format", reference: ref, kind: null };
  }
  if (isRateLimited(clientIp)) {
    return { found: false, reason: "rate_limited", reference: ref, kind };
  }
  try {
    const admin = createAdminClient();
    const record = await LOOKUPS[kind](admin, ref);
    if (!record) {
      return { found: false, reason: "not_found", reference: ref, kind };
    }
    return { found: true, kind, ...record };
  } catch {
    return { found: false, reason: "unavailable", reference: ref, kind };
  }
}