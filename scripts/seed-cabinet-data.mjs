/**
 * Idempotent cabinet seed for the two primary test citizens.
 * Usage: node scripts/seed-cabinet-data.mjs
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

const CITIZENS = {
  "407926773": {
    school: "مدرسة شهداء غزة الثانوية للبنين",
    seat: "GAZ-2010-4079",
    tawjihiYear: 2010,
    studentNo: "BZ-CS-4079",
    degreeYear: 2014,
    gpa: 3.72,
    family: [
      ["901100001", "سارة محمد كحلوت", "spouse", "1992-04-12", "A+"],
      ["901100002", "يوسف محمد كحلوت", "son", "2016-09-03", "O+"],
      ["901100003", "مريم محمد كحلوت", "daughter", "2019-01-21", "A+"],
    ],
  },
  "556677889": {
    school: "مدرسة ذكور رام الله الثانوية",
    seat: "RAM-2008-5566",
    tawjihiYear: 2008,
    studentNo: "BZ-CS-5566",
    degreeYear: 2012,
    gpa: 3.45,
    family: [
      ["902200001", "هدى علي سلمان", "spouse", "1990-06-18", "B+"],
      ["902200002", "أحمد علي سلمان", "son", "2014-11-02", "O+"],
      ["902200003", "لينا علي سلمان", "daughter", "2017-05-30", "B+"],
    ],
  },
};

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
    for (const [nid, spec] of Object.entries(CITIZENS)) {
      const profile = await client.query(
        `SELECT id FROM profiles WHERE national_id = $1`,
        [nid]
      );
      const userId = profile.rows[0]?.id;
      if (!userId) throw new Error(`Profile missing for seeded citizen ${nid}`);

      await client.query(
        `INSERT INTO education_records
           (user_id, record_type, institution_name, degree_or_stream, seat_or_student_number, completion_year, gpa_or_grade, status)
         SELECT $1, 'tawjihi', $2, 'الفرع العلمي', $3, $4, 94.60, 'certified'
         WHERE NOT EXISTS (
           SELECT 1 FROM education_records
           WHERE user_id = $1 AND record_type = 'tawjihi' AND seat_or_student_number = $3
         )`,
        [userId, spec.school, spec.seat, spec.tawjihiYear]
      );
      await client.query(
        `INSERT INTO education_records
           (user_id, record_type, institution_name, degree_or_stream, seat_or_student_number, completion_year, gpa_or_grade, status)
         SELECT $1, 'university_degree', 'جامعة بيرزيت', 'بكالوريوس هندسة أنظمة الحاسوب', $2, $3, $4, 'certified'
         WHERE NOT EXISTS (
           SELECT 1 FROM education_records
           WHERE user_id = $1 AND record_type = 'university_degree' AND seat_or_student_number = $2
         )`,
        [userId, spec.studentNo, spec.degreeYear, spec.gpa]
      );

      for (const purpose of ["commercial_bid", "land_transfer"]) {
        await client.query(
          `INSERT INTO tax_clearance_certificates
             (user_id, purpose, income_tax_status, vat_status, property_tax_status)
           SELECT $1, $2, 'settled', 'settled', 'settled'
           WHERE NOT EXISTS (
             SELECT 1 FROM tax_clearance_certificates WHERE user_id = $1 AND purpose = $2
           )`,
          [userId, purpose]
        );
      }

      for (const [memberNid, name, relation, birth, blood] of spec.family) {
        await client.query(
          `INSERT INTO family_registry
             (head_user_id, member_nid, member_name, relationship, birth_date, blood_type, national_health_insured)
           VALUES ($1, $2, $3, $4, $5::date, $6, true)
           ON CONFLICT (head_user_id, member_nid) DO NOTHING`,
          [userId, memberNid, name, relation, birth, blood]
        );
      }

      await client.query(
        `INSERT INTO cabinet_complaints
           (user_id, targeted_ministry, subject, details, status)
         SELECT $1, 'وزارة الحكم المحلي',
           'تدهور الطريق الواصل بين الحي والمدرسة',
           'الطريق الرئيس في الحي يعاني من حفر عميقة تعيق وصول الطلبة والمركبات، ويُطلب من وزارة الحكم المحلي معالجة المقطع خلال المهلة النظامية.',
           'under_ministerial_review'
         WHERE NOT EXISTS (
           SELECT 1 FROM cabinet_complaints
           WHERE user_id = $1 AND targeted_ministry = 'وزارة الحكم المحلي'
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
      (SELECT count(*)::int FROM education_records) AS education,
      (SELECT count(*)::int FROM tax_clearance_certificates) AS tax,
      (SELECT count(*)::int FROM family_registry) AS family,
      (SELECT count(*)::int FROM cabinet_complaints) AS complaints
  `);
  console.log(
    JSON.stringify({
      wallets_unchanged: before.rows[0].n === after.rows[0].wallets,
      border_rows: after.rows[0].borders,
      education: after.rows[0].education,
      tax: after.rows[0].tax,
      family: after.rows[0].family,
      complaints: after.rows[0].complaints,
    })
  );
} catch (error) {
  console.error("Cabinet seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
