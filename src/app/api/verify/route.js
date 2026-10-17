import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const NOT_FOUND = {
  valid: false,
  error: "وثيقة الهوية غير مسجلة أو غير معتمدة رسمياً",
};

const WINDOW_MS = 60_000;
const MAX_LOOKUPS = 20;
const MAX_TRACKED_IPS = 10_000;
const hits = new Map();

function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0].trim();
  return first || request.headers.get("x-real-ip") || "local";
}

function isLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_LOOKUPS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > MAX_TRACKED_IPS) {
    const oldest = hits.keys().next().value;
    hits.delete(oldest);
  }
  return false;
}

function nineDigitId(value) {
  const text = String(value || "").trim();
  return /^\d{9}$/.test(text) ? text : null;
}

function nationalIdFromToken(token) {
  const text = String(token || "").trim();
  const direct = nineDigitId(text);
  if (direct) return { nationalId: direct, borderToken: null };
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      const nested = nineDigitId(parsed?.id || parsed?.national_id);
      if (nested) return { nationalId: nested, borderToken: null };
    } catch {
      return { nationalId: null, borderToken: null };
    }
  }
  if (/^PAL-[A-Z0-9-]{8,80}$/i.test(text)) {
    return { nationalId: null, borderToken: text };
  }
  return { nationalId: null, borderToken: null };
}

function maskedPayload(profile) {
  const nationalId = String(profile.national_id || "");
  return {
    valid: true,
    full_name: profile.full_name,
    national_id_masked: `***-***-${nationalId.slice(-3)}`,
    governorate: profile.governorate,
    status: profile.status,
    is_verified: profile.is_verified,
    issued_at: profile.created_at,
  };
}

function json(body, status) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(request) {
  if (isLimited(clientIp(request))) {
    return json({ valid: false, error: "تم تجاوز عدد محاولات التحقق. أعد المحاولة بعد دقيقة." }, 429);
  }

  const { searchParams } = new URL(request.url);
  const nationalId = nineDigitId(searchParams.get("national_id") || searchParams.get("id"));
  const tokenLookup = nationalId ? null : nationalIdFromToken(searchParams.get("token"));
  const lookupId = nationalId || tokenLookup?.nationalId || null;
  const borderToken = tokenLookup?.borderToken || null;

  if (!lookupId && !borderToken) {
    return json(NOT_FOUND, 404);
  }

  try {
    const admin = createAdminClient();
    let profileQuery = admin
      .from("profiles")
      .select("full_name, national_id, governorate, status, is_verified, created_at");

    if (lookupId) {
      profileQuery = profileQuery.eq("national_id", lookupId);
    } else {
      const { data: permit, error: permitError } = await admin
        .from("border_permits")
        .select("user_id")
        .eq("qr_token", borderToken)
        .maybeSingle();
      if (permitError || !permit?.user_id) return json(NOT_FOUND, 404);
      profileQuery = profileQuery.eq("id", permit.user_id);
    }

    const { data: profile, error } = await profileQuery.maybeSingle();
    if (error || !profile || profile.status !== "active") {
      return json(NOT_FOUND, 404);
    }

    return json(maskedPayload(profile), 200);
  } catch {
    return json({ valid: false, error: "تعذر إتمام التحقق حالياً." }, 500);
  }
}
