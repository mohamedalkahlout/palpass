/**
 * Authentic hospital, taxi, and bus fixtures for Gaza, Jerusalem, and the West Bank.
 * Does not change wallet balances.
 * Usage: node scripts/seed-real-palestine-data.mjs
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

const dept = (pairs) => pairs.map(([ar, en]) => ({ ar, en }));

const hospitals = [
  ["مستشفى جمعية المقاصد الخيرية الإسلامية", "Al-Makassed Islamic Charitable Hospital", "jerusalem", "القدس", "charitable_ngo", "جبل الزيتون، القدس", "02-6270222", dept([["قسطرة وجراحة القلب", "Cardiac catheterization and surgery"], ["الأطفال", "Pediatrics"], ["الطوارئ", "Emergency"]]), 250],
  ["مستشفى المطلع (أوغستا فكتوريا)", "Augusta Victoria Hospital (Al-Mutlaa)", "jerusalem", "القدس", "charitable_ngo", "جبل الطور، القدس", "02-6279911", dept([["مركز الأورام والعلاج الإشعاعي", "Oncology and radiotherapy"], ["غسيل الكلى", "Dialysis"], ["الطوارئ", "Emergency"]]), 170],
  ["مجمع الشفاء الطبي الحكومي", "Al-Shifa Medical Complex", "gaza", "غزة", "government_moh", "شارع الوحدة، حي الرمال، غزة", "08-2824670", dept([["طوارئ وجراحة", "Emergency and surgery"], ["الباطنة", "Internal medicine"], ["النسائية والتوليد", "Obstetrics"]]), 600],
  ["مجمع ناصر الطبي", "Nasser Medical Complex", "khan_yunis", "خان يونس", "government_moh", "شارع البحر، خان يونس", "08-2051200", dept([["الطوارئ", "Emergency"], ["الجراحة", "Surgery"], ["العيادات الخارجية", "Outpatient clinics"]]), 350],
  ["المستشفى الإندونيسي", "Indonesian Hospital", "north_gaza", "بيت لاهيا", "government_moh", "بيت لاهيا، شمال غزة", "08-2475001", dept([["الطوارئ", "Emergency"], ["الجراحة", "Surgery"], ["الأطفال", "Pediatrics"]]), 140],
  ["مستشفى شهداء الأقصى الحكومي", "Al-Aqsa Martyrs Hospital", "deir_al_balah", "دير البلح", "government_moh", "طريق صلاح الدين، دير البلح", "08-2531005", dept([["الطوارئ", "Emergency"], ["الولادة", "Maternity"], ["الباطنة", "Internal medicine"]]), 180],
  ["مستشفى غزة الأوروبي", "European Gaza Hospital", "khan_yunis", "الفخاري", "government_moh", "الفخاري، خان يونس", "08-2060010", dept([["الجراحة", "Surgery"], ["الحروق", "Burns"], ["الطوارئ", "Emergency"]]), 240],
  ["مجمع فلسطين الطبي", "Palestine Medical Complex", "ramallah", "البيرة", "government_moh", "شارع الإرسال، البيرة - رام الله", "02-2982222", dept([["القلب", "Cardiology"], ["الطوارئ", "Emergency"], ["الجراحة", "Surgery"]]), 400],
  ["مستشفى رفيديا الجراحي الحكومي", "Rafidia Surgical Hospital", "nablus", "نابلس", "government_moh", "رفيديا، نابلس", "09-2383500", dept([["الجراحة", "Surgery"], ["العظام", "Orthopedics"], ["الطوارئ", "Emergency"]]), 210],
  ["مستشفى الخليل الحكومي (عالية)", "Hebron Governmental Hospital (Alia)", "hebron", "الخليل", "government_moh", "نمرة، الخليل", "02-2228181", dept([["الجراحة", "Surgery"], ["الباطنة", "Internal medicine"], ["الطوارئ", "Emergency"]]), 260],
  ["مستشفى بيت جالا الحكومي (الحسين)", "Beit Jala Governmental Hospital (Al-Hussein)", "bethlehem", "بيت جالا", "government_moh", "بيت جالا، بيت لحم", "02-2741151", dept([["النسائية والتوليد", "Obstetrics"], ["الأطفال", "Pediatrics"], ["الطوارئ", "Emergency"]]), 130],
  ["مستشفى جنين الحكومي (خليل سليمان)", "Jenin Governmental Hospital (Khalil Suleiman)", "jenin", "جنين", "government_moh", "جنين", "04-2436151", dept([["الطوارئ", "Emergency"], ["الجراحة", "Surgery"], ["الباطنة", "Internal medicine"]]), 160],
];

const taxis = [
  ["مكتب تكسيات القدس", "غزة", "08-2845555", "شارع عمر المختار، غزة. مكتب تكسي مرخص لخطوط المدينة."],
  ["مكتب تكسيات النصر الدولية", "غزة", "08-2856666", "تقاطع شارع النصر، غزة. تكسيات داخلية وخطوط الشمال."],
  ["تكسيات المنارة", "رام الله", "02-2951111", "ميدان المنارة، رام الله. سرفيس أصفر مرخص من مجمع المنارة."],
  ["تكسيات العاصمة", "القدس", "02-6283333", "باب العمود ووادي الجوز، القدس."],
];

const buses = [
  ["GAZ-SRY-KY", "غزة", "خان يونس", ["06:30", "10:00", "14:00", "17:30"], "كراج السرايا المركزي", 8],
  ["GAZ-SRY-RF", "غزة", "رفح", ["07:00", "11:00", "15:00"], "كراج السرايا المركزي", 8],
  ["GAZ-SRY-DB", "غزة", "دير البلح", ["06:00", "09:00", "12:00", "15:00", "18:00"], "كراج السرايا المركزي", 5],
  ["GAZ-SHJ-JB", "غزة", "جباليا", ["06:15", "09:30", "13:00", "16:30"], "كراج الشجاعية المركزي", 3.5],
  ["GAZ-SHJ-NG", "غزة", "بيت لاهيا", ["06:45", "10:30", "14:30"], "كراج الشجاعية المركزي", 3.5],
  ["WB-BIR-BZ", "البيرة", "بيرزيت", ["07:00", "09:00", "12:00", "15:00"], "مجمع كراجات البيرة المركزي", 4],
  ["WB-BIR-QL", "البيرة", "قلنديا", ["06:30", "09:30", "13:30", "16:30"], "مجمع كراجات البيرة المركزي", 12],
  ["WB-BIR-JR", "البيرة", "أريحا", ["07:00", "10:00", "13:30", "16:30"], "مجمع كراجات البيرة المركزي", 16],
  ["WB-BIR-NB", "البيرة", "نابلس", ["06:00", "08:30", "11:00", "14:00", "17:30"], "مجمع كراجات البيرة المركزي", 18],
  ["WB-NAB-TK", "نابلس", "طولكرم", ["06:30", "10:00", "14:00"], "كراج نابلس الغربي", 12],
  ["WB-NAB-JN", "نابلس", "جنين", ["06:30", "09:30", "13:00", "16:00"], "كراج نابلس الغربي", 15],
  ["WB-NAB-RM", "نابلس", "رام الله", ["06:00", "09:00", "12:30", "16:00"], "كراج نابلس الغربي", 18],
  ["WB-HEB-BT", "الخليل", "بيت لحم", ["06:30", "09:30", "13:00", "16:30"], "كراج الخليل المركزي (عين سارة)", 12],
  ["WB-HEB-DH", "الخليل", "الظاهرية", ["07:00", "11:00", "15:00"], "كراج الخليل المركزي (عين سارة)", 8],
  ["WB-HEB-YT", "الخليل", "يطا", ["07:15", "11:30", "15:30"], "كراج الخليل المركزي (عين سارة)", 7],
];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const client = await pool.connect();
try {
  const before = await client.query(`SELECT count(*)::int AS n FROM wallets`);
  await client.query("BEGIN");

  for (const row of hospitals) {
    const [nameAr, nameEn, governorate, city, sector, address, phone, departments, beds] = row;
    await client.query(
      `INSERT INTO palestinian_hospitals
         (name_ar, name_en, governorate, city, sector, address, phone, emergency_status, departments, total_bed_capacity)
       SELECT $1, $2, $3, $4, $5, $6, $7, 'open_24_7', $8::jsonb, $9
       WHERE NOT EXISTS (SELECT 1 FROM palestinian_hospitals WHERE name_ar = $1)`,
      [nameAr, nameEn, governorate, city, sector, address, phone, JSON.stringify(departments), beds]
    );
    await client.query(
      `UPDATE palestinian_hospitals
       SET name_en = $2, governorate = $3, city = $4, sector = $5, address = $6, phone = $7,
           emergency_status = 'open_24_7', departments = $8::jsonb, total_bed_capacity = $9
       WHERE name_ar = $1`,
      [nameAr, nameEn, governorate, city, sector, address, phone, JSON.stringify(departments), beds]
    );
  }

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

  for (const [number, fromCity, toCity, schedule, hub, fare] of buses) {
    await client.query(
      `INSERT INTO bus_routes (bus_number, from_city, to_city, schedule, driver_name, fare, is_active)
       SELECT $1, $2, $3, $4::jsonb, $5, $6, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM bus_routes WHERE bus_number = $1 AND from_city = $2 AND to_city = $3
       )`,
      [number, fromCity, toCity, JSON.stringify(schedule), hub, fare]
    );
    await client.query(
      `UPDATE bus_routes
       SET schedule = $4::jsonb, driver_name = $5, fare = $6, is_active = TRUE
       WHERE bus_number = $1 AND from_city = $2 AND to_city = $3`,
      [number, fromCity, toCity, JSON.stringify(schedule), hub, fare]
    );
  }

  const people = await client.query(
    `SELECT id, national_id FROM profiles WHERE national_id = ANY($1)`,
    [["407926773", "556677889"]]
  );
  const byNid = Object.fromEntries(people.rows.map((row) => [row.national_id, row.id]));
  if (!byNid["407926773"] || !byNid["556677889"]) {
    throw new Error("Required citizen profiles were not found.");
  }

  const licenses = [
    [byNid["407926773"], "PS-MOT-B-407926773", "B_private", "2020-04-12", "2030-04-12", "O+", 0],
    [byNid["556677889"], "PS-MOT-D1-556677889", "D1_commercial_taxi", "2023-05-01", "2028-05-01", "A+", 0],
  ];
  for (const [userId, number, licenseClass, issued, expiry, blood, points] of licenses) {
    await client.query(
      `INSERT INTO driving_licenses
         (user_id, license_number, license_class, issue_date, expiry_date, blood_type, demerit_points, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       ON CONFLICT (license_number) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         license_class = EXCLUDED.license_class,
         issue_date = EXCLUDED.issue_date,
         expiry_date = EXCLUDED.expiry_date,
         blood_type = EXCLUDED.blood_type,
         demerit_points = EXCLUDED.demerit_points,
         status = 'active'`,
      [userId, number, licenseClass, issued, expiry, blood, points]
    );
  }

  await client.query(
    `INSERT INTO citizen_vehicles
       (user_id, plate_number, make_model, model_year, vin_chassis, license_expiry, annual_license_fee, insurance_status)
     VALUES ($1, '3-4079-90', 'Skoda Octavia 2.0 TDI', 2023, 'TMBJG7NE5P0407990', '2027-01-15', 650.00, 'valid')
     ON CONFLICT (plate_number) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       make_model = EXCLUDED.make_model,
       model_year = EXCLUDED.model_year,
       vin_chassis = EXCLUDED.vin_chassis,
       license_expiry = EXCLUDED.license_expiry,
       annual_license_fee = EXCLUDED.annual_license_fee,
       insurance_status = EXCLUDED.insurance_status`,
    [byNid["407926773"]]
  );

  const pmc = await client.query(`SELECT id FROM palestinian_hospitals WHERE name_ar = 'مجمع فلسطين الطبي'`);
  const nasser = await client.query(`SELECT id FROM palestinian_hospitals WHERE name_ar = 'مجمع ناصر الطبي'`);
  const appointments = [
    [byNid["407926773"], pmc.rows[0].id, "القلب", "2026-10-20", "09:30", "REF-MOH-PMC4079"],
    [byNid["556677889"], nasser.rows[0].id, "العيادات الخارجية", "2026-10-22", "11:00", "REF-MOH-NAS5566"],
  ];
  for (const [userId, hospitalId, clinic, date, slot, code] of appointments) {
    await client.query(
      `INSERT INTO hospital_appointments
         (user_id, hospital_id, clinic_department, appointment_date, time_slot, referral_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
       ON CONFLICT (referral_code) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         hospital_id = EXCLUDED.hospital_id,
         clinic_department = EXCLUDED.clinic_department,
         appointment_date = EXCLUDED.appointment_date,
         time_slot = EXCLUDED.time_slot,
         status = 'confirmed'`,
      [userId, hospitalId, clinic, date, slot, code]
    );
  }

  await client.query("COMMIT");
  const after = await client.query(`SELECT count(*)::int AS n FROM wallets`);
  const counts = await client.query(`
    SELECT
      (SELECT count(*)::int FROM palestinian_hospitals) AS hospitals,
      (SELECT count(*)::int FROM driving_licenses) AS licenses,
      (SELECT count(*)::int FROM citizen_vehicles) AS vehicles,
      (SELECT count(*)::int FROM hospital_appointments) AS appointments
  `);
  console.log(JSON.stringify({
    wallets_unchanged: before.rows[0].n === after.rows[0].n,
    wallet_rows: after.rows[0].n,
    ...counts.rows[0],
  }));
  if (before.rows[0].n !== after.rows[0].n) process.exitCode = 1;
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
