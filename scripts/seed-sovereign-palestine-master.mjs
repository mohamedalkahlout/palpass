/**
 * Idempotent sovereign Palestinian civic seed.
 * Usage: node scripts/seed-sovereign-palestine-master.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
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

const dueInDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function upsertBill(client, userId, bill) {
  await client.query(
    `INSERT INTO bills (user_id, provider, amount, due_date, status, payment_code, payment_rail)
     SELECT $1, $2, $3, $4::date, 'unpaid', $5, $6
     WHERE NOT EXISTS (
       SELECT 1 FROM bills WHERE user_id = $1 AND provider = $2 AND status = 'unpaid'
     )`,
    [userId, bill.provider, bill.amount, dueInDays(bill.due), bill.code, bill.rail]
  );
}

async function upsertViolation(client, userId, row) {
  await client.query(
    `INSERT INTO violations (user_id, type, reason, location, amount, status, issued_at, case_number, citation, station)
     SELECT $1, $2, $3, $4, $5, 'unpaid', CURRENT_DATE, $6, $7, $8
     WHERE NOT EXISTS (
       SELECT 1 FROM violations WHERE user_id = $1 AND case_number = $6
     )`,
    [userId, row.type, row.reason, row.location, row.amount, row.caseNumber, row.citation, row.station]
  );
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

    await client.query(`
      ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_code TEXT;
      ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_rail TEXT;
      ALTER TABLE violations ADD COLUMN IF NOT EXISTS case_number TEXT;
      ALTER TABLE violations ADD COLUMN IF NOT EXISTS citation TEXT;
      ALTER TABLE violations ADD COLUMN IF NOT EXISTS station TEXT;
      ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS fare NUMERIC(10,2);
    `);

    const constraints = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.charity_campaigns'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%category%'
    `);
    for (const row of constraints.rows) {
      await client.query(`ALTER TABLE charity_campaigns DROP CONSTRAINT IF EXISTS "${String(row.conname).replaceAll('"', "")}"`);
    }
    await client.query(`
      ALTER TABLE charity_campaigns
      ADD CONSTRAINT charity_campaigns_category_check
      CHECK (category IN (
        'gaza_relief', 'debtors', 'orphans', 'healthcare', 'winter_aid', 'zakat', 'takkiya'
      ))
    `);

    await client.query(
      `DELETE FROM bills
       WHERE status = 'unpaid'
         AND provider = ANY($1::text[])`,
      [["فاتورة كهرباء وتوزيع غزة والوسطى", "مستحقات مياه وبلدية دير البلح"]]
    );
    await client.query(
      `DELETE FROM violations
       WHERE status = 'unpaid'
         AND case_number IS NULL
         AND type = 'مخالفة سير'`
    );
    await client.query(
      `DELETE FROM taxi_offices
       WHERE name = ANY($1::text[])`,
      [["مكتب القدس للتاكسي", "مكتب الكرامة"]]
    );
    await client.query(
      `UPDATE bus_routes SET is_active = FALSE WHERE bus_number = 'وطنية-01'`
    );

    const { rows: people } = await client.query(
      `SELECT id, national_id, full_name, city, role
       FROM profiles
       WHERE national_id = ANY($1::text[])`,
      [["407926773", "556677889", "123456123"]]
    );
    const byNid = Object.fromEntries(people.map((row) => [row.national_id, row]));
    const steward = byNid["407926773"];
    if (!steward) throw new Error("Master profile 407926773 was not found.");

    const billCatalog = [
      { provider: "شركة كهرباء محافظة القدس — JDECO", amount: 186.4, due: 18, code: "1001", rail: "PalPay" },
      { provider: "مصلحة مياه محافظة القدس — JWU", amount: 42.0, due: 12, code: "1101", rail: "i-BURAQ" },
      { provider: "شركة الاتصالات الفلسطينية — Paltel", amount: 79.0, due: 9, code: "1401", rail: "Jawwal Pay" },
      { provider: "بلدية غزة — ضريبة الأملاك ورسوم المعارف", amount: 65.0, due: 21, code: "1302", rail: "PalPay" },
    ];
    const violationCatalog = [
      {
        type: "شرطة المرور الفلسطينية",
        reason: "تجاوز السرعة المسموح بها بما يزيد عن 30 كم/ساعة",
        location: "شارع صلاح الدين / شارع 60",
        amount: 150,
        caseNumber: "TRF-PS-8841",
        citation: "قانون المرور رقم (5) لسنة 2000 — المادة 94",
        station: "إدارة شرطة المرور — رام الله والبيرة",
      },
      {
        type: "شرطة المرور الفلسطينية",
        reason: "استخدام الهاتف النقال يدوياً أثناء القيادة",
        location: "شارع الإرسال — رام الله",
        amount: 150,
        caseNumber: "TRF-PS-9022",
        citation: "قانون المرور رقم (5) لسنة 2000 — المادة 98",
        station: "مركز شرطة البيرة",
      },
      {
        type: "شرطة المرور الفلسطينية",
        reason: "عدم ربط حزام الأمان للسائق والراكب الأمامي",
        location: "شارع يافا — غزة",
        amount: 100,
        caseNumber: "TRF-PS-7714",
        citation: "قانون المرور رقم (5) لسنة 2000 — لائحته التنفيذية",
        station: "شرطة مرور محافظة غزة",
      },
      {
        type: "شرطة المرور الفلسطينية",
        reason: "قيادة مركبة برخصة سير منتهية الصلاحية",
        location: "شارع فيصل — نابلس",
        amount: 300,
        caseNumber: "TRF-PS-6510",
        citation: "قانون المرور رقم (5) لسنة 2000 — إحالة لنيابة مكافحة الجرائم المرورية",
        station: "شرطة مرور محافظة نابلس",
      },
    ];

    for (const person of people) {
      for (const bill of billCatalog) {
        await upsertBill(client, person.id, bill);
      }
      const fine = person.national_id === "556677889" ? violationCatalog[2] : violationCatalog[0];
      await upsertViolation(client, person.id, fine);
      if (person.national_id === "407926773") {
        await upsertViolation(client, person.id, violationCatalog[1]);
      }
      if (person.national_id === "123456123") {
        await upsertViolation(client, person.id, violationCatalog[3]);
      }
    }

    const clinics = {
      "407926773": {
        blood: "O+",
        center: "مديرية صحة رام الله والبيرة — مركز صحي البيرة الحكومي",
        insurance: "MOH-INS-2026-407926",
        facility: "مجمع فلسطين الطبي — رام الله",
      },
      "556677889": {
        blood: "A+",
        center: "مديرية صحة الخليل — مستشفى الخليل الحكومي عالية",
        insurance: "MOH-INS-2026-556677",
        facility: "مستشفى الخليل الحكومي — عالية",
      },
    };

    const vaccines = [
      ["لقاح السل BCG", "BCG", 1, "1990-01-15", "BCG-PS-1990"],
      ["اللقاح الخماسي", "Pentavalent", 1, "1990-03-15", "PENTA-PS-1"],
      ["اللقاح الخماسي", "Pentavalent", 2, "1990-05-15", "PENTA-PS-2"],
      ["اللقاح الخماسي", "Pentavalent", 3, "1990-07-15", "PENTA-PS-3"],
      ["شلل الأطفال الفموي", "OPV", 1, "1990-03-15", "OPV-PS-1"],
      ["شلل الأطفال المحقون", "IPV", 1, "1990-05-15", "IPV-PS-1"],
      ["الحصبة والحصبة الألمانية والنكاف", "MMR", 1, "1991-01-15", "MMR-PS-1"],
      ["لقاح الروتا فيروس", "Rotavirus", 1, "1990-03-15", "ROTA-PS-1"],
    ];

    for (const nid of ["407926773", "556677889"]) {
      const person = byNid[nid];
      const clinic = clinics[nid];
      if (!person) continue;
      await client.query(
        `INSERT INTO medical_profiles (user_id, blood_type, chronic_diseases, allergies, primary_health_center, insurance_number)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           blood_type = EXCLUDED.blood_type,
           primary_health_center = EXCLUDED.primary_health_center,
           insurance_number = EXCLUDED.insurance_number`,
        [person.id, clinic.blood, [], [], clinic.center, clinic.insurance]
      );
      for (const [ar, en, dose, date, batch] of vaccines) {
        await client.query(
          `INSERT INTO vaccination_records
             (user_id, vaccine_name_ar, vaccine_name_en, dose_number, administered_date, health_facility, batch_number)
           SELECT $1, $2, $3, $4, $5::date, $6, $7
           WHERE NOT EXISTS (
             SELECT 1 FROM vaccination_records
             WHERE user_id = $1 AND vaccine_name_en = $3 AND dose_number = $4
           )`,
          [person.id, ar, en, dose, date, clinic.facility, batch]
        );
      }
      const yellow = nid === "556677889";
      const cardNumber = yellow ? "UNRWA-Y-556677889" : "UNRWA-W-407926773";
      await client.query(
        `INSERT INTO aid_ration_cards
           (user_id, card_number, household_size, ration_status, next_distribution_cycle, center_location_ar, center_location_en, qr_hash)
         VALUES ($1, $2, $3, 'eligible', $4, $5, $6, $7)
         ON CONFLICT (card_number) DO UPDATE SET
           household_size = EXCLUDED.household_size,
           next_distribution_cycle = EXCLUDED.next_distribution_cycle,
           center_location_ar = EXCLUDED.center_location_ar,
           center_location_en = EXCLUDED.center_location_en`,
        [
          person.id,
          cardNumber,
          yellow ? 6 : 4,
          yellow ? "دورة تشرين الأول 2026 — الكابونة الصفراء" : "دورة تشرين الأول 2026 — الكابونة البيضاء",
          yellow ? "مركز توزيع الأونروا — مخيم الفوار / الخليل" : "مركز توزيع الأونروا — مخيم الأمعري / البيرة",
          yellow ? "UNRWA distribution centre — Fawwar camp, Hebron" : "UNRWA distribution centre — Amari camp, Al-Bireh",
          sha(cardNumber),
        ]
      );
    }

    const licenses = [
      ["562100129", "شركة فلسطين للاتصالات (بالتل) ش.م.ع", "Palestine Telecommunications Company (Paltel) PLC", "اتصالات", "رام الله", "407926773"],
      ["563984112", "شركة دياب للخدمات اللوجستية والنقل المبرد ش.خ.م", "Diab Refrigerated Logistics LLC", "نقل مبرد", "غزة", "556677889"],
      ["561220884", "شركة دواجن ومزارع فلسطين الوطنية", "Palestine National Poultry Farms", "إنتاج زراعي", "جنين", "556677889"],
    ];
    for (const [number, ar, en, activity, gov, ownerNid] of licenses) {
      const owner = byNid[ownerNid] || steward;
      await client.query(
        `INSERT INTO commercial_trade_licenses
           (owner_id, business_name_ar, business_name_en, license_number, activity_type, governorate, inspection_status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'compliant', '2027-12-31')
         ON CONFLICT (license_number) DO UPDATE SET
           business_name_ar = EXCLUDED.business_name_ar,
           business_name_en = EXCLUDED.business_name_en,
           activity_type = EXCLUDED.activity_type,
           governorate = EXCLUDED.governorate`,
        [owner.id, ar, en, number, activity, gov]
      );
    }

    const campaigns = [
      ["إغاثة غزة العاجلة", "Urgent Gaza relief", "سلة غذائية وطبية للأسر المتضررة في قطاع غزة عبر لجان الإغاثة المعتمدة.", "Food and medical parcels for affected families in the Gaza Strip.", "gaza_relief", 250000, 87550, 4200],
      ["سداد ديون الغارمين", "Relief of indebted families", "مساهمة وطنية لسداد ديون المواطنين المتعثرين عبر صندوق الزكاة.", "National contribution to settle debts of struggling households through the Zakat fund.", "debtors", 100000, 31200, 860],
      ["لجنة زكاة القدس المركزية", "Jerusalem Central Zakat Committee", "مصارف الزكاة الشرعية المرتبطة بالمسجد الأقصى المبارك.", "Sharia zakat disbursement linked to the blessed Al-Aqsa Mosque.", "zakat", 180000, 64000, 1500],
      ["تكية سيدنا إبراهيم الخليل", "Takiyat Ibrahim al-Khalil", "وجبات يومية وحساء سيدنا إبراهيم في الخليل القديمة.", "Daily meals and Ibrahim soup in the old city of Hebron.", "takkiya", 90000, 22150, 2200],
    ];
    for (const [titleAr, titleEn, descAr, descEn, category, target, collected, beneficiaries] of campaigns) {
      await client.query(
        `INSERT INTO charity_campaigns
           (title_ar, title_en, description_ar, description_en, category, target_amount, collected_amount, beneficiaries_count, status)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, 'active'
         WHERE NOT EXISTS (SELECT 1 FROM charity_campaigns WHERE title_ar = $1)`,
        [titleAr, titleEn, descAr, descEn, category, target, collected, beneficiaries]
      );
    }

    const taxis = [
      ["مكتب تاكسي المنارة", "رام الله", "02-2987111", "خط السرفيس الأصفر المرخص من مجمع المنارة والبيرة. التعرفة إلى نابلس 18.00 شيكل."],
      ["مكتب تاكسي وادي التفاح", "الخليل", "02-2225555", "كراج وادي التفاح وباب الزاوية. التعرفة من رام الله 25.00 شيكل."],
      ["مكتب تاكسي النجاح", "نابلس", "09-2381234", "مجمع الشهداء التجاري وكراج الرفيديا. التعرفة إلى جنين 15.00 شيكل."],
      ["مكتب تاكسي الكرامة الدولي", "أريحا", "02-2321111", "استراحة المعابر في أريحا. التعرفة من رام الله 16.00 شيكل."],
    ];
    for (const [name, city, phone, description] of taxis) {
      await client.query(
        `INSERT INTO taxi_offices (name, city, phone, description, is_approved)
         SELECT $1, $2, $3, $4, TRUE
         WHERE NOT EXISTS (SELECT 1 FROM taxi_offices WHERE name = $1)`,
        [name, city, phone, description]
      );
      await client.query(
        `UPDATE taxi_offices SET city = $2, phone = $3, description = $4, is_approved = TRUE WHERE name = $1`,
        [name, city, phone, description]
      );
    }

    const buses = [
      ["PS-SRV-01", "رام الله", "نابلس", ["06:00", "08:30", "11:00", "14:00", "17:30"], "سرفيس المنارة — مجمع الشهداء", 18],
      ["PS-SRV-02", "رام الله", "الخليل", ["06:15", "09:00", "12:30", "16:00"], "كراج البيرة — وادي التفاح", 25],
      ["PS-SRV-03", "رام الله", "أريحا", ["07:00", "10:00", "13:30", "16:30"], "استراحة المعابر", 16],
      ["PS-SRV-04", "نابلس", "جنين", ["06:30", "09:30", "13:00", "16:00"], "كراج الرفيديا — مجمع الكراجات الشمالي", 15],
      ["PS-SRV-05", "غزة", "دير البلح", ["06:00", "09:00", "12:00", "15:00", "18:00"], "موقف السرايا — شارع صلاح الدين", 6],
      ["PS-SRV-06", "غزة", "خان يونس", ["06:30", "10:00", "14:00", "17:30"], "موقف الجنوب المركزي", 8],
    ];
    for (const [number, fromCity, toCity, schedule, driver, fare] of buses) {
      await client.query(
        `INSERT INTO bus_routes (bus_number, from_city, to_city, schedule, driver_name, fare, is_active)
         SELECT $1, $2, $3, $4::jsonb, $5, $6, TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM bus_routes WHERE bus_number = $1 AND from_city = $2 AND to_city = $3
         )`,
        [number, fromCity, toCity, JSON.stringify(schedule), driver, fare]
      );
      await client.query(
        `UPDATE bus_routes
         SET schedule = $4::jsonb, driver_name = $5, fare = $6, is_active = TRUE
         WHERE bus_number = $1 AND from_city = $2 AND to_city = $3`,
        [number, fromCity, toCity, JSON.stringify(schedule), driver, fare]
      );
    }

    const jobs = [
      ["مهندس شبكات — ديوان الموظفين العام", "ديوان الموظفين العام الفلسطيني", "government", "رام الله", "مسابقة وظائف الفئة الأولى لشبكات الحكومة الإلكترونية.", "وفق سلم الخدمة المدنية"],
      ["طبيب بشري عام — وزارة الصحة", "وزارة الصحة الفلسطينية", "government", "نابلس", "تعيين في مستشفى رفيديا الجراحي الحكومي.", "وفق سلم الخدمة المدنية"],
      ["باحث قانوني — وزارة العدل", "وزارة العدل الفلسطينية", "government", "رام الله", "بحث تشريعي لدى ديوان الفتوى والتشريع.", "وفق سلم الخدمة المدنية"],
      ["مدقق حسابات — وزارة المالية", "وزارة المالية الفلسطينية", "government", "غزة", "تدقيق حسابات الخزينة والتحويلات.", "وفق سلم الخدمة المدنية"],
      ["منسق نقل مبرد", "شركة دياب للخدمات اللوجستية", "private", "دير البلح", "تشغيل خطوط النقل المبرد بين محافظات قطاع غزة.", "يحدد حسب الخبرة"],
    ];
    for (const [title, organization, type, location, description, salary] of jobs) {
      await client.query(
        `INSERT INTO job_postings (posted_by, title, organization, type, location, description, salary, status)
         SELECT $1, $2, $3, $4, $5, $6, $7, 'approved'
         WHERE NOT EXISTS (
           SELECT 1 FROM job_postings WHERE title = $2 AND organization = $3
         )`,
        [steward.id, title, organization, type, location, description, salary]
      );
    }

    const gazette = [
      ["الوقائع الفلسطينية — قرارات مجلس الوزراء", "ديوان الفتوى والتشريع", "نشر قرارات مجلس الوزراء وتعليمات سلطة النقد ووزارة المالية."],
      ["تعرفة المغادرة عبر الهيئة العامة للمعابر والحدود", "الهيئة العامة للمعابر والحدود", "ضريبة المغادرة والتنسيق الموحدة 170.00 شيكل عبر معبر الكرامة ومعبر رفح ومعبر بيت حانون."],
    ];
    for (const [title, source, content] of gazette) {
      await client.query(
        `INSERT INTO news_posts (author_id, title, excerpt, content, category, source_label, status)
         SELECT $1, $2, $3, $3, 'وقائع فلسطينية', $4, 'published'
         WHERE NOT EXISTS (SELECT 1 FROM news_posts WHERE title = $2)`,
        [steward.id, title, content, source]
      );
    }

    await client.query("NOTIFY pgrst, 'reload schema'");
    await client.query("COMMIT");

    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM bills) AS bills,
        (SELECT count(*)::int FROM violations) AS violations,
        (SELECT count(*)::int FROM medical_profiles) AS medical,
        (SELECT count(*)::int FROM vaccination_records) AS vaccines,
        (SELECT count(*)::int FROM aid_ration_cards) AS rations,
        (SELECT count(*)::int FROM commercial_trade_licenses) AS licenses,
        (SELECT count(*)::int FROM charity_campaigns) AS campaigns,
        (SELECT count(*)::int FROM taxi_offices WHERE is_approved) AS taxis,
        (SELECT count(*)::int FROM bus_routes WHERE is_active) AS buses,
        (SELECT count(*)::int FROM job_postings WHERE status = 'approved') AS jobs,
        (SELECT count(*)::int FROM news_posts WHERE status = 'published') AS gazette
    `);
    console.log(JSON.stringify({ seededProfiles: people.map((p) => p.national_id), counts: counts.rows[0] }));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
