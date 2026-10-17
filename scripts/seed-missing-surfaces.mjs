/**
 * Seed civic reports, charity contributions, and job applications
 * for the accredited citizen NID 556677889.
 * Usage: node scripts/seed-missing-surfaces.mjs
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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

async function main() {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const citizen = await client.query(
      `SELECT id, full_name, national_id, status
       FROM profiles
       WHERE national_id = '556677889'
       LIMIT 1`
    );
    if (!citizen.rowCount) {
      throw new Error("Accredited citizen 556677889 was not found.");
    }
    const userId = citizen.rows[0].id;
    console.log(
      `[Seed] ${citizen.rows[0].full_name} (${citizen.rows[0].national_id}) status=${citizen.rows[0].status}`
    );

    await client.query(
      `INSERT INTO civic_incident_reports (
         user_id, category, governorate, city, location_description, details,
         report_tracking_id, status, admin_notes
       ) VALUES (
         $1, 'water_network', 'دير البلح', 'دير البلح',
         'شارع النخيل - بالقرب من المستودع المركزي',
         'انكسار في خط الإمداد الرئيسي المؤدي إلى الحي الشرقي، يرجى إرسال طواقم الصيانة الفنية لمنع هدر المياه.',
         'BALADY-2026-9041', 'assigned',
         'تم توجيه فريق طوارئ المياه التابع لبلدية دير البلح للموقع للمعاينة والإصلاح.'
       )
       ON CONFLICT (report_tracking_id) DO UPDATE SET
         status = EXCLUDED.status,
         admin_notes = EXCLUDED.admin_notes,
         details = EXCLUDED.details`,
      [userId]
    );

    const campaign = await client.query(
      `SELECT id, collected_amount
       FROM charity_campaigns
       WHERE category = 'gaza_relief' AND status = 'active'
       ORDER BY is_featured DESC, created_at DESC
       LIMIT 1`
    );
    if (!campaign.rowCount) {
      throw new Error("Active gaza_relief campaign was not found.");
    }

    const contribution = await client.query(
      `INSERT INTO charity_contributions (
         campaign_id, donor_id, amount, is_anonymous, receipt_number
       ) VALUES ($1, $2, 50.00, false, 'EHSAN-PS-88412')
       ON CONFLICT (receipt_number) DO NOTHING
       RETURNING id`,
      [campaign.rows[0].id, userId]
    );
    if (contribution.rowCount) {
      await client.query(
        `UPDATE charity_campaigns
         SET collected_amount = collected_amount + 50.00
         WHERE id = $1`,
        [campaign.rows[0].id]
      );
    }

    let job = await client.query(
      `SELECT id FROM job_postings
       WHERE title = 'مهندس شبكات وبنية تحتية'
         AND organization = 'Diab Logistics'
       LIMIT 1`
    );
    if (!job.rowCount) {
      job = await client.query(
        `INSERT INTO job_postings (
           posted_by, title, organization, type, location, description, salary, status
         ) VALUES (
           $1,
           'مهندس شبكات وبنية تحتية',
           'Diab Logistics',
           'private',
           'غزة',
           'إدارة الخوادم والشبكات اللوجستية لشركة دياب للخدمات اللوجستية.',
           'حسب الخبرة',
           'approved'
         )
         RETURNING id`,
        [userId]
      );
    }

    await client.query(
      `INSERT INTO job_applications (job_id, user_id, cover_letter, status)
       VALUES (
         $1, $2,
         'أمتلك خبرة 5 سنوات في إدارة الخوادم والبنية التحتية، وأرغب في المساهمة بتطوير الأنظمة اللوجستية الوطنية.',
         'under_review'
       )
       ON CONFLICT (job_id, user_id) DO UPDATE SET
         cover_letter = EXCLUDED.cover_letter,
         status = EXCLUDED.status`,
      [job.rows[0].id, userId]
    );

    await client.query("COMMIT");

    const verify = await client.query(
      `SELECT 'civic_incident_reports' AS surface, count(*)::int AS n
       FROM civic_incident_reports
       WHERE report_tracking_id = 'BALADY-2026-9041' AND user_id = $1
       UNION ALL
       SELECT 'charity_contributions', count(*)::int
       FROM charity_contributions
       WHERE receipt_number = 'EHSAN-PS-88412' AND donor_id = $1
       UNION ALL
       SELECT 'job_applications', count(*)::int
       FROM job_applications
       WHERE user_id = $1 AND status = 'under_review'`,
      [userId]
    );
    console.table(verify.rows);
    const missing = verify.rows.filter((r) => Number(r.n) < 1);
    if (missing.length) {
      console.error("FAIL: seed rows missing", missing);
      process.exitCode = 1;
    } else {
      console.log("✅ Missing civic surfaces seeded for 556677889.");
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
