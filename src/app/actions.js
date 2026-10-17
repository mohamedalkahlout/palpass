"use server";

/**
 * PALPASS — Server Actions
 * All mutations that touch Supabase happen here (server-side).
 * These are Next.js Server Actions — called from Client Components via `action={...}` or direct call.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import crypto from "node:crypto";

const ARABIC_FULL_NAME = /^[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){2,}$/;
const PALESTINIAN_PHONE = /^05[69]\d{7}$/;
const ALLOWED_DOC_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const FORGOT_GENERIC_MESSAGE =
  "إذا كان رقم الهوية مسجلاً لدينا، فستصلك كلمة المرور الجديدة إلى بريدك الإلكتروني.";
const FORGOT_SENT_MESSAGE =
  "تم تعيين كلمة سر جديدة وإرسالها إلى بريدك الإلكتروني بنجاح.";

function smtpIdentity() {
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!user || !pass) return null;
  return { user, pass };
}

/** Pooled STARTTLS on 587 only — never use port 465 on this network. */
let mailTransporter;
function getMailTransporter() {
  const identity = smtpIdentity();
  if (!identity) return null;
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      pool: true,
      maxConnections: 3,
      auth: identity,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 4000,
    });
  }
  return mailTransporter;
}

function maskEmailForHandoff(email) {
  const trimmed = String(email || "").trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 2) {
    return `${local[0] || ""}••@${domain}`;
  }
  const middle = "•".repeat(Math.min(8, Math.max(1, local.length - 2)));
  return `${local[0]}${middle}${local[local.length - 1]}@${domain}`;
}

const registerSchema = z.object({
  email: z.string().email("يرجى إدخال بريد إلكتروني صالح."),
  nationalId: z.string().regex(/^\d{9}$/, "رقم الهوية الوطنية يجب أن يتكون من 9 أرقام."),
  fullName: z
    .string()
    .regex(ARABIC_FULL_NAME, "الاسم الرباعي يجب أن يتكون من ثلاثة مقاطع عربية على الأقل."),
  phone: z.string().regex(PALESTINIAN_PHONE, "رقم الهاتف يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام."),
  city: z.string().min(1, "يرجى اختيار المدينة."),
  governorate: z.string().min(1, "يرجى اختيار المحافظة."),
});

function firstZodIssue(error) {
  return error?.issues?.[0]?.message || error?.errors?.[0]?.message || "بيانات غير صالحة.";
}

const PROFILE_ROLES = new Set(["citizen", "admin", "moderator"]);

function normalizeProfileRole(role) {
  return PROFILE_ROLES.has(role) ? role : "citizen";
}

async function syncAuthRole(adminClient, userId, role, extra = {}) {
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...extra,
      role: normalizeProfileRole(role),
    },
  });
  if (error) {
    console.error("syncAuthRole:", error.message);
  }
}

async function sendAccreditationEmail({ email, fullName, nationalId }) {
  const smtpUser = smtpIdentity()?.user;
  const transport = getMailTransporter();
  if (!smtpUser || !transport) return { success: false, error: "MAIL_UNCONFIGURED" };
  const subject = "PALPASS | اعتماد الهوية الرقمية الوطنية الموحدة — دولة فلسطين";
  const text = `أخي المواطن / أختي المواطنة: ${fullName}،
رقم الهوية: #${nationalId}
يسر الهيئة العامة للشؤون المدنية إعلامكم باعتماد هويتكم الرقمية بنجاح ومطابقة الملامح الرسمية.
تم تفعيل بطاقة الهوية الرقمية ومحفظتكم الوطنية، وبات بإمكانكم الآن الاستفادة من كافة المعاملات الحكومية والخدمات المالية.`;
  const html = `<div dir="rtl" style="font-family: Arial, Tahoma, sans-serif; background-color: #f8fafc; padding: 32px 20px; text-align: center;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="display: inline-block; background: #064e3b; color: #ffffff; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: bold; margin-bottom: 20px;">دولة فلسطين — الشؤون المدنية</div>
    <h2 style="color: #064e3b; margin: 0 0 16px; font-size: 20px;">اعتماد الهوية الرقمية الوطنية الموحدة</h2>
    <p style="color: #334155; font-size: 15px; line-height: 1.8; margin: 0 0 16px; text-align: right;">
      أخي المواطن / أختي المواطنة: <strong>${fullName}</strong><br/>
      رقم الهوية: <strong>#${nationalId}</strong>
    </p>
    <p style="color: #334155; font-size: 15px; line-height: 1.8; margin: 0; text-align: right;">
      يسر الهيئة العامة للشؤون المدنية إعلامكم باعتماد هويتكم الرقمية بنجاح ومطابقة الملامح الرسمية.<br/><br/>
      تم تفعيل بطاقة الهوية الرقمية ومحفظتكم الوطنية، وبات بإمكانكم الآن الاستفادة من كافة المعاملات الحكومية والخدمات المالية.
    </p>
  </div>
</div>`;

  try {
    const info = await transport.sendMail({
      from: `"منظومة الهوية الرقمية الفلسطينية — PALPASS" <${smtpUser}>`,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`[PALPASS ACCREDITATION MAIL] To: ${email} | NID: ${nationalId} | MsgId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[PALPASS ACCREDITATION SMTP ERROR]", err.message);
    return { success: false, error: TX_FAILED };
  }
}

async function sendRejectionEmail({ email, fullName, nationalId, reason }) {
  const smtpUser = smtpIdentity()?.user;
  const transport = getMailTransporter();
  if (!smtpUser || !transport) return { success: false, error: "MAIL_UNCONFIGURED" };
  const safeReason =
    reason ||
    "تعذر مطابقة ملامح الوجه مع وثيقة الهوية. يرجى إعادة التقديم بوثائق أوضح.";
  const subject = "PALPASS | نتيجة مراجعة الهوية الرقمية — دولة فلسطين";
  const text = `أخي المواطن / أختي المواطنة: ${fullName}،
رقم الهوية: #${nationalId}
نأسف لإبلاغكم بأن طلب اعتماد هويتكم الرقمية لم يُقبل في هذه المرحلة.
سبب الرفض: ${safeReason}
يرجى مراجعة الشؤون المدنية وإعادة رفع وثائق أوضح عند الحاجة.`;
  const html = `<div dir="rtl" style="font-family: Arial, Tahoma, sans-serif; background-color: #f8fafc; padding: 32px 20px; text-align: center;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="display: inline-block; background: #7f1d1d; color: #ffffff; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: bold; margin-bottom: 20px;">دولة فلسطين — الشؤون المدنية</div>
    <h2 style="color: #7f1d1d; margin: 0 0 16px; font-size: 20px;">نتيجة مراجعة الهوية الرقمية</h2>
    <p style="color: #334155; font-size: 15px; line-height: 1.8; margin: 0 0 16px; text-align: right;">
      أخي المواطن / أختي المواطنة: <strong>${fullName}</strong><br/>
      رقم الهوية: <strong>#${nationalId}</strong>
    </p>
    <p style="color: #334155; font-size: 15px; line-height: 1.8; margin: 0 0 16px; text-align: right;">
      نأسف لإبلاغكم بأن طلب اعتماد هويتكم الرقمية لم يُقبل في هذه المرحلة.
    </p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; text-align: right; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
      <strong>سبب الرفض:</strong><br/>${safeReason}
    </div>
    <p style="color: #64748b; font-size: 13px; margin: 20px 0 0; text-align: right; line-height: 1.5;">
      يرجى مراجعة الشؤون المدنية وإعادة رفع وثائق أوضح عند الحاجة.
    </p>
  </div>
</div>`;

  try {
    const info = await transport.sendMail({
      from: `"منظومة الهوية الرقمية الفلسطينية — PALPASS" <${smtpUser}>`,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`[PALPASS REJECTION MAIL] To: ${email} | NID: ${nationalId} | MsgId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[PALPASS REJECTION SMTP ERROR]", err.message);
    return { success: false, error: TX_FAILED };
  }
}

const ACTIVE_CITIZEN_REQUIRED =
  "هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.";
const ACTIVE_CITIZEN_RESPONSE =
  "هذه الخدمة تتطلب اعتماد الهوية الرقمية من قبل الشؤون المدنية أولاً.";

function assertActiveCitizen(profile) {
  if (!profile || profile.status !== "active" || !profile.is_verified) {
    throw new Error(ACTIVE_CITIZEN_REQUIRED);
  }
}

async function requireActiveCitizen(supabase, userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status, is_verified, role")
    .eq("id", userId)
    .maybeSingle();
  assertActiveCitizen(profile);
  return profile;
}

function civicAccessError(err) {
  if (err?.message === ACTIVE_CITIZEN_REQUIRED || String(err?.message || "").includes("اعتماد الهوية")) {
    return { success: false, error: ACTIVE_CITIZEN_RESPONSE };
  }
  return null;
}

const UNIQUE_CONFLICT = "البيانات المدخلة أو الطلب مسجل مسبقاً في المنظومة.";
const INSUFFICIENT_FUNDS = "رصيد المحفظة غير كافٍ لإتمام المعاملة.";
const TX_FAILED = "تعذر إتمام المعاملة الحكومية حالياً. يرجى المحاولة لاحقاً.";

function publicError(err) {
  const code = String(err?.code || "");
  const msg = String(err?.message || "");
  if (msg === ACTIVE_CITIZEN_REQUIRED || msg.includes("اعتماد الهوية")) return ACTIVE_CITIZEN_REQUIRED;
  if (code === "23505" || /duplicate key|already exists/i.test(msg)) return UNIQUE_CONFLICT;
  if (/INSUFFICIENT|رصيد المحفظة غير كاف/i.test(msg)) return INSUFFICIENT_FUNDS;
  if (msg.startsWith("غير مصرح")) return msg;
  return TX_FAILED;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function sanitizeNationalId(val) {
  if (!val) return "";
  const easternDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  let str = String(val).trim();
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(easternDigits[i], String(i));
  }
  return str.replace(/\s+/g, "");
}

const forgotPasswordRateLimits = new Map();

function checkForgotPasswordCooldown(key) {
  const now = Date.now();
  const lastTime = forgotPasswordRateLimits.get(key) || 0;
  if (now - lastTime < 60000) {
    return false;
  }
  forgotPasswordRateLimits.set(key, now);
  // Periodically clean up entries older than 2 minutes
  if (forgotPasswordRateLimits.size > 1000) {
    for (const [k, timestamp] of forgotPasswordRateLimits.entries()) {
      if (now - timestamp > 120000) {
        forgotPasswordRateLimits.delete(k);
      }
    }
  }
  return true;
}

function generateCivicPassword() {
  return crypto.randomBytes(4).toString("hex");
}

async function sendPasswordEmail(targetEmail, password, nationalId) {
  const smtpUser = smtpIdentity()?.user;
  const transport = getMailTransporter();
  if (!smtpUser || !transport) return { success: false, error: "MAIL_UNCONFIGURED" };
  const text = `المواطن صاحب الهوية :#${nationalId} , هذه كلمة السر الجديدة : ${password}`;
  const html = `<div dir="rtl" style="font-family: Arial, Tahoma, sans-serif; background-color: #f8fafc; padding: 32px 20px; text-align: center;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <h2 style="color: #064e3b; margin: 0 0 16px; font-size: 20px;">دولة فلسطين — منظومة الهوية الرقمية (PALPASS)</h2>
    <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      المواطن صاحب الهوية : <strong>#${nationalId}</strong><br/>
      هذه كلمة السر الجديدة :
    </p>
    <div style="display: inline-block; background: #064e3b; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 22px; font-weight: bold; letter-spacing: 3px; font-family: monospace;">
      ${password}
    </div>
    <p style="color: #64748b; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
      يرجى استخدام كلمة المرور هذه لتسجيل الدخول إلى حسابك الحكومي فور اكتمال التدقيق والاعتماد.
    </p>
  </div>
</div>`;

  const started = Date.now();
  try {
    const info = await transport.sendMail({
      from: `"منظومة الهوية الرقمية الفلسطينية — PALPASS" <${smtpUser}>`,
      to: targetEmail,
      subject: "PALPASS | بيانات الدخول المعتمدة — دولة فلسطين",
      text,
      html,
    });
    const elapsedMs = Date.now() - started;
    console.log(
      `[PALPASS CREDENTIALS DISPATCH] To: ${targetEmail} | NID: ${nationalId} | Port: 587 | MsgId: ${info.messageId} | elapsedMs: ${elapsedMs}`
    );
    return { success: true, messageId: info.messageId, elapsedMs };
  } catch (err) {
    const elapsedMs = Date.now() - started;
    console.error("[PALPASS SMTP ERROR] port 587:", err.message, "| elapsedMs:", elapsedMs);
    return { success: false, error: TX_FAILED, elapsedMs };
  }
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

/**
 * Register a new citizen.
 * - Auto-generates a cryptographically secure password
 * - Uploads identity document + personal face photo to private bucket
 * - Creates the Supabase Auth user + profile + wallet
 * - Emails the generated password via live Gmail SMTP
 */
export async function registerCitizen(formData) {
  const bucket = process.env.NEXT_PUBLIC_BUCKET_DOCS || "verification-docs";
  let userId = null;
  let docStoragePath = null;
  let faceStoragePath = null;
  let adminClient = null;

  try {
    adminClient = createAdminClient();

    const email = String(formData.get("email") || "").trim();
    const nationalId = sanitizeNationalId(formData.get("nationalId"));
    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const governorate = String(formData.get("governorate") || formData.get("region") || "").trim();
    const docFile = formData.get("document") || formData.get("verificationDoc");
    const photoFile = formData.get("personalPhoto");

    const parsed = registerSchema.safeParse({
      email,
      nationalId,
      fullName,
      phone,
      city,
      governorate,
    });
    if (!parsed.success) {
      return { success: false, error: firstZodIssue(parsed.error) };
    }

    const hasDocument =
      docFile &&
      typeof docFile === "object" &&
      typeof docFile.arrayBuffer === "function" &&
      Number(docFile.size) > 0;
    if (!hasDocument) {
      return { success: false, error: "يرجى إرفاق وثيقة الهوية الوطنية." };
    }
    if (docFile.size > MAX_UPLOAD_BYTES) {
      return { success: false, error: "حجم الوثيقة يجب ألا يتجاوز 10 ميغابايت." };
    }
    if (docFile.type && !ALLOWED_DOC_TYPES.has(docFile.type)) {
      return { success: false, error: "صيغة الوثيقة غير مدعومة. استخدم PNG أو JPG أو PDF." };
    }

    const hasPhoto =
      photoFile &&
      typeof photoFile === "object" &&
      typeof photoFile.arrayBuffer === "function" &&
      Number(photoFile.size) > 0;
    if (!hasPhoto) {
      return { success: false, error: "يرجى إرفاق الصورة الشخصية للتحقق العيني." };
    }
    if (photoFile.size > MAX_UPLOAD_BYTES) {
      return { success: false, error: "حجم الصورة الشخصية يجب ألا يتجاوز 10 ميغابايت." };
    }
    if (photoFile.type && !ALLOWED_PHOTO_TYPES.has(photoFile.type)) {
      return { success: false, error: "صيغة الصورة الشخصية غير مدعومة. استخدم PNG أو JPG أو WEBP." };
    }

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("national_id", nationalId)
      .maybeSingle();

    if (existingProfile) {
      return { success: false, error: "رقم الهوية الوطنية مسجل مسبقاً في المنظومة" };
    }

    const docExt =
      String(docFile.name?.split(".").pop() || "png")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "png";
    const photoExt =
      String(photoFile.name?.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";

    const stamp = Date.now();
    docStoragePath = `${nationalId}/${stamp}_doc.${docExt}`;
    faceStoragePath = `${nationalId}/${stamp}_face.${photoExt}`;

    const civicPassword = generateCivicPassword();

    // Service-role create only — email_confirm:true suppresses Supabase built-in mail.
    // NEVER use client signUp / signInWithOtp (those dispatch Magic Links).
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: civicPassword,
      email_confirm: true,
      user_metadata: {
        national_id: nationalId,
        full_name: fullName,
        role: "citizen",
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: "فشل إنشاء المستخدم." };
    }

    async function uploadToBucket(file, path) {
      const options = {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      };
      let { error } = await adminClient.storage.from(bucket).upload(path, file, options);
      if (error) {
        const buffer = Buffer.from(await file.arrayBuffer());
        ({ error } = await adminClient.storage.from(bucket).upload(path, buffer, options));
      }
      return error;
    }

    // Concurrent uploads — cut wall-clock storage latency ~50% on slow uplinks.
    const [docUploadError, faceUploadError] = await Promise.all([
      uploadToBucket(docFile, docStoragePath),
      uploadToBucket(photoFile, faceStoragePath),
    ]);

    if (docUploadError || faceUploadError) {
      console.error("registerCitizen upload:", { docUploadError, faceUploadError });
      await adminClient.storage.from(bucket).remove([docStoragePath, faceStoragePath]);
      await adminClient.auth.admin.deleteUser(userId);
      if (docUploadError && !faceUploadError) {
        return { success: false, error: "تعذر رفع وثيقة الهوية الوطنية." };
      }
      if (faceUploadError && !docUploadError) {
        return { success: false, error: "تعذر رفع الصورة الشخصية للتحقق العيني." };
      }
      return { success: false, error: "تعذر رفع وثائق التحقق." };
    }

    const profilePayload = {
      id: userId,
      national_id: nationalId,
      full_name: fullName,
      phone,
      email,
      governorate,
      city,
      region: governorate,
      verification_doc_url: docStoragePath,
      personal_photo_url: faceStoragePath,
      status: "pending",
      is_verified: false,
      role: "citizen",
    };

    const { error: profileError } = await adminClient.from("profiles").insert(profilePayload);

    if (profileError) {
      await adminClient.storage.from(bucket).remove([docStoragePath, faceStoragePath]);
      await adminClient.auth.admin.deleteUser(userId);
      return { success: false, error: publicError(profileError) };
    }

    const { error: walletError } = await adminClient
      .from("wallets")
      .insert({ user_id: userId, balance: 0.0, currency: "ILS" });

    if (walletError) {
      await adminClient.from("profiles").delete().eq("id", userId);
      await adminClient.storage.from(bucket).remove([docStoragePath, faceStoragePath]);
      await adminClient.auth.admin.deleteUser(userId);
      return { success: false, error: "تعذر إنشاء المحفظة الرقمية." };
    }

    try {
      await adminClient.from("notifications").insert({
        user_id: userId,
        title: "Welcome to PALPASS / مرحباً بك في بال باس",
        message:
          "Thank you for joining the national digital identity platform. Your login credentials have been sent to your email. / شكراً لانضمامك إلى منصة الهوية الرقمية الوطنية. تم إرسال بيانات الدخول إلى بريدك الإلكتروني.",
        type: "system",
      });
    } catch {
      // Notification is non-blocking.
    }

    const mailResult = await sendPasswordEmail(email, civicPassword, nationalId);
    const mailDelivered = Boolean(mailResult?.success);
    if (!mailDelivered) {
      console.error(
        "registerCitizen: SMTP delivery FAILED — account kept. Use forgotPassword. Error:",
        mailResult?.error,
        "| elapsedMs:",
        mailResult?.elapsedMs
      );
    }

    const maskedEmail = maskEmailForHandoff(email);
    const result = {
      success: true,
      nationalId,
      maskedEmail,
      smtpMs: mailResult?.elapsedMs,
      mailDelivered,
      ...(mailDelivered
        ? {}
        : {
            warning: "تعذر تسليم البريد الإلكتروني لحظياً بسبب مزود الخدمة",
          }),
    };
    if (process.env.PALPASS_AUTH_TEST === "1") {
      result.testPassword = civicPassword;
    }
    return result;
  } catch (err) {
    console.error("registerCitizen Error:", err);
    if (adminClient && userId) {
      try {
        const paths = [docStoragePath, faceStoragePath].filter(Boolean);
        if (paths.length) await adminClient.storage.from(bucket).remove(paths);
        await adminClient.from("profiles").delete().eq("id", userId);
        await adminClient.auth.admin.deleteUser(userId);
      } catch (rollbackErr) {
        console.error("registerCitizen rollback:", rollbackErr);
      }
    }
    const causeCode = err?.cause?.code || err?.code;
    if (causeCode === "ENOTFOUND" || String(err?.message || "").includes("fetch failed")) {
      return { success: false, error: "تعذر الاتصال بمنظومة الهوية حالياً. يرجى المحاولة لاحقاً." };
    }
    return { success: false, error: "حدث خطأ غير متوقع." };
  }
}

/**
 * Sign in using National ID + password.
 * Pending and active citizens may establish a session.
 * Only suspended accounts are blocked at the gate.
 */
export async function signIn(formData) {
  const supabase = await createClient();
  const nationalId = sanitizeNationalId(formData.get("nationalId"));
  const password = formData.get("password");

  if (!nationalId || !password) {
    return { success: false, error: "رقم الهوية وكلمة المرور مطلوبان." };
  }

  if (!/^\d{9}$/.test(nationalId)) {
    return { success: false, error: "رقم الهوية يجب أن يتكون من 9 أرقام." };
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, status, role")
    .eq("national_id", nationalId)
    .maybeSingle();

  if (profileError || !profile?.email) {
    return { success: false, error: "رقم الهوية الوطنية غير مسجل بالمنظومة" };
  }

  const status = String(profile.status || "").toLowerCase();

  if (status === "suspended") {
    return {
      success: false,
      error: "هذا الحساب معلق من قبل الإدارة السيادية. يرجى مراجعة الشؤون المدنية.",
    };
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (authError) {
    return { success: false, error: "كلمة المرور غير صحيحة." };
  }

  const signedInUserId = authData.user?.id || profile.id;
  if (signedInUserId) {
    await syncAuthRole(adminClient, signedInUserId, profile.role, {
      national_id: nationalId,
      full_name: authData.user?.user_metadata?.full_name,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  const nextUrl = safeInternalPath(formData.get("next"));
  if (profile.role === "admin") {
    return { success: true, redirectUrl: nextUrl || "/admin" };
  }
  return { success: true, redirectUrl: nextUrl || "/dashboard" };
}

function safeInternalPath(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\")) {
    return null;
  }
  const stripped = raw.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
  if (!stripped.startsWith("/") || stripped.startsWith("//")) return null;
  return stripped;
}

/**
 * Forgot Password — overwrite the auth password and email the new civic credential.
 */
export async function forgotPassword(formData) {
  const nationalId = sanitizeNationalId(formData.get("nationalId"));
  const generic = {
    success: true,
    message: FORGOT_GENERIC_MESSAGE,
  };

  if (!/^\d{9}$/.test(nationalId)) {
    return generic;
  }

  // Rate limiting / cooldown check: 60 seconds per National ID and per IP
  const reqHeaders = await headers();
  const clientIp = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const nidKey = `nid:${nationalId}`;
  const ipKey = `ip:${clientIp}`;

  if (!checkForgotPasswordCooldown(nidKey) || !checkForgotPasswordCooldown(ipKey)) {
    return {
      success: false,
      error: "يرجى الانتظار دقيقة واحدة قبل طلب رمز جديد",
    };
  }

  try {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("national_id", nationalId)
      .maybeSingle();

    if (!profile?.id || !profile?.email) {
      return generic;
    }

    const newPassword = generateCivicPassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });
    if (updateError) throw updateError;

    const mailResult = await sendPasswordEmail(profile.email, newPassword, nationalId);
    const mailDelivered = Boolean(mailResult?.success);
    if (!mailDelivered) {
      console.error(
        "forgotPassword: SMTP delivery FAILED — password updated in Auth. Error:",
        mailResult?.error,
        "| elapsedMs:",
        mailResult?.elapsedMs
      );
    }

    const payload = {
      success: true,
      message: mailDelivered
        ? FORGOT_SENT_MESSAGE
        : "تعذر تسليم البريد الإلكتروني لحظياً بسبب مزود الخدمة",
      mailDelivered,
      ...(mailDelivered
        ? {}
        : {
            warning:
              "تعذر تسليم البريد الإلكتروني لحظياً بسبب مزود الخدمة",
          }),
    };
    if (process.env.PALPASS_AUTH_TEST === "1") {
      payload.testPassword = newPassword;
    }
    return payload;
  } catch (err) {
    console.error("forgotPassword Error:", err);
    return generic;
  }
}

/**
 * Atomic civic sign-out: terminate Auth session + purge sb-* cookies + hard redirect.
 * Prefer `<form action={signOutCitizen}>` so cookies flush on the same response.
 */
export async function signOutCitizen() {
  const cookieStore = await cookies();
  const supabase = await createClient();

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("signOutCitizen: auth.signOut failed:", err);
  }

  for (const c of cookieStore.getAll()) {
    const name = c.name.toLowerCase();
    if (
      name.includes("sb-") ||
      name.includes("supabase") ||
      name.includes("auth-token") ||
      (name.includes("token") && name.includes("auth"))
    ) {
      try {
        cookieStore.set(c.name, "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
        cookieStore.delete(c.name);
      } catch {
        // Cookie mutation can fail in read-only contexts; continue wiping others.
      }
    }
  }

  revalidatePath("/", "layout");
  const headerStore = await headers();
  const referer = headerStore.get("referer") || "";
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  let locale = cookieLocale === "en" || cookieLocale === "ar" ? cookieLocale : "ar";
  try {
    const path = new URL(referer).pathname;
    if (path === "/en" || path.startsWith("/en/")) locale = "en";
    else if (path === "/ar" || path.startsWith("/ar/")) locale = "ar";
  } catch {
    /* keep the cookie locale */
  }
  redirect(`/${locale}`);
}

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

/**
 * Update editable profile fields.
 */
export async function updateProfile(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const updates = {
    full_name: formData.get("fullName"),
    phone:     formData.get("phone"),
    city:      formData.get("city"),
    region:    formData.get("region"),
    cv_public: formData.get("cvPublic") === "true",
  };

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: publicError(error) };

  revalidatePath("/profile");
  return { success: true };
}

/**
 * Upload avatar image to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadAvatar(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file = formData.get("avatar");
  if (!file || file.size === 0) return { error: "No file provided." };

  const ext  = file.name.split(".").pop();
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(process.env.NEXT_PUBLIC_BUCKET_AVATARS || "avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from(process.env.NEXT_PUBLIC_BUCKET_AVATARS || "avatars")
    .getPublicUrl(path);

  await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
  revalidatePath("/profile");

  return { success: true, url: urlData.publicUrl };
}

/**
 * Upload identity verification document.
 */
export async function uploadVerificationDoc(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file = formData.get("doc");
  if (!file || file.size === 0) return { error: "No file provided." };

  const ext  = file.name.split(".").pop();
  const path = `${user.id}/id-doc.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(process.env.NEXT_PUBLIC_BUCKET_DOCS || "verification-docs")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  // Store private URL (no public access — admin views via signed URL)
  await supabase.from("profiles").update({ verification_doc_url: path }).eq("id", user.id);

  return { success: true, message: "Document submitted for admin review." };
}

// ─────────────────────────────────────────────────────────────
// CV
// ─────────────────────────────────────────────────────────────

export async function addEducation(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("cv_education").insert({
    user_id:     user.id,
    degree:      formData.get("degree"),
    institution: formData.get("institution"),
    year:        formData.get("year"),
  });

  if (error) return { error: publicError(error) };
  revalidatePath("/profile");
  return { success: true };
}

export async function addExperience(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("cv_experience").insert({
    user_id:   user.id,
    title:     formData.get("title"),
    company:   formData.get("company"),
    from_year: formData.get("fromYear"),
    to_year:   formData.get("toYear"),
  });

  if (error) return { error: publicError(error) };
  revalidatePath("/profile");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// WALLET
// ─────────────────────────────────────────────────────────────

/**
 * Pay a bill from wallet balance.
 */
export async function payBill(billId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "يلزم تسجيل الدخول أولاً." };

    await requireActiveCitizen(supabase, user.id);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc("pay_bill_rpc", {
      p_user_id: user.id,
      p_bill_id: billId,
    });
    if (error) return { error: publicError(error) };
    if (data?.success === false) return { error: data.error || TX_FAILED };

    revalidatePath("/services/bills");
    revalidatePath("/dashboard");
    return { success: true, newBalance: data?.newBalance };
  } catch (err) {
    const gated = civicAccessError(err);
    if (gated) return gated;
    console.error("payBill Error:", err);
    return { error: publicError(err) };
  }
}

/**
 * Pay a violation from wallet.
 */
export async function payViolation(violationId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "يلزم تسجيل الدخول أولاً." };

    await requireActiveCitizen(supabase, user.id);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc("pay_violation_rpc", {
      p_user_id: user.id,
      p_violation_id: violationId,
    });
    if (error) return { error: publicError(error) };
    if (data?.success === false) return { error: data.error || TX_FAILED };

    revalidatePath("/services/violations");
    revalidatePath("/dashboard");
    return { success: true, newBalance: data?.newBalance };
  } catch (err) {
    const gated = civicAccessError(err);
    if (gated) return gated;
    console.error("payViolation Error:", err);
    return { error: publicError(err) };
  }
}

// ─────────────────────────────────────────────────────────────
// SERVICE REQUESTS
// ─────────────────────────────────────────────────────────────

export async function submitServiceRequest(type, notes = "", attachments = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  try {
    await requireActiveCitizen(supabase, user.id);
  } catch (err) {
    return civicAccessError(err) || { error: publicError(err) };
  }

  const { error } = await supabase.from("service_requests").insert({
    user_id: user.id, type, notes, attachments, status: "pending",
  });

  if (error) return { error: publicError(error) };
  const t = await getTranslations("Services");
  return { success: true, message: t("request_submitted") };
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

export async function markNotificationRead(notifId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  await supabase.from("notifications").update({ is_read: true }).eq("id", notifId).eq("user_id", user.id);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  revalidatePath("/", "layout");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// RESTAURANT SUBMISSION
// ─────────────────────────────────────────────────────────────

export async function submitRestaurant(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("restaurants").insert({
    owner_id:    user.id,
    name:        formData.get("name"),
    city:        formData.get("city"),
    description: formData.get("description"),
    phone:       formData.get("phone"),
    status:      "pending",
  });

  if (error) return { error: publicError(error) };
  return { success: true, message: "Restaurant submitted for admin approval." };
}

// ─────────────────────────────────────────────────────────────
// JOB POSTING
// ─────────────────────────────────────────────────────────────

export async function submitJobPosting(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("job_postings").insert({
    posted_by:    user.id,
    title:        formData.get("title"),
    organization: formData.get("organization"),
    type:         formData.get("type") || "private",
    location:     formData.get("location"),
    description:  formData.get("description"),
    salary:       formData.get("salary"),
    status:       "pending",
  });

  if (error) return { error: publicError(error) };
  return { success: true, message: "Job posting submitted for admin approval." };
}

export async function claimAidPackage(packageId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  try {
    await requireActiveCitizen(supabase, user.id);
  } catch (err) {
    return civicAccessError(err) || { error: publicError(err) };
  }

  // Check if already claimed
  const { data: existing } = await supabase
    .from("aid_claims")
    .select("id")
    .eq("user_id", user.id)
    .eq("package_id", packageId)
    .single();

  if (existing) return { error: "This package has already been claimed." };

  const { error } = await supabase.from("aid_claims").insert({
    user_id: user.id,
    package_id: packageId,
    status: "pending",
  });

  if (error) return { error: publicError(error) };

  revalidatePath("/services/aid");
  return { success: true, message: "Package claim submitted successfully." };
}

// ─────────────────────────────────────────────────────────────
// ADMIN ACTIONS
// ─────────────────────────────────────────────────────────────

export async function approveUser(userId) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized." };

    const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!admin || admin.role !== "admin") return { error: "Unauthorized." };

    const { error: approveError } = await adminClient
      .from("profiles")
      .update({ is_verified: true, status: "active" })
      .eq("id", userId);
    if (approveError) return { error: publicError(approveError) };

    const { data: approvedProfile } = await adminClient
      .from("profiles")
      .select("role, national_id, full_name, email, status, is_verified")
      .eq("id", userId)
      .maybeSingle();

    if (approvedProfile) {
      await syncAuthRole(adminClient, userId, approvedProfile.role, {
        national_id: approvedProfile.national_id,
        full_name: approvedProfile.full_name,
        status: "active",
        is_verified: true,
      });

      if (approvedProfile.email) {
        const mail = await sendAccreditationEmail({
          email: approvedProfile.email,
          fullName: approvedProfile.full_name,
          nationalId: approvedProfile.national_id,
        });
        if (!mail.success) {
          console.error("approveUser: accreditation email failed:", mail.error);
        }
      }
    }

    await adminClient.from("notifications").insert({
      user_id: userId,
      title:   "Account Approved / تمت الموافقة على حسابك",
      message: "Your PALPASS account has been verified and approved. You now have full access. / تم التحقق من حسابك في بال باس والموافقة عليه. يمكنك الوصول الكامل الآن.",
      type:    "system",
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("approveUser Error:", err);
    return { error: "An unexpected error occurred." };
  }
}

/**
 * Admin-only: signed URLs for identity document + personal face photo (300s).
 */
export async function getCitizenVerificationMedia(profileId) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized." };

    const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!admin || admin.role !== "admin") return { error: "Unauthorized." };

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, full_name, national_id, verification_doc_url, personal_photo_url, status")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError || !profile) {
      return { error: "تعذر تحميل ملف المواطن." };
    }

    const bucket = process.env.NEXT_PUBLIC_BUCKET_DOCS || "verification-docs";
    const expiry = 300;

    async function signPath(path) {
      if (!path) return null;
      // Already a full URL (legacy / public)
      if (/^https?:\/\//i.test(path)) return path;
      const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(path, expiry);
      if (error) {
        console.error("createSignedUrl:", error.message, path);
        return null;
      }
      return data?.signedUrl || null;
    }

    const [documentUrl, personalPhotoUrl] = await Promise.all([
      signPath(profile.verification_doc_url),
      signPath(profile.personal_photo_url),
    ]);

    return {
      success: true,
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        national_id: profile.national_id,
        status: profile.status,
      },
      documentUrl,
      personalPhotoUrl,
      isPdfDocument:
        typeof profile.verification_doc_url === "string" &&
        profile.verification_doc_url.toLowerCase().endsWith(".pdf"),
    };
  } catch (err) {
    console.error("getCitizenVerificationMedia Error:", err);
    return { error: "An unexpected error occurred." };
  }
}

export async function rejectUser(userId, reason = "") {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized." };

    const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!admin || admin.role !== "admin") return { error: "Unauthorized." };

    const rejectionReason =
      reason ||
      "تعذر مطابقة ملامح الوجه مع وثيقة الهوية. يرجى إعادة التقديم بوثائق أوضح.";

    const { error: rejectError } = await adminClient
      .from("profiles")
      .update({ status: "suspended", is_verified: false })
      .eq("id", userId);
    if (rejectError) return { error: publicError(rejectError) };

    const { data: rejectedProfile } = await adminClient
      .from("profiles")
      .select("role, national_id, full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (rejectedProfile) {
      await syncAuthRole(adminClient, userId, rejectedProfile.role, {
        national_id: rejectedProfile.national_id,
        full_name: rejectedProfile.full_name,
        status: "suspended",
        is_verified: false,
      });

      if (rejectedProfile.email) {
        const mail = await sendRejectionEmail({
          email: rejectedProfile.email,
          fullName: rejectedProfile.full_name,
          nationalId: rejectedProfile.national_id,
          reason: rejectionReason,
        });
        if (!mail.success) {
          console.error("rejectUser: rejection email failed:", mail.error);
        }
      }
    }

    await adminClient.from("notifications").insert({
      user_id: userId,
      title:   "Account Review / مراجعة الحساب",
      message: rejectionReason,
      type:    "alert",
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("rejectUser Error:", err);
    return { error: "An unexpected error occurred." };
  }
}

const APPROVABLE_TABLES = ["restaurants", "job_postings"];

export async function approveEntity(table, id) {
  try {
    // Whitelist guard — prevent arbitrary table injection
    if (!APPROVABLE_TABLES.includes(table)) {
      return { error: "Invalid table." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized." };

    const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!admin || admin.role !== "admin") return { error: "Unauthorized." };

    const { error } = await supabase.from(table).update({ status: "approved" }).eq("id", id);
    if (error) return { error: publicError(error) };

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("approveEntity Error:", err);
    return { error: "An unexpected error occurred." };
  }
}

export async function sendAdminNotification(userId, title, message, type = "system") {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized." };

    const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!admin || admin.role !== "admin") return { error: "Unauthorized." };

    // Use adminClient to bypass the RLS INSERT policy on notifications
    const { error } = await adminClient.from("notifications").insert({ user_id: userId, title, message, type });
    if (error) return { error: publicError(error) };
    return { success: true };
  } catch (err) {
    console.error("sendAdminNotification Error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ─────────────────────────────────────────────────────────────
// SUPER-APP CIVIC MODULES (Phase 2)
// ─────────────────────────────────────────────────────────────

const CROSSINGS = new Set(["karameh_bridge", "rafah_crossing", "erez_crossing"]);
const POA_TYPES = new Set(["general", "real_estate", "legal_litigation", "banking", "vehicle"]);
const REPORT_CATEGORIES = new Set([
  "water_network",
  "electricity",
  "roads_potholes",
  "price_gouging",
  "sanitation",
]);
const BLOOD_TYPES = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

async function requireAuthedActive() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", supabase: null, user: null };
  try {
    await requireActiveCitizen(supabase, user.id);
  } catch (err) {
    const gated = civicAccessError(err);
    return { error: gated?.error || publicError(err), supabase, user };
  }
  return { supabase, user, error: null };
}

export async function getUserCivicDocuments() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, documents: [] };
  const { data, error } = await gate.supabase
    .from("civic_documents")
    .select("*")
    .eq("user_id", gate.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: publicError(error), documents: [] };
  return { success: true, documents: data || [] };
}

const BORDER_CATEGORIES = new Set([
  "medical",
  "education",
  "business",
  "humanitarian",
  "tourism_family",
  "delegation",
]);
const BORDER_RELATIONS = new Set(["spouse", "child", "parent", "sibling", "other"]);
const BORDER_FEE = 170;

export async function submitBorderClearanceRequest(formData) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const crossing = String(formData.get("crossingName") || "").trim();
  const travelDate = String(formData.get("travelDate") || "").trim();
  const travelPurpose = String(formData.get("travelPurpose") || "").trim();
  const nameAr = String(formData.get("nameAr") || "").trim();
  const nameEn = String(formData.get("nameEn") || "").trim();
  const passportNumber = String(formData.get("passportNumber") || "").trim().toUpperCase();
  const passportExpiry = String(formData.get("passportExpiry") || "").trim();
  const destination = String(formData.get("destination") || "").trim();
  const category = String(formData.get("category") || "").trim();

  if (!CROSSINGS.has(crossing)) return { success: false, error: "معبر غير صالح." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) return { success: false, error: "تاريخ السفر مطلوب." };
  if (travelPurpose.length < 3) return { success: false, error: "الغرض من السفر مطلوب." };
  if (nameAr.length < 3 || !/[\u0600-\u06FF]/.test(nameAr)) {
    return { success: false, error: "الاسم العربي كما في الجواز مطلوب." };
  }
  if (!/^[A-Za-z][A-Za-z '-]{1,80}$/.test(nameEn)) {
    return { success: false, error: "الاسم الإنجليزي يجب أن يطابق حروف الجواز اللاتينية." };
  }
  if (!/^[A-Z0-9]{5,12}$/.test(passportNumber)) {
    return { success: false, error: "رقم الجواز غير صالح." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(passportExpiry) || passportExpiry <= travelDate) {
    return { success: false, error: "يجب أن يكون الجواز سارياً بعد تاريخ السفر." };
  }
  if (destination.length < 2) return { success: false, error: "بلد الوجهة مطلوب." };
  if (!BORDER_CATEGORIES.has(category)) return { success: false, error: "فئة السفر غير معتمدة." };

  let companions = [];
  try {
    const parsed = JSON.parse(String(formData.get("companions") || "[]"));
    if (!Array.isArray(parsed)) throw new Error("companions");
    companions = parsed.slice(0, 10).map((item) => ({
      name: String(item?.name || "").trim(),
      document: String(item?.document || "").trim(),
      relation: String(item?.relation || "").trim(),
    }));
  } catch {
    return { success: false, error: "بيانات المرافقين غير صالحة." };
  }
  for (const companion of companions) {
    if (companion.name.length < 3) return { success: false, error: "اسم المرافق مطلوب." };
    if (!/^(\d{9}|[A-Za-z0-9]{5,12})$/.test(companion.document)) {
      return { success: false, error: "وثيقة المرافق يجب أن تكون هوية من 9 أرقام أو رقم جواز." };
    }
    if (!BORDER_RELATIONS.has(companion.relation)) {
      return { success: false, error: "صلة القرابة غير معتمدة." };
    }
  }

  const logistics = {
    wheelchair: formData.get("wheelchair") === "true",
    ambulance: formData.get("ambulance") === "true",
    vip_hall: formData.get("vipHall") === "true",
  };

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc("submit_border_permit_rpc", {
      p_user_id: gate.user.id,
      p_crossing: crossing,
      p_travel_date: travelDate,
      p_travel_purpose: travelPurpose,
      p_name_ar: nameAr,
      p_name_en: nameEn,
      p_passport_no: passportNumber,
      p_passport_expiry: passportExpiry,
      p_destination: destination,
      p_category: category,
      p_companions: companions,
      p_logistics: logistics,
      p_fee: BORDER_FEE,
    });
    if (error) return { success: false, error: publicError(error) };
    if (data?.success === false) return { success: false, error: data.error || TX_FAILED };

    revalidatePath("/services/border");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "تم سداد رسوم المغادرة وإصدار مرجع التنسيق.",
      newBalance: data?.newBalance,
      permit: {
        id: data?.permitId,
        permit_number: data?.trackingCode,
        clearance_tracking_code: data?.trackingCode,
        qr_token: data?.qrToken,
        status: data?.status || "under_review",
        payment_status: data?.paymentStatus || "paid",
        crossing_name: crossing,
        travel_date: travelDate,
        travel_purpose: travelPurpose,
        destination_country: destination,
        travel_category: category,
        full_name_passport_en: nameEn,
        companions_count: companions.length,
        coordination_fee_ils: BORDER_FEE,
      },
    };
  } catch (err) {
    console.error("submitBorderClearanceRequest:", err);
    return { success: false, error: publicError(err) };
  }
}

export async function submitBorderPermit(formData) {
  return submitBorderClearanceRequest(formData);
}

export async function bookCivicAppointment(formData) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const ministryCode = String(formData.get("ministryCode") || "").trim();
  const ministryNameAr = String(formData.get("ministryNameAr") || "").trim();
  const ministryNameEn = String(formData.get("ministryNameEn") || "").trim();
  const serviceNameAr = String(formData.get("serviceNameAr") || "").trim();
  const serviceNameEn = String(formData.get("serviceNameEn") || "").trim();
  const branchAr = String(formData.get("branchLocationAr") || "").trim();
  const branchEn = String(formData.get("branchLocationEn") || "").trim();
  const appointmentDate = String(formData.get("appointmentDate") || "").trim();
  const timeSlot = String(formData.get("timeSlot") || "").trim();

  if (!ministryCode || !serviceNameAr || !appointmentDate || !timeSlot) {
    return { success: false, error: "بيانات الموعد غير مكتملة." };
  }

  const bookingReference = `PAL-APT-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const { data, error } = await gate.supabase
    .from("civic_appointments")
    .insert({
      user_id: gate.user.id,
      ministry_code: ministryCode,
      ministry_name_ar: ministryNameAr || ministryCode,
      ministry_name_en: ministryNameEn || ministryCode,
      service_name_ar: serviceNameAr,
      service_name_en: serviceNameEn || serviceNameAr,
      branch_location_ar: branchAr || "المقر الرئيسي",
      branch_location_en: branchEn || "Main branch",
      appointment_date: appointmentDate,
      time_slot: timeSlot,
      booking_reference: bookingReference,
      status: "confirmed",
    })
    .select("*")
    .single();

  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/appointments");
  return { success: true, appointment: data };
}

export async function submitHajjApplication(formData) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const mahramName = String(formData.get("mahramName") || "").trim() || null;
  const healthStatus = String(formData.get("healthStatus") || "fit").trim();
  const seasonYear = Number(formData.get("seasonYear") || 2026);
  const allowedHealth = new Set(["fit", "chronic_condition", "needs_companion"]);
  if (!allowedHealth.has(healthStatus)) {
    return { success: false, error: "الحالة الصحية غير صالحة." };
  }

  const { data: existing } = await gate.supabase
    .from("hajj_applications")
    .select("id")
    .eq("user_id", gate.user.id)
    .eq("season_year", seasonYear)
    .maybeSingle();
  if (existing) {
    return { success: false, error: "لديك طلب حج مسجّل لهذا الموسم مسبقاً." };
  }

  const { data, error } = await gate.supabase
    .from("hajj_applications")
    .insert({
      user_id: gate.user.id,
      season_year: seasonYear,
      mahram_name: mahramName,
      health_status: healthStatus,
      lottery_status: "registered",
      priority_points: 100,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/hajj");
  return { success: true, application: data };
}

export async function issuePowerOfAttorney(formData) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const agentNationalId = String(formData.get("agentNationalId") || "").trim();
  const agentFullName = String(formData.get("agentFullName") || "").trim();
  const poaType = String(formData.get("poaType") || "").trim();
  const terms = String(formData.get("terms") || "").trim();
  const expiresAt = String(formData.get("expiresAt") || "").trim();

  if (!/^\d{9}$/.test(agentNationalId)) {
    return { success: false, error: "رقم هوية الوكيل يجب أن يتكون من 9 أرقام." };
  }
  if (!agentFullName) return { success: false, error: "اسم الوكيل مطلوب." };
  if (!POA_TYPES.has(poaType)) return { success: false, error: "نوع الوكالة غير صالح." };
  if (!terms) return { success: false, error: "بنود الوكالة مطلوبة." };
  if (!expiresAt) return { success: false, error: "تاريخ الانتهاء مطلوب." };

  const poaNumber = `POA-${new Date().getFullYear()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const { data, error } = await gate.supabase
    .from("justice_powers_of_attorney")
    .insert({
      principal_id: gate.user.id,
      agent_national_id: agentNationalId,
      agent_full_name: agentFullName,
      poa_type: poaType,
      poa_number: poaNumber,
      terms,
      status: "active",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/justice");
  return { success: true, poa: data };
}

export async function requestCriminalClearance(purpose) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const purposeText = String(purpose || "").trim();
  if (!purposeText) return { success: false, error: "الغرض من الشهادة مطلوب." };

  const adminClient = createAdminClient();
  const certNumber = `CCC-PS-${new Date().getFullYear()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const qrVerificationToken = crypto.createHash("sha256").update(`${gate.user.id}:${certNumber}:${Date.now()}`).digest("hex").slice(0, 32);

  const { data, error } = await adminClient
    .from("criminal_clearance_certs")
    .insert({
      user_id: gate.user.id,
      cert_number: certNumber,
      purpose: purposeText,
      status: "issued",
      qr_verification_token: qrVerificationToken,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/justice");
  return { success: true, certificate: data };
}

export async function contributeToCharity(campaignId, amount, isAnonymous = false) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const numericAmount = Number(amount);
  if (!campaignId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { success: false, error: "مبلغ التبرع غير صالح." };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.rpc("contribute_to_charity_rpc", {
    p_donor_id: gate.user.id,
    p_campaign_id: campaignId,
    p_amount: numericAmount,
    p_is_anonymous: Boolean(isAnonymous),
  });

  if (error) return { success: false, error: publicError(error) };
  if (data?.success === false) return { success: false, error: data.error || TX_FAILED };

  revalidatePath("/charity");
  revalidatePath("/dashboard");
  return {
    success: true,
    receiptNumber: data?.receiptNumber,
    newBalance: data?.newBalance,
  };
}

export async function submitCivicReport(formData) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const category = String(formData.get("category") || "").trim();
  const governorate = String(formData.get("governorate") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const locationDescription = String(formData.get("locationDescription") || "").trim();
  const details = String(formData.get("details") || "").trim();
  const photoUrl = String(formData.get("photoUrl") || "").trim() || null;

  if (!REPORT_CATEGORIES.has(category)) return { success: false, error: "فئة البلاغ غير صالحة." };
  if (!governorate || !city || !locationDescription || !details) {
    return { success: false, error: "يرجى استكمال بيانات البلاغ." };
  }

  const reportTrackingId = `BALADY-PS-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const { data, error } = await gate.supabase
    .from("civic_incident_reports")
    .insert({
      user_id: gate.user.id,
      category,
      governorate,
      city,
      location_description: locationDescription,
      details,
      photo_url: photoUrl,
      report_tracking_id: reportTrackingId,
      status: "submitted",
    })
    .select("*")
    .single();

  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/reports");
  return { success: true, report: data };
}

export async function updateMedicalProfile(formData) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const bloodType = String(formData.get("bloodType") || "").trim();
  const primaryHealthCenter = String(formData.get("primaryHealthCenter") || "").trim();
  const insuranceNumber = String(formData.get("insuranceNumber") || "").trim() || null;
  const allergiesRaw = String(formData.get("allergies") || "").trim();
  const chronicRaw = String(formData.get("chronicDiseases") || "").trim();

  if (bloodType && !BLOOD_TYPES.has(bloodType)) {
    return { success: false, error: "فصيلة الدم غير صالحة." };
  }
  if (!primaryHealthCenter) {
    return { success: false, error: "المركز الصحي الأساسي مطلوب." };
  }

  const allergies = allergiesRaw
    ? allergiesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const chronicDiseases = chronicRaw
    ? chronicRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const { data, error } = await gate.supabase
    .from("medical_profiles")
    .upsert(
      {
        user_id: gate.user.id,
        blood_type: bloodType || null,
        primary_health_center: primaryHealthCenter,
        insurance_number: insuranceNumber,
        allergies,
        chronic_diseases: chronicDiseases,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/health-records");
  return { success: true, profile: data };
}

export async function applyForJob(jobId, coverLetter = "") {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };
  if (!jobId) return { success: false, error: "معرف الوظيفة مطلوب." };

  const { data: cv } = await gate.supabase
    .from("citizen_cvs")
    .select("template_type, personal_info, summary, work_experience, education, skills, certifications, academic_publications, languages, signature_url, updated_at")
    .eq("user_id", gate.user.id)
    .eq("is_active", true)
    .maybeSingle();

  const { data, error } = await gate.supabase
    .from("job_applications")
    .insert({
      job_id: jobId,
      user_id: gate.user.id,
      cover_letter: String(coverLetter || "").trim() || null,
      status: "submitted",
      cv_snapshot: cv || null,
    })
    .select("*")
    .single();

  if (error) {
    if (String(error.message || "").toLowerCase().includes("duplicate") || error.code === "23505") {
      return { success: false, error: "لقد تقدّمت لهذه الوظيفة مسبقاً." };
    }
    return { success: false, error: publicError(error) };
  }
  revalidatePath("/jobs");
  return { success: true, application: data };
}

export async function getCharityCampaigns() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charity_campaigns")
    .select("*")
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: publicError(error), campaigns: [] };
  return { success: true, campaigns: data || [] };
}

export async function getUserBorderPermits() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated.", permits: [], accredited: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, is_verified")
    .eq("id", user.id)
    .maybeSingle();
  const accredited = profile?.status === "active" && profile?.is_verified === true;
  const { data } = await supabase
    .from("border_permits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return { success: true, permits: data || [], accredited };
}

export async function getUserAppointments() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, appointments: [] };
  const { data } = await gate.supabase
    .from("civic_appointments")
    .select("*")
    .eq("user_id", gate.user.id)
    .order("appointment_date", { ascending: true });
  return { success: true, appointments: data || [] };
}

export async function getUserJusticeBundle() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, poas: [], certificates: [] };
  const [poas, certificates] = await Promise.all([
    gate.supabase
      .from("justice_powers_of_attorney")
      .select("*")
      .eq("principal_id", gate.user.id)
      .order("created_at", { ascending: false }),
    gate.supabase
      .from("criminal_clearance_certs")
      .select("*")
      .eq("user_id", gate.user.id)
      .order("issued_at", { ascending: false }),
  ]);
  return {
    success: true,
    poas: poas.data || [],
    certificates: certificates.data || [],
  };
}

export async function getUserHealthBundle() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, profile: null, vaccines: [] };
  const [profile, vaccines] = await Promise.all([
    gate.supabase.from("medical_profiles").select("*").eq("user_id", gate.user.id).maybeSingle(),
    gate.supabase
      .from("vaccination_records")
      .select("*")
      .eq("user_id", gate.user.id)
      .order("administered_date", { ascending: false }),
  ]);
  return {
    success: true,
    profile: profile.data || null,
    vaccines: vaccines.data || [],
  };
}

export async function getUserAidRationCard() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, card: null };
  const { data } = await gate.supabase
    .from("aid_ration_cards")
    .select("*")
    .eq("user_id", gate.user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { success: true, card: data || null };
}

export async function getUserTradeLicenses() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, licenses: [] };
  const { data } = await gate.supabase
    .from("commercial_trade_licenses")
    .select("*")
    .eq("owner_id", gate.user.id)
    .order("created_at", { ascending: false });
  return { success: true, licenses: data || [] };
}

export async function getUserHajjApplication() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, application: null };
  const { data } = await gate.supabase
    .from("hajj_applications")
    .select("*")
    .eq("user_id", gate.user.id)
    .order("season_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { success: true, application: data || null };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export async function getCitizenCv() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, cv: null };
  const { data, error } = await gate.supabase
    .from("citizen_cvs")
    .select("*")
    .eq("user_id", gate.user.id)
    .maybeSingle();
  if (error) return { success: false, error: publicError(error), cv: null };

  let signaturePreview = null;
  if (data?.signature_url && !String(data.signature_url).startsWith("data:")) {
    try {
      const adminClient = createAdminClient();
      const bucket = process.env.NEXT_PUBLIC_BUCKET_DOCS || "verification-docs";
      const signed = await adminClient.storage.from(bucket).createSignedUrl(data.signature_url, 60 * 30);
      signaturePreview = signed.data?.signedUrl || null;
    } catch {
      signaturePreview = null;
    }
  }
  return { success: true, cv: data || null, signaturePreview };
}

export async function saveCitizenCv(payload) {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error };

  const templateType = payload?.templateType === "academic" ? "academic" : "professional";
  const personal = payload?.personalInfo && typeof payload.personalInfo === "object" ? payload.personalInfo : {};
  const fullName = String(personal.full_name_en || "").trim();
  if (fullName.length < 3) {
    return { success: false, error: "The English full name is required for the ATS resume." };
  }

  let signatureUrl = payload?.signatureUrl ? String(payload.signatureUrl) : null;
  const dataUrl = String(payload?.signatureDataUrl || "");
  if (dataUrl.startsWith("data:image/")) {
    const bucket = process.env.NEXT_PUBLIC_BUCKET_DOCS || "verification-docs";
    const base64 = dataUrl.split(",")[1] || "";
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > 2 * 1024 * 1024) {
      return { success: false, error: "Signature image exceeds 2 MB." };
    }
    const path = `signatures/${gate.user.id}.png`;
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage.from(bucket).upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });
    if (uploadError) return { success: false, error: publicError(uploadError) };
    signatureUrl = path;
  }

  const verificationHash = crypto
    .createHash("sha256")
    .update(`${gate.user.id}|${fullName}|${templateType}|${Date.now()}`)
    .digest("hex")
    .slice(0, 16);

  const row = {
    user_id: gate.user.id,
    template_type: templateType,
    personal_info: { ...personal, full_name_en: fullName, verification_hash: verificationHash },
    summary: String(payload?.summary || "").trim() || null,
    work_experience: asArray(payload?.workExperience),
    education: asArray(payload?.education),
    skills: asArray(payload?.skills).map((item) => String(item).trim()).filter(Boolean),
    certifications: asArray(payload?.certifications),
    academic_publications: asArray(payload?.publications),
    languages: asArray(payload?.languages),
    signature_url: signatureUrl,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await gate.supabase
    .from("citizen_cvs")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/profile/cv");
  revalidatePath("/jobs");
  return { success: true, cv: data };
}

export async function getUserCivicReports() {
  const gate = await requireAuthedActive();
  if (gate.error) return { success: false, error: gate.error, reports: [] };
  const { data } = await gate.supabase
    .from("civic_incident_reports")
    .select("*")
    .eq("user_id", gate.user.id)
    .order("created_at", { ascending: false });
  return { success: true, reports: data || [] };
}

const TAX_PURPOSES = z.enum([
  "commercial_bid",
  "travel",
  "land_transfer",
  "general_clearance",
]);
const CABINET_MINISTRIES = z.enum([
  "وزارة الصحة",
  "وزارة التربية والتعليم العالي",
  "وزارة الحكم المحلي",
  "وزارة المالية",
]);

async function loadActiveProfile(supabase, userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, status, is_verified, role")
    .eq("id", userId)
    .maybeSingle();
  assertActiveCitizen(profile);
  return profile;
}

export async function getMinisterialEducation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated.", records: [] };
  const { data, error } = await supabase
    .from("education_records")
    .select("id, record_type, institution_name, degree_or_stream, seat_or_student_number, completion_year, gpa_or_grade, verification_token, status")
    .eq("user_id", user.id)
    .order("completion_year", { ascending: false });
  if (error) return { success: false, error: publicError(error), records: [] };
  return { success: true, records: data || [] };
}

export async function verifyTawjihiCertificate(seatNumber, year) {
  const seat = String(seatNumber || "").trim();
  const completionYear = Number(year);
  if (!/^[A-Za-z0-9-]{4,32}$/.test(seat) || !Number.isInteger(completionYear)) {
    return { success: false, error: "بيانات التحقق غير مكتملة." };
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("education_records")
    .select("status, gpa_or_grade, degree_or_stream, institution_name, completion_year, verification_token, record_type")
    .eq("record_type", "tawjihi")
    .eq("seat_or_student_number", seat)
    .eq("completion_year", completionYear)
    .maybeSingle();
  if (error || !data) return { success: false, error: "لم يُعثر على شهادة توجيهي مطابقة." };
  return {
    success: true,
    certified: data.status === "certified",
    status: data.status,
    gpa: data.gpa_or_grade,
    stream: data.degree_or_stream,
    institution: data.institution_name,
    year: data.completion_year,
    token: data.verification_token,
  };
}

export async function getTaxClearances() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated.", certificates: [] };
  const { data, error } = await supabase
    .from("tax_clearance_certificates")
    .select("id, clearance_code, purpose, income_tax_status, vat_status, property_tax_status, valid_until, issued_at")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });
  if (error) return { success: false, error: publicError(error), certificates: [] };
  return { success: true, certificates: data || [] };
}

export async function requestTaxClearance(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    const profile = await loadActiveProfile(supabase, user.id);
    assertActiveCitizen(profile);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const parsed = TAX_PURPOSES.safeParse(String(formData.get("purpose") || ""));
  if (!parsed.success) return { success: false, error: firstZodIssue(parsed.error) };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tax_clearance_certificates")
    .insert({ user_id: user.id, purpose: parsed.data })
    .select("clearance_code")
    .single();
  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/tax-clearance");
  return { success: true, clearanceCode: data.clearance_code };
}

export async function getFamilyBookData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated.", members: [] };
  const { data, error } = await supabase
    .from("family_registry")
    .select("id, member_nid, member_name, relationship, birth_date, blood_type, national_health_insured")
    .eq("head_user_id", user.id)
    .order("birth_date", { ascending: true });
  if (error) return { success: false, error: publicError(error), members: [] };
  return { success: true, members: data || [] };
}

export async function getCabinetComplaints() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated.", complaints: [] };
  const { data, error } = await supabase
    .from("cabinet_complaints")
    .select("id, tracking_code, targeted_ministry, subject, details, status, sla_due_date, ministerial_response, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: publicError(error), complaints: [] };
  return { success: true, complaints: data || [] };
}

export async function submitCabinetComplaint(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    const profile = await loadActiveProfile(supabase, user.id);
    assertActiveCitizen(profile);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const ministry = CABINET_MINISTRIES.safeParse(String(formData.get("targetedMinistry") || ""));
  if (!ministry.success) return { success: false, error: firstZodIssue(ministry.error) };
  const subject = String(formData.get("subject") || "").trim();
  const details = String(formData.get("details") || "").trim();
  if (subject.length < 10) return { success: false, error: "موضوع التظلم يجب أن يكون 10 أحرف على الأقل." };
  if (details.length < 30) return { success: false, error: "تفاصيل التظلم يجب أن تكون 30 حرفاً على الأقل." };
  const attachmentName = String(formData.get("attachmentName") || "").trim().slice(0, 120);
  const storedDetails = attachmentName ? `${details}\nمرفق: ${attachmentName}` : details;
  const { data, error } = await supabase
    .from("cabinet_complaints")
    .insert({
      user_id: user.id,
      targeted_ministry: ministry.data,
      subject,
      details: storedDetails,
    })
    .select("tracking_code")
    .single();
  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/complaints");
  return { success: true, trackingCode: data.tracking_code };
}

const AID_TYPES = z.enum(["exceptional_medical", "home_reconstruction", "urgent_stipend", "education_grant"]);
const URGENCY_LEVELS = z.enum(["critical", "high", "standard"]);
const JERUSALEM_SUPPORT = z.enum(["arnona_relief", "legal_eviction_defense", "commercial_subsidy", "building_renovation"]);
const GAZETTE_TYPES = z.enum(["presidential_decree", "cabinet_decision", "ministerial_instruction"]);

export async function getPublicTenders() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_tenders")
    .select("id, tender_code, title, issuing_body, category, brochure_price, estimated_value, submission_deadline, status")
    .order("submission_deadline", { ascending: true });
  if (error) return { success: false, error: publicError(error), tenders: [], purchases: [] };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: true, tenders: data || [], purchases: [] };
  const { data: purchases, error: purchaseError } = await supabase
    .from("tender_purchases")
    .select("tender_id, purchase_token, amount_paid")
    .eq("user_id", user.id);
  if (purchaseError) return { success: false, error: publicError(purchaseError), tenders: data || [], purchases: [] };
  return { success: true, tenders: data || [], purchases: purchases || [] };
}

export async function purchaseTenderBrochure(tenderId) {
  const parsed = z.string().uuid().safeParse(String(tenderId || ""));
  if (!parsed.success) return { success: false, error: "معرّف العطاء غير صالح." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    const profile = await loadActiveProfile(supabase, user.id);
    assertActiveCitizen(profile);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("purchase_tender_brochure_rpc", {
    p_user_id: user.id,
    p_tender_id: parsed.data,
  });
  if (error) return { success: false, error: publicError(error) };
  if (!data?.success) return { success: false, error: data?.error || "تعذر شراء الكراسة." };
  revalidatePath("/services/tenders");
  revalidatePath("/en/services/tenders");
  return {
    success: true,
    purchaseToken: data.purchase_token,
    amountDeducted: data.amount_deducted,
    newBalance: data.new_balance,
  };
}

export async function getCabinetHumanitarianCases() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated.", cases: [] };
  const { data, error } = await supabase
    .from("cabinet_humanitarian_relief")
    .select("id, case_number, aid_type, description, urgency_level, status, financial_grant_awarded, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: publicError(error), cases: [] };
  return { success: true, cases: data || [] };
}

export async function submitCabinetHumanitarianRequest(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    const profile = await loadActiveProfile(supabase, user.id);
    assertActiveCitizen(profile);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const aidType = AID_TYPES.safeParse(String(formData.get("aidType") || ""));
  const urgency = URGENCY_LEVELS.safeParse(String(formData.get("urgency") || "high"));
  if (!aidType.success) return { success: false, error: firstZodIssue(aidType.error) };
  if (!urgency.success) return { success: false, error: firstZodIssue(urgency.error) };
  const description = String(formData.get("description") || "").trim();
  if (description.length < 30) return { success: false, error: "وصف الحالة يجب أن يكون 30 حرفاً على الأقل." };
  const { data, error } = await supabase
    .from("cabinet_humanitarian_relief")
    .insert({
      user_id: user.id,
      aid_type: aidType.data,
      urgency_level: urgency.data,
      description,
    })
    .select("case_number")
    .single();
  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/cabinet-aid");
  revalidatePath("/en/services/cabinet-aid");
  return { success: true, caseNumber: data.case_number };
}

export async function getJerusalemSupportCases() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated.", cases: [] };
  const { data, error } = await supabase
    .from("jerusalem_support_cases")
    .select("id, case_id, support_type, property_address, details, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: publicError(error), cases: [] };
  return { success: true, cases: data || [] };
}

export async function submitJerusalemResilienceCase(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    const profile = await loadActiveProfile(supabase, user.id);
    assertActiveCitizen(profile);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const supportType = JERUSALEM_SUPPORT.safeParse(String(formData.get("supportType") || ""));
  if (!supportType.success) return { success: false, error: firstZodIssue(supportType.error) };
  const propertyAddress = String(formData.get("propertyAddress") || "").trim();
  const details = String(formData.get("details") || "").trim();
  if (propertyAddress.length < 8) return { success: false, error: "عنوان العقار يجب أن يكون 8 أحرف على الأقل." };
  if (details.length < 30) return { success: false, error: "تفاصيل الطلب يجب أن تكون 30 حرفاً على الأقل." };
  const { data, error } = await supabase
    .from("jerusalem_support_cases")
    .insert({
      user_id: user.id,
      support_type: supportType.data,
      property_address: propertyAddress,
      details,
    })
    .select("case_id")
    .single();
  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/jerusalem-fund");
  revalidatePath("/en/services/jerusalem-fund");
  return { success: true, caseId: data.case_id };
}

export async function getGazetteEditions(searchQuery, decreeType) {
  const supabase = await createClient();
  let query = supabase
    .from("official_gazette_editions")
    .select("id, edition_number, issuance_date, title, decree_type, summary, full_text")
    .order("edition_number", { ascending: false });
  const type = String(decreeType || "").trim();
  if (type && type !== "all") {
    const parsed = GAZETTE_TYPES.safeParse(type);
    if (!parsed.success) return { success: false, error: "نوع المرسوم غير معتمد.", editions: [] };
    query = query.eq("decree_type", parsed.data);
  }
  const q = String(searchQuery || "").trim().slice(0, 80).replace(/[%_,.()]/g, "");
  if (q) {
    if (/^\d{1,6}$/.test(q)) query = query.eq("edition_number", Number(q));
    else query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) return { success: false, error: publicError(error), editions: [] };
  return { success: true, editions: data || [] };
}

const HOSPITAL_GOVERNORATES = [
  "jerusalem",
  "gaza",
  "ramallah",
  "nablus",
  "hebron",
  "khan_yunis",
  "north_gaza",
  "bethlehem",
  "jenin",
  "deir_al_balah",
];
const HOSPITAL_SECTORS = ["government_moh", "charitable_ngo", "private"];

export async function getDrivingLicenseAndVehicles() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً.", license: null, vehicles: [] };
  const [licenseResult, vehicleResult] = await Promise.all([
    supabase
      .from("driving_licenses")
      .select("id, license_number, license_class, issue_date, expiry_date, blood_type, demerit_points, restrictions, status")
      .eq("user_id", user.id)
      .order("expiry_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("citizen_vehicles")
      .select("id, plate_number, make_model, model_year, vin_chassis, license_expiry, annual_license_fee, insurance_status")
      .eq("user_id", user.id)
      .order("plate_number"),
  ]);
  if (licenseResult.error || vehicleResult.error) {
    return {
      success: false,
      error: publicError(licenseResult.error || vehicleResult.error),
      license: null,
      vehicles: [],
    };
  }
  return { success: true, license: licenseResult.data, vehicles: vehicleResult.data || [] };
}

export async function renewDrivingLicense(licenseId) {
  const parsed = z.string().uuid().safeParse(licenseId);
  if (!parsed.success) return { success: false, error: "معرّف الرخصة غير صالح." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    await loadActiveProfile(supabase, user.id);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("renew_driving_license_rpc", {
    p_user_id: user.id,
    p_license_id: parsed.data,
  });
  if (error) return { success: false, error: publicError(error) };
  if (!data?.success) return { success: false, error: data?.error || "تعذر تجديد رخصة القيادة" };
  revalidatePath("/services/driving-license");
  revalidatePath("/en/services/driving-license");
  revalidatePath("/dashboard");
  revalidatePath("/en/dashboard");
  return { success: true, newBalance: data.new_balance, newExpiry: data.new_expiry, amountDeducted: data.amount_deducted };
}

export async function renewVehicleRegistration(vehicleId) {
  const parsed = z.string().uuid().safeParse(vehicleId);
  if (!parsed.success) return { success: false, error: "معرّف المركبة غير صالح." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    await loadActiveProfile(supabase, user.id);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("renew_vehicle_license_rpc", {
    p_user_id: user.id,
    p_vehicle_id: parsed.data,
  });
  if (error) return { success: false, error: publicError(error) };
  if (!data?.success) return { success: false, error: data?.error || "تعذر تجديد رخصة المركبة" };
  revalidatePath("/services/driving-license");
  revalidatePath("/en/services/driving-license");
  revalidatePath("/dashboard");
  revalidatePath("/en/dashboard");
  return { success: true, newBalance: data.new_balance, newExpiry: data.new_expiry, amountDeducted: data.amount_deducted };
}

export async function getHospitalDirectory(governorateFilter, sectorFilter) {
  const supabase = await createClient();
  let query = supabase
    .from("palestinian_hospitals")
    .select("id, name_ar, name_en, governorate, city, sector, address, phone, emergency_status, departments, total_bed_capacity")
    .order("name_ar");
  if (HOSPITAL_GOVERNORATES.includes(governorateFilter)) query = query.eq("governorate", governorateFilter);
  if (HOSPITAL_SECTORS.includes(sectorFilter)) query = query.eq("sector", sectorFilter);
  const { data, error } = await query;
  if (error) return { success: false, error: publicError(error), hospitals: [] };
  return { success: true, hospitals: data || [] };
}

export async function bookHospitalClinicAppointment(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "يلزم تسجيل الدخول أولاً." };
  try {
    await loadActiveProfile(supabase, user.id);
  } catch (err) {
    return civicAccessError(err) || { success: false, error: publicError(err) };
  }
  const hospitalId = z.string().uuid().safeParse(String(formData.get("hospitalId") || ""));
  if (!hospitalId.success) return { success: false, error: "المستشفى غير معتمد." };
  const clinic = String(formData.get("clinic") || "").trim();
  const appointmentDate = String(formData.get("appointmentDate") || "").trim();
  const timeSlot = String(formData.get("timeSlot") || "").trim();
  if (clinic.length < 2 || clinic.length > 80) return { success: false, error: "عيادة التخصص غير مكتملة." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) return { success: false, error: "تاريخ الموعد غير صالح." };
  if (!/^\d{2}:\d{2}$/.test(timeSlot)) return { success: false, error: "الفترة الزمنية غير صالحة." };
  const { data, error } = await supabase
    .from("hospital_appointments")
    .insert({
      user_id: user.id,
      hospital_id: hospitalId.data,
      clinic_department: clinic,
      appointment_date: appointmentDate,
      time_slot: timeSlot,
    })
    .select("referral_code")
    .single();
  if (error) return { success: false, error: publicError(error) };
  revalidatePath("/services/hospitals");
  revalidatePath("/en/services/hospitals");
  return { success: true, referralCode: data.referral_code };
}

