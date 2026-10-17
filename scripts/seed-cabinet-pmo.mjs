/**
 * Idempotent seed for tenders, the official gazette, and baseline cases for 407926773.
 * Usage: node scripts/seed-cabinet-pmo.mjs
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

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const TENDERS = [
  [
    "TND-CAB-2026-012",
    "توريد وتركيب أجهزة الرنين المغناطيسي لمستشفيات وزارة الصحة (مجمع فلسطين الطبي ومستشفى رفيديا)",
    "وزارة الصحة",
    "supplies",
    250,
    18500000,
    "2026-11-30T12:00:00+02",
  ],
  [
    "TND-CAB-2026-044",
    "إعادة تأهيل وتعبيد الطريق الرابط بين رام الله ونابلس (وادي الحرامية)",
    "وزارة الأشغال العامة والإسكان",
    "works",
    500,
    42000000,
    "2026-12-15T12:00:00+02",
  ],
  [
    "TND-CAB-2026-091",
    "مشروع البنية التحتية لمنظومة الفايبر الوطني",
    "وزارة الاتصالات والاقتصاد الرقمي",
    "it_systems",
    150,
    9600000,
    "2026-11-20T12:00:00+02",
  ],
];

const GAZETTE = [
  [
    215,
    "2026-09-18",
    "قرار بقانون بشأن تنظيم المعاملات المصرفية الرقمية وحماية البيانات الشخصية",
    "presidential_decree",
    "ينظم القرار بقانون فتح الحسابات الرقمية، ومسؤولية مزود الخدمة عن تسريب البيانات، وحق المواطن في الاطلاع والتصحيح.",
    "قرار بقانون رقم (215) لسنة 2026\n\nالمادة 1: يُسمى هذا القرار بقانون «تنظيم المعاملات المصرفية الرقمية وحماية البيانات الشخصية».\nالمادة 2: تسري أحكامه على المصارف ومزودي خدمات الدفع العاملين في دولة فلسطين.\nالمادة 3: لا تُعالج البيانات الشخصية إلا لغرض مصرفي محدد، وبموافقة صريحة قابلة للسحب.\nالمادة 4: يلتزم المزود بإشعار صاحب البيانات والجهة المختصة عند أي اختراق خلال اثنتين وسبعين ساعة.\nالمادة 5: يُعمل بهذا القرار بقانون من تاريخ نشره في الوقائع الفلسطينية.",
  ],
  [
    214,
    "2026-08-02",
    "قرار مجلس الوزراء بتشكيل اللجنة الوطنية العليا لتحديث السجل المدني السيادي",
    "cabinet_decision",
    "يشكل القرار لجنة برئاسة وزارة الداخلية لتحديث قيود الأحوال المدنية وربطها بالهوية الرقمية الوطنية.",
    "قرار مجلس الوزراء رقم (214) لسنة 2026\n\nالمادة 1: تُشكل لجنة وطنية عليا لتحديث السجل المدني السيادي برئاسة وزارة الداخلية وعضوية الأحوال المدنية ووزارة الاتصالات والاقتصاد الرقمي.\nالمادة 2: ترفع اللجنة تقريراً ربع سنوي إلى مجلس الوزراء عن اكتمال القيود وتصحيح الأسماء الرباعية.\nالمادة 3: لا يُعدل قيد مدني إلا بوثيقة رسمية وبعد مطابقة رقم الهوية.\nالمادة 4: يُنشر هذا القرار في الجريدة الرسمية.",
  ],
];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const before = await pool.query(`SELECT count(*)::int AS n FROM wallets`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const tender of TENDERS) {
      await client.query(
        `INSERT INTO public_tenders
          (tender_code, title, issuing_body, category, brochure_price, estimated_value, submission_deadline, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'open')
         ON CONFLICT (tender_code) DO NOTHING`,
        tender
      );
    }
    for (const edition of GAZETTE) {
      await client.query(
        `INSERT INTO official_gazette_editions
          (edition_number, issuance_date, title, decree_type, summary, full_text)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (edition_number) DO NOTHING`,
        edition
      );
    }
    const profile = await client.query(
      `SELECT id FROM profiles WHERE national_id = $1`,
      ["407926773"]
    );
    const userId = profile.rows[0]?.id;
    if (userId) {
      await client.query(
        `INSERT INTO cabinet_humanitarian_relief
          (user_id, case_number, aid_type, description, urgency_level, status, financial_grant_awarded)
         SELECT $1, 'PMO-AID-SEED4079', 'exceptional_medical',
           'إحالة طبية عاجلة لعلاج تخصصي خارج المحافظة، بانتظار الكشف الميداني لوحدة المساعدات في رئاسة الوزراء.',
           'high', 'field_investigation', 0
         WHERE NOT EXISTS (
           SELECT 1 FROM cabinet_humanitarian_relief WHERE case_number = 'PMO-AID-SEED4079'
         )`,
        [userId]
      );
      await client.query(
        `INSERT INTO jerusalem_support_cases
          (user_id, case_id, support_type, property_address, details, status)
         SELECT $1, 'JLM-RES-SEED4079', 'arnona_relief', 'البلدة القديمة - عقبة الخالدية',
           'طلب إسناد لضريبة الأرنونا عن محل تجاري صغير داخل البلدة القديمة، مع إرفاق عقد الإيجار الوقفي.',
           'pending_review'
         WHERE NOT EXISTS (
           SELECT 1 FROM jerusalem_support_cases WHERE case_id = 'JLM-RES-SEED4079'
         )`,
        [userId]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const after = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM wallets) AS wallets,
      (SELECT count(*)::int FROM border_permits) AS borders,
      (SELECT count(*)::int FROM public_tenders) AS tenders,
      (SELECT count(*)::int FROM official_gazette_editions) AS gazette,
      (SELECT count(*)::int FROM cabinet_humanitarian_relief WHERE case_number = 'PMO-AID-SEED4079') AS relief,
      (SELECT count(*)::int FROM jerusalem_support_cases WHERE case_id = 'JLM-RES-SEED4079') AS jerusalem
  `);
  const same = before.rows[0].n === after.rows[0].wallets;
  console.log(JSON.stringify({
    wallets_unchanged: same,
    wallet_rows: after.rows[0].wallets,
    border_rows: after.rows[0].borders,
    tenders: after.rows[0].tenders,
    gazette: after.rows[0].gazette,
    relief: after.rows[0].relief,
    jerusalem: after.rows[0].jerusalem,
  }));
  if (!same) process.exitCode = 1;
} catch (error) {
  console.error("PMO seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
