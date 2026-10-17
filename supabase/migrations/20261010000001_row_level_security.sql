-- PALPASS migration chain (generated from live public schema)
-- sovereign RLS policies
-- idempotent: safe to apply repeatedly to a fresh Supabase project
-- Row Level Security — every public table (plus profiles);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.aid_claims ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.aid_packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.aid_ration_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.border_permits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cabinet_complaints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cabinet_humanitarian_relief ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.charity_campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.charity_contributions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.citizen_cvs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.citizen_vehicles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.civic_appointments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.civic_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.civic_incident_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commercial_trade_licenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.criminal_clearance_certs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cv_education ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cv_experience ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.driving_licenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.education_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_registry ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hajj_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hospital_appointments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.jerusalem_support_cases ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.justice_powers_of_attorney ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.official_gazette_editions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.palestinian_hospitals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.public_tenders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tax_clearance_certificates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.taxi_offices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tender_purchases ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aid_claims_own" ON public.aid_claims;
CREATE POLICY "aid_claims_own" ON public.aid_claims AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "aid_admin_all" ON public.aid_packages;
CREATE POLICY "aid_admin_all" ON public.aid_packages AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "aid_public" ON public.aid_packages;
CREATE POLICY "aid_public" ON public.aid_packages AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));

DROP POLICY IF EXISTS "Users read own ration cards" ON public.aid_ration_cards;
CREATE POLICY "Users read own ration cards" ON public.aid_ration_cards AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Verified users read own bills" ON public.bills;
CREATE POLICY "Verified users read own bills" ON public.bills AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "Verified users read own border permits" ON public.border_permits;
CREATE POLICY "Verified users read own border permits" ON public.border_permits AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "bus_admin_all" ON public.bus_routes;
CREATE POLICY "bus_admin_all" ON public.bus_routes AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "bus_public_read" ON public.bus_routes;
CREATE POLICY "bus_public_read" ON public.bus_routes AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));

DROP POLICY IF EXISTS "Users insert own complaints" ON public.cabinet_complaints;
CREATE POLICY "Users insert own complaints" ON public.cabinet_complaints AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read and create complaints" ON public.cabinet_complaints;
CREATE POLICY "Users read and create complaints" ON public.cabinet_complaints AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users insert own humanitarian relief" ON public.cabinet_humanitarian_relief;
CREATE POLICY "Users insert own humanitarian relief" ON public.cabinet_humanitarian_relief AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (status = 'submitted'::text) AND (COALESCE(financial_grant_awarded, (0)::numeric) = (0)::numeric)));

DROP POLICY IF EXISTS "Users read own humanitarian relief" ON public.cabinet_humanitarian_relief;
CREATE POLICY "Users read own humanitarian relief" ON public.cabinet_humanitarian_relief AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Public read charity campaigns" ON public.charity_campaigns;
CREATE POLICY "Public read charity campaigns" ON public.charity_campaigns AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Verified users access own contributions" ON public.charity_contributions;
CREATE POLICY "Verified users access own contributions" ON public.charity_contributions AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = donor_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true))) WITH CHECK (((auth.uid() = donor_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "Employers read submitted applicant CVs" ON public.citizen_cvs;
CREATE POLICY "Employers read submitted applicant CVs" ON public.citizen_cvs AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (job_applications ja
     JOIN job_postings jp ON ((jp.id = ja.job_id)))
  WHERE ((ja.user_id = citizen_cvs.user_id) AND (jp.posted_by = auth.uid())))));

DROP POLICY IF EXISTS "Users manage own CV" ON public.citizen_cvs;
CREATE POLICY "Users manage own CV" ON public.citizen_cvs AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own vehicles" ON public.citizen_vehicles;
CREATE POLICY "Users read own vehicles" ON public.citizen_vehicles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Verified users access own appointments" ON public.civic_appointments;
CREATE POLICY "Verified users access own appointments" ON public.civic_appointments AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true))) WITH CHECK (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "Users insert own documents" ON public.civic_documents;
CREATE POLICY "Users insert own documents" ON public.civic_documents AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own documents" ON public.civic_documents;
CREATE POLICY "Users read own documents" ON public.civic_documents AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Verified users access own reports" ON public.civic_incident_reports;
CREATE POLICY "Verified users access own reports" ON public.civic_incident_reports AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true))) WITH CHECK (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "Users access own trade licenses" ON public.commercial_trade_licenses;
CREATE POLICY "Users access own trade licenses" ON public.commercial_trade_licenses AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = owner_id)) WITH CHECK ((auth.uid() = owner_id));

DROP POLICY IF EXISTS "Users insert own criminal certs" ON public.criminal_clearance_certs;
CREATE POLICY "Users insert own criminal certs" ON public.criminal_clearance_certs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own criminal certs" ON public.criminal_clearance_certs;
CREATE POLICY "Users read own criminal certs" ON public.criminal_clearance_certs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "cv_edu_own" ON public.cv_education;
CREATE POLICY "cv_edu_own" ON public.cv_education AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "cv_edu_public" ON public.cv_education;
CREATE POLICY "cv_edu_public" ON public.cv_education AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = cv_education.user_id) AND (p.cv_public = true)))));

DROP POLICY IF EXISTS "cv_exp_own" ON public.cv_experience;
CREATE POLICY "cv_exp_own" ON public.cv_experience AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "cv_exp_public" ON public.cv_experience;
CREATE POLICY "cv_exp_public" ON public.cv_experience AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = cv_experience.user_id) AND (p.cv_public = true)))));

DROP POLICY IF EXISTS "donations_own" ON public.donations;
CREATE POLICY "donations_own" ON public.donations AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = donor_id));

DROP POLICY IF EXISTS "Users read own driving license" ON public.driving_licenses;
CREATE POLICY "Users read own driving license" ON public.driving_licenses AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own education records" ON public.education_records;
CREATE POLICY "Users read own education records" ON public.education_records AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own family book" ON public.family_registry;
CREATE POLICY "Users read own family book" ON public.family_registry AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = head_user_id));

DROP POLICY IF EXISTS "Verified users access own hajj apps" ON public.hajj_applications;
CREATE POLICY "Verified users access own hajj apps" ON public.hajj_applications AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true))) WITH CHECK (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "Users manage own hospital appointments" ON public.hospital_appointments;
CREATE POLICY "Users manage own hospital appointments" ON public.hospital_appointments AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users insert own Jerusalem support cases" ON public.jerusalem_support_cases;
CREATE POLICY "Users insert own Jerusalem support cases" ON public.jerusalem_support_cases AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (status = 'pending_review'::text)));

DROP POLICY IF EXISTS "Users read own Jerusalem support cases" ON public.jerusalem_support_cases;
CREATE POLICY "Users read own Jerusalem support cases" ON public.jerusalem_support_cases AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Verified users access own job apps" ON public.job_applications;
CREATE POLICY "Verified users access own job apps" ON public.job_applications AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true))) WITH CHECK (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "jobs_admin_all" ON public.job_postings;
CREATE POLICY "jobs_admin_all" ON public.job_postings AS PERMISSIVE FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "jobs_poster_own" ON public.job_postings;
CREATE POLICY "jobs_poster_own" ON public.job_postings AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = posted_by));

DROP POLICY IF EXISTS "jobs_public_approved" ON public.job_postings;
CREATE POLICY "jobs_public_approved" ON public.job_postings AS PERMISSIVE FOR SELECT TO public USING ((status = 'approved'::text));

DROP POLICY IF EXISTS "Verified users access own POA" ON public.justice_powers_of_attorney;
CREATE POLICY "Verified users access own POA" ON public.justice_powers_of_attorney AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = principal_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true))) WITH CHECK (((auth.uid() = principal_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "Users access own medical" ON public.medical_profiles;
CREATE POLICY "Users access own medical" ON public.medical_profiles AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "news_admin_all" ON public.news_posts;
CREATE POLICY "news_admin_all" ON public.news_posts AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "news_author_own" ON public.news_posts;
CREATE POLICY "news_author_own" ON public.news_posts AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = author_id));

DROP POLICY IF EXISTS "news_public_published" ON public.news_posts;
CREATE POLICY "news_public_published" ON public.news_posts AS PERMISSIVE FOR SELECT TO public USING ((status = 'published'::text));

DROP POLICY IF EXISTS "notif_admin_insert" ON public.notifications;
CREATE POLICY "notif_admin_insert" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "notif_own" ON public.notifications;
CREATE POLICY "notif_own" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Public read official gazette" ON public.official_gazette_editions;
CREATE POLICY "Public read official gazette" ON public.official_gazette_editions AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public read hospital network" ON public.palestinian_hospitals;
CREATE POLICY "Public read hospital network" ON public.palestinian_hospitals AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow individual insert" ON public.profiles;
CREATE POLICY "Allow individual insert" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));

DROP POLICY IF EXISTS "Allow individual select" ON public.profiles;
CREATE POLICY "Allow individual select" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles AS PERMISSIVE FOR ALL TO public USING (is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));

DROP POLICY IF EXISTS "Public read open tenders" ON public.public_tenders;
CREATE POLICY "Public read open tenders" ON public.public_tenders AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "rest_admin_all" ON public.restaurants;
CREATE POLICY "rest_admin_all" ON public.restaurants AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "rest_owner_own" ON public.restaurants;
CREATE POLICY "rest_owner_own" ON public.restaurants AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = owner_id));

DROP POLICY IF EXISTS "rest_public_approved" ON public.restaurants;
CREATE POLICY "rest_public_approved" ON public.restaurants AS PERMISSIVE FOR SELECT TO public USING ((status = 'approved'::text));

DROP POLICY IF EXISTS "svc_req_admin_all" ON public.service_requests;
CREATE POLICY "svc_req_admin_all" ON public.service_requests AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "svc_req_insert" ON public.service_requests;
CREATE POLICY "svc_req_insert" ON public.service_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "svc_req_own" ON public.service_requests;
CREATE POLICY "svc_req_own" ON public.service_requests AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own tax clearances" ON public.tax_clearance_certificates;
CREATE POLICY "Users read own tax clearances" ON public.tax_clearance_certificates AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "taxi_admin_all" ON public.taxi_offices;
CREATE POLICY "taxi_admin_all" ON public.taxi_offices AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "taxi_public_read" ON public.taxi_offices;
CREATE POLICY "taxi_public_read" ON public.taxi_offices AS PERMISSIVE FOR SELECT TO public USING ((is_approved = true));

DROP POLICY IF EXISTS "Users read own tender purchases" ON public.tender_purchases;
CREATE POLICY "Users read own tender purchases" ON public.tender_purchases AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own vaccines" ON public.vaccination_records;
CREATE POLICY "Users read own vaccines" ON public.vaccination_records AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Verified users read own violations" ON public.violations;
CREATE POLICY "Verified users read own violations" ON public.violations AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) AND (( SELECT profiles.is_verified
   FROM profiles
  WHERE (profiles.id = auth.uid())) = true)));

DROP POLICY IF EXISTS "wallet_tx_admin" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_admin" ON public.wallet_transactions AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

DROP POLICY IF EXISTS "wallet_tx_insert" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_insert" ON public.wallet_transactions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((wallet_id IN ( SELECT wallets.id
   FROM wallets
  WHERE (wallets.user_id = auth.uid()))));

DROP POLICY IF EXISTS "wallet_tx_select" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_select" ON public.wallet_transactions AS PERMISSIVE FOR SELECT TO public USING ((wallet_id IN ( SELECT wallets.id
   FROM wallets
  WHERE (wallets.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Users read own wallet" ON public.wallets;
CREATE POLICY "Users read own wallet" ON public.wallets AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
