-- PALPASS migration chain (generated from live public schema)
-- indexes for /verify and /track hot paths
-- idempotent: safe to apply repeatedly to a fresh Supabase project
CREATE UNIQUE INDEX IF NOT EXISTS border_permits_clearance_tracking_code_key ON public.border_permits USING btree (clearance_tracking_code);

CREATE INDEX IF NOT EXISTS idx_aid_ration_created ON public.aid_ration_cards USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aid_ration_user_id ON public.aid_ration_cards USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_border_permits_created ON public.border_permits USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_border_permits_user_id ON public.border_permits USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_charity_campaigns_created ON public.charity_campaigns USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_charity_contrib_campaign ON public.charity_contributions USING btree (campaign_id);

CREATE INDEX IF NOT EXISTS idx_charity_contrib_donor ON public.charity_contributions USING btree (donor_id);

CREATE INDEX IF NOT EXISTS idx_charity_contributions_created ON public.charity_contributions USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citizen_cvs_user ON public.citizen_cvs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_citizen_vehicles_user ON public.citizen_vehicles USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_civic_appointments_created ON public.civic_appointments USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_appointments_user_id ON public.civic_appointments USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_civic_docs_created ON public.civic_documents USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_documents_user_id ON public.civic_documents USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_civic_reports_created ON public.civic_incident_reports USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_reports_user_id ON public.civic_incident_reports USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.cabinet_complaints USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_criminal_certs_created ON public.criminal_clearance_certs USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_criminal_certs_user_id ON public.criminal_clearance_certs USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_driving_licenses_user ON public.driving_licenses USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_edu_user ON public.education_records USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_family_head ON public.family_registry USING btree (head_user_id);

CREATE INDEX IF NOT EXISTS idx_gazette_edition ON public.official_gazette_editions USING btree (edition_number);

CREATE INDEX IF NOT EXISTS idx_hajj_applications_user_id ON public.hajj_applications USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_hajj_apps_created ON public.hajj_applications USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hospital_appointments_user ON public.hospital_appointments USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_hospitals_governorate ON public.palestinian_hospitals USING btree (governorate);

CREATE INDEX IF NOT EXISTS idx_jerusalem_user ON public.jerusalem_support_cases USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_job_apps_created ON public.job_applications USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_apps_user_id ON public.job_applications USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_poa_created ON public.justice_powers_of_attorney USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_poa_principal_id ON public.justice_powers_of_attorney USING btree (principal_id);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_relief_user ON public.cabinet_humanitarian_relief USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON public.service_requests USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_tax_user ON public.tax_clearance_certificates USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_tender_purchases_user ON public.tender_purchases USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_tenders_status ON public.public_tenders USING btree (status);

CREATE INDEX IF NOT EXISTS idx_trade_licenses_created ON public.commercial_trade_licenses USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_licenses_owner ON public.commercial_trade_licenses USING btree (owner_id);

CREATE INDEX IF NOT EXISTS idx_vaccination_user_id ON public.vaccination_records USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_vaccines_created ON public.vaccination_records USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_violations_user_id ON public.violations USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON public.wallet_transactions USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON public.wallet_transactions USING btree (wallet_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_border_permits_qr_token ON public.border_permits USING btree (qr_token);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);
