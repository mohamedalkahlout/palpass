-- PALPASS migration chain (generated from live public schema)
-- core tables, relations, constraints, audit columns, shared functions
-- idempotent: safe to apply repeatedly to a fresh Supabase project
CREATE OR REPLACE FUNCTION public.assert_actor_or_service(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role TEXT;
  v_auth_uid UUID;
BEGIN
  v_jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  v_auth_uid := auth.uid();

  IF v_jwt_role = 'service_role' THEN
    RETURN;
  END IF;

  IF v_auth_uid IS NULL OR v_jwt_role = 'anon' THEN
    RAISE EXCEPTION 'رفض أمني: غير مصرح بتنفيذ المعاملات المالية لهوية غير موثقة';
  END IF;

  IF v_auth_uid <> p_user_id THEN
    RAISE EXCEPTION 'رفض أمني: لا يمكنك التصرف في حساب مواطن آخر';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  jwt_role TEXT := COALESCE(auth.jwt() ->> 'role', '');
  actor_is_admin BOOLEAN := FALSE;
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Direct maintenance sessions have no JWT. Citizen and admin API calls always do.
  IF jwt_role = '' AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO actor_is_admin;

  IF actor_is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل الرتبة السيادية لحسابك.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل حالة الاعتماد الرسمي لحسابك.';
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل علامة التوثيق الرسمية.';
  END IF;
  IF NEW.national_id IS DISTINCT FROM OLD.national_id THEN
    RAISE EXCEPTION 'رقم الهوية الوطنية السيادي غير قابل للتعديل بعد التسجيل.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.aid_claims (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    package_id uuid,
    user_id uuid,
    status text DEFAULT 'pending'::text,
    claimed_at timestamp with time zone
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_claims_status_check' AND c.conrelid = 'public.aid_claims'::regclass) THEN
    ALTER TABLE public.aid_claims ADD CONSTRAINT aid_claims_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'claimed'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_claims_pkey' AND c.conrelid = 'public.aid_claims'::regclass) THEN
    ALTER TABLE public.aid_claims ADD CONSTRAINT aid_claims_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.aid_packages (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    type text,
    eligibility text,
    distribution_date date,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_packages_type_check' AND c.conrelid = 'public.aid_packages'::regclass) THEN
    ALTER TABLE public.aid_packages ADD CONSTRAINT aid_packages_type_check CHECK (type = ANY (ARRAY['material'::text, 'financial'::text, 'mixed'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_packages_pkey' AND c.conrelid = 'public.aid_packages'::regclass) THEN
    ALTER TABLE public.aid_packages ADD CONSTRAINT aid_packages_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.aid_ration_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    card_number text NOT NULL,
    household_size integer DEFAULT 1 NOT NULL,
    ration_status text DEFAULT 'eligible'::text NOT NULL,
    next_distribution_cycle text NOT NULL,
    center_location_ar text NOT NULL,
    center_location_en text NOT NULL,
    qr_hash text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_ration_cards_ration_status_check' AND c.conrelid = 'public.aid_ration_cards'::regclass) THEN
    ALTER TABLE public.aid_ration_cards ADD CONSTRAINT aid_ration_cards_ration_status_check CHECK (ration_status = ANY (ARRAY['eligible'::text, 'disbursed'::text, 'under_review'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_ration_cards_pkey' AND c.conrelid = 'public.aid_ration_cards'::regclass) THEN
    ALTER TABLE public.aid_ration_cards ADD CONSTRAINT aid_ration_cards_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_ration_cards_card_number_key' AND c.conrelid = 'public.aid_ration_cards'::regclass) THEN
    ALTER TABLE public.aid_ration_cards ADD CONSTRAINT aid_ration_cards_card_number_key UNIQUE (card_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bills (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    provider text NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date,
    status text DEFAULT 'unpaid'::text,
    paid_at timestamp with time zone,
    payment_code text,
    payment_rail text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'bills_status_check' AND c.conrelid = 'public.bills'::regclass) THEN
    ALTER TABLE public.bills ADD CONSTRAINT bills_status_check CHECK (status = ANY (ARRAY['unpaid'::text, 'paid'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'bills_pkey' AND c.conrelid = 'public.bills'::regclass) THEN
    ALTER TABLE public.bills ADD CONSTRAINT bills_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.border_permits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    crossing_name text NOT NULL,
    travel_date date NOT NULL,
    travel_purpose text NOT NULL,
    companions_count integer DEFAULT 0 NOT NULL,
    permit_number text,
    status text DEFAULT 'under_review'::text NOT NULL,
    qr_token text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name_passport_ar text,
    full_name_passport_en text,
    passport_number text,
    passport_expiry_date date,
    destination_country text,
    travel_category text,
    companions_data jsonb DEFAULT '[]'::jsonb,
    special_logistics jsonb DEFAULT '{}'::jsonb,
    coordination_fee_ils numeric(10,2) DEFAULT 170.00 NOT NULL,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    clearance_tracking_code text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'border_permits_crossing_name_check' AND c.conrelid = 'public.border_permits'::regclass) THEN
    ALTER TABLE public.border_permits ADD CONSTRAINT border_permits_crossing_name_check CHECK (crossing_name = ANY (ARRAY['karameh_bridge'::text, 'rafah_crossing'::text, 'erez_crossing'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'border_permits_payment_status_check' AND c.conrelid = 'public.border_permits'::regclass) THEN
    ALTER TABLE public.border_permits ADD CONSTRAINT border_permits_payment_status_check CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'exempt'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'border_permits_status_check' AND c.conrelid = 'public.border_permits'::regclass) THEN
    ALTER TABLE public.border_permits ADD CONSTRAINT border_permits_status_check CHECK (status = ANY (ARRAY['under_review'::text, 'approved'::text, 'rejected'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'border_permits_travel_category_check' AND c.conrelid = 'public.border_permits'::regclass) THEN
    ALTER TABLE public.border_permits ADD CONSTRAINT border_permits_travel_category_check CHECK (travel_category IS NULL OR (travel_category = ANY (ARRAY['medical'::text, 'education'::text, 'business'::text, 'humanitarian'::text, 'tourism_family'::text, 'delegation'::text])));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'border_permits_pkey' AND c.conrelid = 'public.border_permits'::regclass) THEN
    ALTER TABLE public.border_permits ADD CONSTRAINT border_permits_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'border_permits_permit_number_key' AND c.conrelid = 'public.border_permits'::regclass) THEN
    ALTER TABLE public.border_permits ADD CONSTRAINT border_permits_permit_number_key UNIQUE (permit_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bus_routes (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    bus_number text NOT NULL,
    from_city text NOT NULL,
    to_city text NOT NULL,
    schedule jsonb,
    driver_name text,
    driver_image text,
    bus_image text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    fare numeric(10,2)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'bus_routes_pkey' AND c.conrelid = 'public.bus_routes'::regclass) THEN
    ALTER TABLE public.bus_routes ADD CONSTRAINT bus_routes_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cabinet_complaints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tracking_code text DEFAULT ('PAL-CAB-'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL,
    targeted_ministry text NOT NULL,
    subject text NOT NULL,
    details text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    sla_due_date date DEFAULT (CURRENT_DATE + '14 days'::interval) NOT NULL,
    ministerial_response text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_complaints_status_check' AND c.conrelid = 'public.cabinet_complaints'::regclass) THEN
    ALTER TABLE public.cabinet_complaints ADD CONSTRAINT cabinet_complaints_status_check CHECK (status = ANY (ARRAY['submitted'::text, 'under_ministerial_review'::text, 'resolved'::text, 'dismissed'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_complaints_pkey' AND c.conrelid = 'public.cabinet_complaints'::regclass) THEN
    ALTER TABLE public.cabinet_complaints ADD CONSTRAINT cabinet_complaints_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_complaints_tracking_code_key' AND c.conrelid = 'public.cabinet_complaints'::regclass) THEN
    ALTER TABLE public.cabinet_complaints ADD CONSTRAINT cabinet_complaints_tracking_code_key UNIQUE (tracking_code);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cabinet_humanitarian_relief (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    case_number text DEFAULT ('PMO-AID-'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL,
    aid_type text NOT NULL,
    description text NOT NULL,
    urgency_level text DEFAULT 'high'::text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    financial_grant_awarded numeric(10,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_humanitarian_relief_aid_type_check' AND c.conrelid = 'public.cabinet_humanitarian_relief'::regclass) THEN
    ALTER TABLE public.cabinet_humanitarian_relief ADD CONSTRAINT cabinet_humanitarian_relief_aid_type_check CHECK (aid_type = ANY (ARRAY['exceptional_medical'::text, 'home_reconstruction'::text, 'urgent_stipend'::text, 'education_grant'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_humanitarian_relief_status_check' AND c.conrelid = 'public.cabinet_humanitarian_relief'::regclass) THEN
    ALTER TABLE public.cabinet_humanitarian_relief ADD CONSTRAINT cabinet_humanitarian_relief_status_check CHECK (status = ANY (ARRAY['submitted'::text, 'field_investigation'::text, 'approved_by_pm'::text, 'disbursed'::text, 'rejected'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_humanitarian_relief_urgency_level_check' AND c.conrelid = 'public.cabinet_humanitarian_relief'::regclass) THEN
    ALTER TABLE public.cabinet_humanitarian_relief ADD CONSTRAINT cabinet_humanitarian_relief_urgency_level_check CHECK (urgency_level = ANY (ARRAY['critical'::text, 'high'::text, 'standard'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_humanitarian_relief_pkey' AND c.conrelid = 'public.cabinet_humanitarian_relief'::regclass) THEN
    ALTER TABLE public.cabinet_humanitarian_relief ADD CONSTRAINT cabinet_humanitarian_relief_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_humanitarian_relief_case_number_key' AND c.conrelid = 'public.cabinet_humanitarian_relief'::regclass) THEN
    ALTER TABLE public.cabinet_humanitarian_relief ADD CONSTRAINT cabinet_humanitarian_relief_case_number_key UNIQUE (case_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.charity_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title_ar text NOT NULL,
    title_en text NOT NULL,
    description_ar text NOT NULL,
    description_en text NOT NULL,
    category text NOT NULL,
    target_amount numeric(12,2) NOT NULL,
    collected_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    beneficiaries_count integer DEFAULT 0 NOT NULL,
    image_url text,
    is_featured boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_campaigns_category_check' AND c.conrelid = 'public.charity_campaigns'::regclass) THEN
    ALTER TABLE public.charity_campaigns ADD CONSTRAINT charity_campaigns_category_check CHECK (category = ANY (ARRAY['gaza_relief'::text, 'debtors'::text, 'orphans'::text, 'healthcare'::text, 'winter_aid'::text, 'zakat'::text, 'takkiya'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_campaigns_status_check' AND c.conrelid = 'public.charity_campaigns'::regclass) THEN
    ALTER TABLE public.charity_campaigns ADD CONSTRAINT charity_campaigns_status_check CHECK (status = ANY (ARRAY['active'::text, 'completed'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_campaigns_pkey' AND c.conrelid = 'public.charity_campaigns'::regclass) THEN
    ALTER TABLE public.charity_campaigns ADD CONSTRAINT charity_campaigns_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.charity_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    donor_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL,
    receipt_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_contributions_amount_check' AND c.conrelid = 'public.charity_contributions'::regclass) THEN
    ALTER TABLE public.charity_contributions ADD CONSTRAINT charity_contributions_amount_check CHECK (amount > 0::numeric);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_contributions_pkey' AND c.conrelid = 'public.charity_contributions'::regclass) THEN
    ALTER TABLE public.charity_contributions ADD CONSTRAINT charity_contributions_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_contributions_receipt_number_key' AND c.conrelid = 'public.charity_contributions'::regclass) THEN
    ALTER TABLE public.charity_contributions ADD CONSTRAINT charity_contributions_receipt_number_key UNIQUE (receipt_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.citizen_cvs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_type text DEFAULT 'professional'::text NOT NULL,
    personal_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    summary text,
    work_experience jsonb DEFAULT '[]'::jsonb NOT NULL,
    education jsonb DEFAULT '[]'::jsonb NOT NULL,
    skills jsonb DEFAULT '[]'::jsonb NOT NULL,
    certifications jsonb DEFAULT '[]'::jsonb NOT NULL,
    academic_publications jsonb DEFAULT '[]'::jsonb NOT NULL,
    languages jsonb DEFAULT '[]'::jsonb NOT NULL,
    signature_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_cvs_template_type_check' AND c.conrelid = 'public.citizen_cvs'::regclass) THEN
    ALTER TABLE public.citizen_cvs ADD CONSTRAINT citizen_cvs_template_type_check CHECK (template_type = ANY (ARRAY['professional'::text, 'academic'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_cvs_pkey' AND c.conrelid = 'public.citizen_cvs'::regclass) THEN
    ALTER TABLE public.citizen_cvs ADD CONSTRAINT citizen_cvs_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'unique_user_cv' AND c.conrelid = 'public.citizen_cvs'::regclass) THEN
    ALTER TABLE public.citizen_cvs ADD CONSTRAINT unique_user_cv UNIQUE (user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.citizen_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plate_number text NOT NULL,
    make_model text NOT NULL,
    model_year integer NOT NULL,
    vin_chassis text NOT NULL,
    license_expiry date NOT NULL,
    annual_license_fee numeric(10,2) DEFAULT 650.00 NOT NULL,
    insurance_status text DEFAULT 'valid'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_vehicles_insurance_status_check' AND c.conrelid = 'public.citizen_vehicles'::regclass) THEN
    ALTER TABLE public.citizen_vehicles ADD CONSTRAINT citizen_vehicles_insurance_status_check CHECK (insurance_status = ANY (ARRAY['valid'::text, 'expired'::text, 'uninsured'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_vehicles_pkey' AND c.conrelid = 'public.citizen_vehicles'::regclass) THEN
    ALTER TABLE public.citizen_vehicles ADD CONSTRAINT citizen_vehicles_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_vehicles_plate_number_key' AND c.conrelid = 'public.citizen_vehicles'::regclass) THEN
    ALTER TABLE public.citizen_vehicles ADD CONSTRAINT citizen_vehicles_plate_number_key UNIQUE (plate_number);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_vehicles_vin_chassis_key' AND c.conrelid = 'public.citizen_vehicles'::regclass) THEN
    ALTER TABLE public.citizen_vehicles ADD CONSTRAINT citizen_vehicles_vin_chassis_key UNIQUE (vin_chassis);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.civic_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ministry_code text NOT NULL,
    ministry_name_ar text NOT NULL,
    ministry_name_en text NOT NULL,
    service_name_ar text NOT NULL,
    service_name_en text NOT NULL,
    branch_location_ar text NOT NULL,
    branch_location_en text NOT NULL,
    appointment_date date NOT NULL,
    time_slot text NOT NULL,
    booking_reference text NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_appointments_status_check' AND c.conrelid = 'public.civic_appointments'::regclass) THEN
    ALTER TABLE public.civic_appointments ADD CONSTRAINT civic_appointments_status_check CHECK (status = ANY (ARRAY['confirmed'::text, 'attended'::text, 'cancelled'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_appointments_pkey' AND c.conrelid = 'public.civic_appointments'::regclass) THEN
    ALTER TABLE public.civic_appointments ADD CONSTRAINT civic_appointments_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_appointments_booking_reference_key' AND c.conrelid = 'public.civic_appointments'::regclass) THEN
    ALTER TABLE public.civic_appointments ADD CONSTRAINT civic_appointments_booking_reference_key UNIQUE (booking_reference);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.civic_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    doc_type text NOT NULL,
    doc_number text NOT NULL,
    title_ar text NOT NULL,
    title_en text NOT NULL,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    expiry_date date NOT NULL,
    meta_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_documents_doc_type_check' AND c.conrelid = 'public.civic_documents'::regclass) THEN
    ALTER TABLE public.civic_documents ADD CONSTRAINT civic_documents_doc_type_check CHECK (doc_type = ANY (ARRAY['driving_license'::text, 'vehicle_registration'::text, 'health_insurance'::text, 'family_book'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_documents_status_check' AND c.conrelid = 'public.civic_documents'::regclass) THEN
    ALTER TABLE public.civic_documents ADD CONSTRAINT civic_documents_status_check CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'suspended'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_documents_pkey' AND c.conrelid = 'public.civic_documents'::regclass) THEN
    ALTER TABLE public.civic_documents ADD CONSTRAINT civic_documents_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_documents_doc_number_key' AND c.conrelid = 'public.civic_documents'::regclass) THEN
    ALTER TABLE public.civic_documents ADD CONSTRAINT civic_documents_doc_number_key UNIQUE (doc_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.civic_incident_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    governorate text NOT NULL,
    city text NOT NULL,
    location_description text NOT NULL,
    details text NOT NULL,
    photo_url text,
    report_tracking_id text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_incident_reports_category_check' AND c.conrelid = 'public.civic_incident_reports'::regclass) THEN
    ALTER TABLE public.civic_incident_reports ADD CONSTRAINT civic_incident_reports_category_check CHECK (category = ANY (ARRAY['water_network'::text, 'electricity'::text, 'roads_potholes'::text, 'price_gouging'::text, 'sanitation'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_incident_reports_status_check' AND c.conrelid = 'public.civic_incident_reports'::regclass) THEN
    ALTER TABLE public.civic_incident_reports ADD CONSTRAINT civic_incident_reports_status_check CHECK (status = ANY (ARRAY['submitted'::text, 'under_investigation'::text, 'assigned'::text, 'resolved'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_incident_reports_pkey' AND c.conrelid = 'public.civic_incident_reports'::regclass) THEN
    ALTER TABLE public.civic_incident_reports ADD CONSTRAINT civic_incident_reports_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_incident_reports_report_tracking_id_key' AND c.conrelid = 'public.civic_incident_reports'::regclass) THEN
    ALTER TABLE public.civic_incident_reports ADD CONSTRAINT civic_incident_reports_report_tracking_id_key UNIQUE (report_tracking_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.commercial_trade_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    business_name_ar text NOT NULL,
    business_name_en text NOT NULL,
    license_number text NOT NULL,
    activity_type text NOT NULL,
    governorate text NOT NULL,
    inspection_status text DEFAULT 'compliant'::text NOT NULL,
    expires_at date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'commercial_trade_licenses_inspection_status_check' AND c.conrelid = 'public.commercial_trade_licenses'::regclass) THEN
    ALTER TABLE public.commercial_trade_licenses ADD CONSTRAINT commercial_trade_licenses_inspection_status_check CHECK (inspection_status = ANY (ARRAY['compliant'::text, 'inspection_due'::text, 'violation_issued'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'commercial_trade_licenses_pkey' AND c.conrelid = 'public.commercial_trade_licenses'::regclass) THEN
    ALTER TABLE public.commercial_trade_licenses ADD CONSTRAINT commercial_trade_licenses_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'commercial_trade_licenses_license_number_key' AND c.conrelid = 'public.commercial_trade_licenses'::regclass) THEN
    ALTER TABLE public.commercial_trade_licenses ADD CONSTRAINT commercial_trade_licenses_license_number_key UNIQUE (license_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.criminal_clearance_certs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    cert_number text NOT NULL,
    purpose text NOT NULL,
    status text DEFAULT 'issued'::text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    qr_verification_token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'criminal_clearance_certs_status_check' AND c.conrelid = 'public.criminal_clearance_certs'::regclass) THEN
    ALTER TABLE public.criminal_clearance_certs ADD CONSTRAINT criminal_clearance_certs_status_check CHECK (status = ANY (ARRAY['processing'::text, 'issued'::text, 'rejected'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'criminal_clearance_certs_pkey' AND c.conrelid = 'public.criminal_clearance_certs'::regclass) THEN
    ALTER TABLE public.criminal_clearance_certs ADD CONSTRAINT criminal_clearance_certs_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'criminal_clearance_certs_cert_number_key' AND c.conrelid = 'public.criminal_clearance_certs'::regclass) THEN
    ALTER TABLE public.criminal_clearance_certs ADD CONSTRAINT criminal_clearance_certs_cert_number_key UNIQUE (cert_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cv_education (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    degree text NOT NULL,
    institution text NOT NULL,
    year text,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cv_education_pkey' AND c.conrelid = 'public.cv_education'::regclass) THEN
    ALTER TABLE public.cv_education ADD CONSTRAINT cv_education_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cv_experience (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    company text NOT NULL,
    from_year text,
    to_year text,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cv_experience_pkey' AND c.conrelid = 'public.cv_experience'::regclass) THEN
    ALTER TABLE public.cv_experience ADD CONSTRAINT cv_experience_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.donations (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    donor_id uuid,
    initiative text NOT NULL,
    amount numeric(10,2) NOT NULL,
    wallet_ref uuid,
    donated_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'donations_pkey' AND c.conrelid = 'public.donations'::regclass) THEN
    ALTER TABLE public.donations ADD CONSTRAINT donations_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.driving_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    license_number text NOT NULL,
    license_class text NOT NULL,
    issue_date date NOT NULL,
    expiry_date date NOT NULL,
    blood_type text NOT NULL,
    demerit_points integer DEFAULT 0 NOT NULL,
    restrictions text DEFAULT 'نظارة طبية / قيادة نهارية'::text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'driving_licenses_license_class_check' AND c.conrelid = 'public.driving_licenses'::regclass) THEN
    ALTER TABLE public.driving_licenses ADD CONSTRAINT driving_licenses_license_class_check CHECK (license_class = ANY (ARRAY['B_private'::text, 'D1_commercial_taxi'::text, 'C1_light_truck'::text, 'A_motorcycle'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'driving_licenses_status_check' AND c.conrelid = 'public.driving_licenses'::regclass) THEN
    ALTER TABLE public.driving_licenses ADD CONSTRAINT driving_licenses_status_check CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'suspended'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'driving_licenses_pkey' AND c.conrelid = 'public.driving_licenses'::regclass) THEN
    ALTER TABLE public.driving_licenses ADD CONSTRAINT driving_licenses_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'driving_licenses_license_number_key' AND c.conrelid = 'public.driving_licenses'::regclass) THEN
    ALTER TABLE public.driving_licenses ADD CONSTRAINT driving_licenses_license_number_key UNIQUE (license_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.education_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    record_type text NOT NULL,
    institution_name text NOT NULL,
    degree_or_stream text NOT NULL,
    seat_or_student_number text NOT NULL,
    completion_year integer NOT NULL,
    gpa_or_grade numeric(5,2) NOT NULL,
    verification_token text DEFAULT ('PAL-EDU-'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL,
    status text DEFAULT 'certified'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'education_records_record_type_check' AND c.conrelid = 'public.education_records'::regclass) THEN
    ALTER TABLE public.education_records ADD CONSTRAINT education_records_record_type_check CHECK (record_type = ANY (ARRAY['tawjihi'::text, 'university_degree'::text, 'student_loan'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'education_records_status_check' AND c.conrelid = 'public.education_records'::regclass) THEN
    ALTER TABLE public.education_records ADD CONSTRAINT education_records_status_check CHECK (status = ANY (ARRAY['certified'::text, 'pending_equivalency'::text, 'rejected'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'education_records_pkey' AND c.conrelid = 'public.education_records'::regclass) THEN
    ALTER TABLE public.education_records ADD CONSTRAINT education_records_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'education_records_verification_token_key' AND c.conrelid = 'public.education_records'::regclass) THEN
    ALTER TABLE public.education_records ADD CONSTRAINT education_records_verification_token_key UNIQUE (verification_token);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.family_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    head_user_id uuid NOT NULL,
    member_nid text NOT NULL,
    member_name text NOT NULL,
    relationship text NOT NULL,
    birth_date date NOT NULL,
    blood_type text,
    national_health_insured boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'family_registry_blood_type_check' AND c.conrelid = 'public.family_registry'::regclass) THEN
    ALTER TABLE public.family_registry ADD CONSTRAINT family_registry_blood_type_check CHECK (blood_type = ANY (ARRAY['A+'::text, 'A-'::text, 'B+'::text, 'B-'::text, 'O+'::text, 'O-'::text, 'AB+'::text, 'AB-'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'family_registry_member_nid_check' AND c.conrelid = 'public.family_registry'::regclass) THEN
    ALTER TABLE public.family_registry ADD CONSTRAINT family_registry_member_nid_check CHECK (member_nid ~ '^\d{9}$'::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'family_registry_relationship_check' AND c.conrelid = 'public.family_registry'::regclass) THEN
    ALTER TABLE public.family_registry ADD CONSTRAINT family_registry_relationship_check CHECK (relationship = ANY (ARRAY['spouse'::text, 'son'::text, 'daughter'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'family_registry_pkey' AND c.conrelid = 'public.family_registry'::regclass) THEN
    ALTER TABLE public.family_registry ADD CONSTRAINT family_registry_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'unique_family_member' AND c.conrelid = 'public.family_registry'::regclass) THEN
    ALTER TABLE public.family_registry ADD CONSTRAINT unique_family_member UNIQUE (head_user_id, member_nid);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.hajj_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    season_year integer DEFAULT 2026 NOT NULL,
    mahram_name text,
    health_status text DEFAULT 'fit'::text NOT NULL,
    lottery_status text DEFAULT 'registered'::text NOT NULL,
    priority_points integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hajj_applications_health_status_check' AND c.conrelid = 'public.hajj_applications'::regclass) THEN
    ALTER TABLE public.hajj_applications ADD CONSTRAINT hajj_applications_health_status_check CHECK (health_status = ANY (ARRAY['fit'::text, 'chronic_condition'::text, 'needs_companion'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hajj_applications_lottery_status_check' AND c.conrelid = 'public.hajj_applications'::regclass) THEN
    ALTER TABLE public.hajj_applications ADD CONSTRAINT hajj_applications_lottery_status_check CHECK (lottery_status = ANY (ARRAY['registered'::text, 'nominated'::text, 'accepted'::text, 'deferred'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hajj_applications_pkey' AND c.conrelid = 'public.hajj_applications'::regclass) THEN
    ALTER TABLE public.hajj_applications ADD CONSTRAINT hajj_applications_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.hospital_appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    hospital_id uuid NOT NULL,
    clinic_department text NOT NULL,
    appointment_date date NOT NULL,
    time_slot text NOT NULL,
    referral_code text DEFAULT ('REF-MOH-'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hospital_appointments_status_check' AND c.conrelid = 'public.hospital_appointments'::regclass) THEN
    ALTER TABLE public.hospital_appointments ADD CONSTRAINT hospital_appointments_status_check CHECK (status = ANY (ARRAY['confirmed'::text, 'completed'::text, 'cancelled'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hospital_appointments_pkey' AND c.conrelid = 'public.hospital_appointments'::regclass) THEN
    ALTER TABLE public.hospital_appointments ADD CONSTRAINT hospital_appointments_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hospital_appointments_referral_code_key' AND c.conrelid = 'public.hospital_appointments'::regclass) THEN
    ALTER TABLE public.hospital_appointments ADD CONSTRAINT hospital_appointments_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.jerusalem_support_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    case_id text DEFAULT ('JLM-RES-'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL,
    support_type text NOT NULL,
    property_address text NOT NULL,
    details text NOT NULL,
    status text DEFAULT 'pending_review'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'jerusalem_support_cases_status_check' AND c.conrelid = 'public.jerusalem_support_cases'::regclass) THEN
    ALTER TABLE public.jerusalem_support_cases ADD CONSTRAINT jerusalem_support_cases_status_check CHECK (status = ANY (ARRAY['pending_review'::text, 'legal_assigned'::text, 'subsidy_approved'::text, 'closed'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'jerusalem_support_cases_support_type_check' AND c.conrelid = 'public.jerusalem_support_cases'::regclass) THEN
    ALTER TABLE public.jerusalem_support_cases ADD CONSTRAINT jerusalem_support_cases_support_type_check CHECK (support_type = ANY (ARRAY['arnona_relief'::text, 'legal_eviction_defense'::text, 'commercial_subsidy'::text, 'building_renovation'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'jerusalem_support_cases_pkey' AND c.conrelid = 'public.jerusalem_support_cases'::regclass) THEN
    ALTER TABLE public.jerusalem_support_cases ADD CONSTRAINT jerusalem_support_cases_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'jerusalem_support_cases_case_id_key' AND c.conrelid = 'public.jerusalem_support_cases'::regclass) THEN
    ALTER TABLE public.jerusalem_support_cases ADD CONSTRAINT jerusalem_support_cases_case_id_key UNIQUE (case_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.job_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    user_id uuid NOT NULL,
    cover_letter text,
    status text DEFAULT 'submitted'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cv_snapshot jsonb
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_applications_status_check' AND c.conrelid = 'public.job_applications'::regclass) THEN
    ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_status_check CHECK (status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'interview'::text, 'rejected'::text, 'accepted'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_applications_pkey' AND c.conrelid = 'public.job_applications'::regclass) THEN
    ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_applications_job_id_user_id_key' AND c.conrelid = 'public.job_applications'::regclass) THEN
    ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_job_id_user_id_key UNIQUE (job_id, user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.job_postings (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    posted_by uuid,
    title text NOT NULL,
    organization text NOT NULL,
    type text DEFAULT 'private'::text,
    location text,
    description text,
    salary text,
    tags text[],
    image_url text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_postings_status_check' AND c.conrelid = 'public.job_postings'::regclass) THEN
    ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'closed'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_postings_type_check' AND c.conrelid = 'public.job_postings'::regclass) THEN
    ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_type_check CHECK (type = ANY (ARRAY['government'::text, 'private'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_postings_pkey' AND c.conrelid = 'public.job_postings'::regclass) THEN
    ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.justice_powers_of_attorney (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    principal_id uuid NOT NULL,
    agent_national_id text NOT NULL,
    agent_full_name text NOT NULL,
    poa_type text NOT NULL,
    poa_number text NOT NULL,
    terms text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'justice_powers_of_attorney_poa_type_check' AND c.conrelid = 'public.justice_powers_of_attorney'::regclass) THEN
    ALTER TABLE public.justice_powers_of_attorney ADD CONSTRAINT justice_powers_of_attorney_poa_type_check CHECK (poa_type = ANY (ARRAY['general'::text, 'real_estate'::text, 'legal_litigation'::text, 'banking'::text, 'vehicle'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'justice_powers_of_attorney_status_check' AND c.conrelid = 'public.justice_powers_of_attorney'::regclass) THEN
    ALTER TABLE public.justice_powers_of_attorney ADD CONSTRAINT justice_powers_of_attorney_status_check CHECK (status = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'justice_powers_of_attorney_pkey' AND c.conrelid = 'public.justice_powers_of_attorney'::regclass) THEN
    ALTER TABLE public.justice_powers_of_attorney ADD CONSTRAINT justice_powers_of_attorney_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'justice_powers_of_attorney_poa_number_key' AND c.conrelid = 'public.justice_powers_of_attorney'::regclass) THEN
    ALTER TABLE public.justice_powers_of_attorney ADD CONSTRAINT justice_powers_of_attorney_poa_number_key UNIQUE (poa_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.medical_profiles (
    user_id uuid NOT NULL,
    blood_type text,
    chronic_diseases text[],
    allergies text[],
    primary_health_center text NOT NULL,
    insurance_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'medical_profiles_blood_type_check' AND c.conrelid = 'public.medical_profiles'::regclass) THEN
    ALTER TABLE public.medical_profiles ADD CONSTRAINT medical_profiles_blood_type_check CHECK (blood_type = ANY (ARRAY['A+'::text, 'A-'::text, 'B+'::text, 'B-'::text, 'AB+'::text, 'AB-'::text, 'O+'::text, 'O-'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'medical_profiles_pkey' AND c.conrelid = 'public.medical_profiles'::regclass) THEN
    ALTER TABLE public.medical_profiles ADD CONSTRAINT medical_profiles_pkey PRIMARY KEY (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'medical_profiles_insurance_number_key' AND c.conrelid = 'public.medical_profiles'::regclass) THEN
    ALTER TABLE public.medical_profiles ADD CONSTRAINT medical_profiles_insurance_number_key UNIQUE (insurance_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.news_posts (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    author_id uuid,
    title text NOT NULL,
    excerpt text,
    content text,
    image_url text,
    category text,
    source_label text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'news_posts_status_check' AND c.conrelid = 'public.news_posts'::regclass) THEN
    ALTER TABLE public.news_posts ADD CONSTRAINT news_posts_status_check CHECK (status = ANY (ARRAY['pending'::text, 'published'::text, 'archived'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'news_posts_pkey' AND c.conrelid = 'public.news_posts'::regclass) THEN
    ALTER TABLE public.news_posts ADD CONSTRAINT news_posts_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'system'::text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'notifications_type_check' AND c.conrelid = 'public.notifications'::regclass) THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['system'::text, 'personal'::text, 'alert'::text, 'aid'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'notifications_pkey' AND c.conrelid = 'public.notifications'::regclass) THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.official_gazette_editions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edition_number integer NOT NULL,
    issuance_date date NOT NULL,
    title text NOT NULL,
    decree_type text NOT NULL,
    summary text NOT NULL,
    full_text text NOT NULL,
    document_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'official_gazette_editions_decree_type_check' AND c.conrelid = 'public.official_gazette_editions'::regclass) THEN
    ALTER TABLE public.official_gazette_editions ADD CONSTRAINT official_gazette_editions_decree_type_check CHECK (decree_type = ANY (ARRAY['presidential_decree'::text, 'cabinet_decision'::text, 'ministerial_instruction'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'official_gazette_editions_pkey' AND c.conrelid = 'public.official_gazette_editions'::regclass) THEN
    ALTER TABLE public.official_gazette_editions ADD CONSTRAINT official_gazette_editions_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'official_gazette_editions_edition_number_key' AND c.conrelid = 'public.official_gazette_editions'::regclass) THEN
    ALTER TABLE public.official_gazette_editions ADD CONSTRAINT official_gazette_editions_edition_number_key UNIQUE (edition_number);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.palestinian_hospitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    governorate text NOT NULL,
    city text NOT NULL,
    sector text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    emergency_status text DEFAULT 'open_24_7'::text NOT NULL,
    departments jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_bed_capacity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'palestinian_hospitals_emergency_status_check' AND c.conrelid = 'public.palestinian_hospitals'::regclass) THEN
    ALTER TABLE public.palestinian_hospitals ADD CONSTRAINT palestinian_hospitals_emergency_status_check CHECK (emergency_status = ANY (ARRAY['open_24_7'::text, 'high_capacity'::text, 'diverting_critical'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'palestinian_hospitals_sector_check' AND c.conrelid = 'public.palestinian_hospitals'::regclass) THEN
    ALTER TABLE public.palestinian_hospitals ADD CONSTRAINT palestinian_hospitals_sector_check CHECK (sector = ANY (ARRAY['government_moh'::text, 'charitable_ngo'::text, 'private'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'palestinian_hospitals_pkey' AND c.conrelid = 'public.palestinian_hospitals'::regclass) THEN
    ALTER TABLE public.palestinian_hospitals ADD CONSTRAINT palestinian_hospitals_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    national_id text NOT NULL,
    full_name text NOT NULL,
    phone text,
    email text,
    region text,
    city text,
    avatar_url text,
    verification_doc_url text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    role text DEFAULT 'citizen'::text NOT NULL,
    cv_public boolean DEFAULT true,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    governorate text,
    personal_photo_url text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'profiles_role_check' AND c.conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['citizen'::text, 'admin'::text, 'moderator'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'profiles_status_check' AND c.conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'profiles_pkey' AND c.conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'profiles_email_key' AND c.conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'profiles_national_id_key' AND c.conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_national_id_key UNIQUE (national_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.public_tenders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tender_code text NOT NULL,
    title text NOT NULL,
    issuing_body text NOT NULL,
    category text NOT NULL,
    brochure_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    estimated_value numeric(14,2) NOT NULL,
    submission_deadline timestamp with time zone NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'public_tenders_category_check' AND c.conrelid = 'public.public_tenders'::regclass) THEN
    ALTER TABLE public.public_tenders ADD CONSTRAINT public_tenders_category_check CHECK (category = ANY (ARRAY['works'::text, 'supplies'::text, 'consulting'::text, 'it_systems'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'public_tenders_status_check' AND c.conrelid = 'public.public_tenders'::regclass) THEN
    ALTER TABLE public.public_tenders ADD CONSTRAINT public_tenders_status_check CHECK (status = ANY (ARRAY['open'::text, 'under_evaluation'::text, 'awarded'::text, 'cancelled'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'public_tenders_pkey' AND c.conrelid = 'public.public_tenders'::regclass) THEN
    ALTER TABLE public.public_tenders ADD CONSTRAINT public_tenders_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'public_tenders_tender_code_key' AND c.conrelid = 'public.public_tenders'::regclass) THEN
    ALTER TABLE public.public_tenders ADD CONSTRAINT public_tenders_tender_code_key UNIQUE (tender_code);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.restaurants (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    owner_id uuid,
    name text NOT NULL,
    city text NOT NULL,
    description text,
    logo_url text,
    cover_url text,
    phone text,
    pdf_menu_url text,
    tags text[],
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'restaurants_status_check' AND c.conrelid = 'public.restaurants'::regclass) THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'restaurants_pkey' AND c.conrelid = 'public.restaurants'::regclass) THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.service_requests (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    admin_notes text,
    attachments text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'service_requests_status_check' AND c.conrelid = 'public.service_requests'::regclass) THEN
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'approved'::text, 'rejected'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'service_requests_type_check' AND c.conrelid = 'public.service_requests'::regclass) THEN
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_type_check CHECK (type = ANY (ARRAY['passport'::text, 'id_validation'::text, 'land_doc'::text, 'border_crossing'::text, 'hajj'::text, 'aid'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'service_requests_pkey' AND c.conrelid = 'public.service_requests'::regclass) THEN
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tax_clearance_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    clearance_code text DEFAULT ('PAL-TAX-'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL,
    purpose text NOT NULL,
    income_tax_status text DEFAULT 'settled'::text NOT NULL,
    vat_status text DEFAULT 'settled'::text NOT NULL,
    property_tax_status text DEFAULT 'settled'::text NOT NULL,
    valid_until date DEFAULT (CURRENT_DATE + '90 days'::interval) NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tax_clearance_certificates_income_tax_status_check' AND c.conrelid = 'public.tax_clearance_certificates'::regclass) THEN
    ALTER TABLE public.tax_clearance_certificates ADD CONSTRAINT tax_clearance_certificates_income_tax_status_check CHECK (income_tax_status = ANY (ARRAY['settled'::text, 'exempt'::text, 'dues_pending'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tax_clearance_certificates_property_tax_status_check' AND c.conrelid = 'public.tax_clearance_certificates'::regclass) THEN
    ALTER TABLE public.tax_clearance_certificates ADD CONSTRAINT tax_clearance_certificates_property_tax_status_check CHECK (property_tax_status = ANY (ARRAY['settled'::text, 'exempt'::text, 'dues_pending'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tax_clearance_certificates_purpose_check' AND c.conrelid = 'public.tax_clearance_certificates'::regclass) THEN
    ALTER TABLE public.tax_clearance_certificates ADD CONSTRAINT tax_clearance_certificates_purpose_check CHECK (purpose = ANY (ARRAY['commercial_bid'::text, 'travel'::text, 'land_transfer'::text, 'general_clearance'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tax_clearance_certificates_vat_status_check' AND c.conrelid = 'public.tax_clearance_certificates'::regclass) THEN
    ALTER TABLE public.tax_clearance_certificates ADD CONSTRAINT tax_clearance_certificates_vat_status_check CHECK (vat_status = ANY (ARRAY['settled'::text, 'exempt'::text, 'dues_pending'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tax_clearance_certificates_pkey' AND c.conrelid = 'public.tax_clearance_certificates'::regclass) THEN
    ALTER TABLE public.tax_clearance_certificates ADD CONSTRAINT tax_clearance_certificates_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tax_clearance_certificates_clearance_code_key' AND c.conrelid = 'public.tax_clearance_certificates'::regclass) THEN
    ALTER TABLE public.tax_clearance_certificates ADD CONSTRAINT tax_clearance_certificates_clearance_code_key UNIQUE (clearance_code);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.taxi_offices (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    phone text,
    description text,
    image_url text,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'taxi_offices_pkey' AND c.conrelid = 'public.taxi_offices'::regclass) THEN
    ALTER TABLE public.taxi_offices ADD CONSTRAINT taxi_offices_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tender_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tender_id uuid NOT NULL,
    purchase_token text DEFAULT ('BOU-TND-'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tender_purchases_pkey' AND c.conrelid = 'public.tender_purchases'::regclass) THEN
    ALTER TABLE public.tender_purchases ADD CONSTRAINT tender_purchases_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tender_purchases_purchase_token_key' AND c.conrelid = 'public.tender_purchases'::regclass) THEN
    ALTER TABLE public.tender_purchases ADD CONSTRAINT tender_purchases_purchase_token_key UNIQUE (purchase_token);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'unique_user_tender' AND c.conrelid = 'public.tender_purchases'::regclass) THEN
    ALTER TABLE public.tender_purchases ADD CONSTRAINT unique_user_tender UNIQUE (user_id, tender_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vaccination_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vaccine_name_ar text NOT NULL,
    vaccine_name_en text NOT NULL,
    dose_number integer NOT NULL,
    administered_date date NOT NULL,
    health_facility text NOT NULL,
    batch_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'vaccination_records_pkey' AND c.conrelid = 'public.vaccination_records'::regclass) THEN
    ALTER TABLE public.vaccination_records ADD CONSTRAINT vaccination_records_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.violations (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    reason text,
    location text,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'unpaid'::text,
    issued_at date,
    paid_at timestamp with time zone,
    case_number text,
    citation text,
    station text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'violations_status_check' AND c.conrelid = 'public.violations'::regclass) THEN
    ALTER TABLE public.violations ADD CONSTRAINT violations_status_check CHECK (status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'instalment'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'violations_pkey' AND c.conrelid = 'public.violations'::regclass) THEN
    ALTER TABLE public.violations ADD CONSTRAINT violations_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    wallet_id uuid,
    amount numeric(12,2) NOT NULL,
    type text,
    description text,
    ref_id text,
    created_at timestamp with time zone DEFAULT now(),
    status text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'wallet_transactions_type_check' AND c.conrelid = 'public.wallet_transactions'::regclass) THEN
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type = ANY (ARRAY['credit'::text, 'debit'::text]));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'wallet_transactions_pkey' AND c.conrelid = 'public.wallet_transactions'::regclass) THEN
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    balance numeric(12,2) DEFAULT 0.00,
    currency text DEFAULT 'ILS'::text,
    last_updated timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'wallets_pkey' AND c.conrelid = 'public.wallets'::regclass) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'wallets_user_id_key' AND c.conrelid = 'public.wallets'::regclass) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_claims_package_id_fkey' AND c.conrelid = 'public.aid_claims'::regclass) THEN
    ALTER TABLE public.aid_claims ADD CONSTRAINT aid_claims_package_id_fkey FOREIGN KEY (package_id) REFERENCES aid_packages(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_claims_user_id_fkey' AND c.conrelid = 'public.aid_claims'::regclass) THEN
    ALTER TABLE public.aid_claims ADD CONSTRAINT aid_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_packages_created_by_fkey' AND c.conrelid = 'public.aid_packages'::regclass) THEN
    ALTER TABLE public.aid_packages ADD CONSTRAINT aid_packages_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'aid_ration_cards_user_id_fkey' AND c.conrelid = 'public.aid_ration_cards'::regclass) THEN
    ALTER TABLE public.aid_ration_cards ADD CONSTRAINT aid_ration_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'bills_user_id_fkey' AND c.conrelid = 'public.bills'::regclass) THEN
    ALTER TABLE public.bills ADD CONSTRAINT bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'border_permits_user_id_fkey' AND c.conrelid = 'public.border_permits'::regclass) THEN
    ALTER TABLE public.border_permits ADD CONSTRAINT border_permits_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_complaints_user_id_fkey' AND c.conrelid = 'public.cabinet_complaints'::regclass) THEN
    ALTER TABLE public.cabinet_complaints ADD CONSTRAINT cabinet_complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cabinet_humanitarian_relief_user_id_fkey' AND c.conrelid = 'public.cabinet_humanitarian_relief'::regclass) THEN
    ALTER TABLE public.cabinet_humanitarian_relief ADD CONSTRAINT cabinet_humanitarian_relief_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_contributions_campaign_id_fkey' AND c.conrelid = 'public.charity_contributions'::regclass) THEN
    ALTER TABLE public.charity_contributions ADD CONSTRAINT charity_contributions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES charity_campaigns(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'charity_contributions_donor_id_fkey' AND c.conrelid = 'public.charity_contributions'::regclass) THEN
    ALTER TABLE public.charity_contributions ADD CONSTRAINT charity_contributions_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_cvs_user_id_fkey' AND c.conrelid = 'public.citizen_cvs'::regclass) THEN
    ALTER TABLE public.citizen_cvs ADD CONSTRAINT citizen_cvs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'citizen_vehicles_user_id_fkey' AND c.conrelid = 'public.citizen_vehicles'::regclass) THEN
    ALTER TABLE public.citizen_vehicles ADD CONSTRAINT citizen_vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_appointments_user_id_fkey' AND c.conrelid = 'public.civic_appointments'::regclass) THEN
    ALTER TABLE public.civic_appointments ADD CONSTRAINT civic_appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_documents_user_id_fkey' AND c.conrelid = 'public.civic_documents'::regclass) THEN
    ALTER TABLE public.civic_documents ADD CONSTRAINT civic_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'civic_incident_reports_user_id_fkey' AND c.conrelid = 'public.civic_incident_reports'::regclass) THEN
    ALTER TABLE public.civic_incident_reports ADD CONSTRAINT civic_incident_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'commercial_trade_licenses_owner_id_fkey' AND c.conrelid = 'public.commercial_trade_licenses'::regclass) THEN
    ALTER TABLE public.commercial_trade_licenses ADD CONSTRAINT commercial_trade_licenses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'criminal_clearance_certs_user_id_fkey' AND c.conrelid = 'public.criminal_clearance_certs'::regclass) THEN
    ALTER TABLE public.criminal_clearance_certs ADD CONSTRAINT criminal_clearance_certs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cv_education_user_id_fkey' AND c.conrelid = 'public.cv_education'::regclass) THEN
    ALTER TABLE public.cv_education ADD CONSTRAINT cv_education_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'cv_experience_user_id_fkey' AND c.conrelid = 'public.cv_experience'::regclass) THEN
    ALTER TABLE public.cv_experience ADD CONSTRAINT cv_experience_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'donations_donor_id_fkey' AND c.conrelid = 'public.donations'::regclass) THEN
    ALTER TABLE public.donations ADD CONSTRAINT donations_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'driving_licenses_user_id_fkey' AND c.conrelid = 'public.driving_licenses'::regclass) THEN
    ALTER TABLE public.driving_licenses ADD CONSTRAINT driving_licenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'education_records_user_id_fkey' AND c.conrelid = 'public.education_records'::regclass) THEN
    ALTER TABLE public.education_records ADD CONSTRAINT education_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'family_registry_head_user_id_fkey' AND c.conrelid = 'public.family_registry'::regclass) THEN
    ALTER TABLE public.family_registry ADD CONSTRAINT family_registry_head_user_id_fkey FOREIGN KEY (head_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hajj_applications_user_id_fkey' AND c.conrelid = 'public.hajj_applications'::regclass) THEN
    ALTER TABLE public.hajj_applications ADD CONSTRAINT hajj_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hospital_appointments_hospital_id_fkey' AND c.conrelid = 'public.hospital_appointments'::regclass) THEN
    ALTER TABLE public.hospital_appointments ADD CONSTRAINT hospital_appointments_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES palestinian_hospitals(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'hospital_appointments_user_id_fkey' AND c.conrelid = 'public.hospital_appointments'::regclass) THEN
    ALTER TABLE public.hospital_appointments ADD CONSTRAINT hospital_appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'jerusalem_support_cases_user_id_fkey' AND c.conrelid = 'public.jerusalem_support_cases'::regclass) THEN
    ALTER TABLE public.jerusalem_support_cases ADD CONSTRAINT jerusalem_support_cases_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_applications_job_id_fkey' AND c.conrelid = 'public.job_applications'::regclass) THEN
    ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_applications_user_id_fkey' AND c.conrelid = 'public.job_applications'::regclass) THEN
    ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'job_postings_posted_by_fkey' AND c.conrelid = 'public.job_postings'::regclass) THEN
    ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES profiles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'justice_powers_of_attorney_principal_id_fkey' AND c.conrelid = 'public.justice_powers_of_attorney'::regclass) THEN
    ALTER TABLE public.justice_powers_of_attorney ADD CONSTRAINT justice_powers_of_attorney_principal_id_fkey FOREIGN KEY (principal_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'medical_profiles_user_id_fkey' AND c.conrelid = 'public.medical_profiles'::regclass) THEN
    ALTER TABLE public.medical_profiles ADD CONSTRAINT medical_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'news_posts_author_id_fkey' AND c.conrelid = 'public.news_posts'::regclass) THEN
    ALTER TABLE public.news_posts ADD CONSTRAINT news_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'notifications_user_id_fkey' AND c.conrelid = 'public.notifications'::regclass) THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'profiles_id_fkey' AND c.conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'restaurants_owner_id_fkey' AND c.conrelid = 'public.restaurants'::regclass) THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'service_requests_user_id_fkey' AND c.conrelid = 'public.service_requests'::regclass) THEN
    ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tax_clearance_certificates_user_id_fkey' AND c.conrelid = 'public.tax_clearance_certificates'::regclass) THEN
    ALTER TABLE public.tax_clearance_certificates ADD CONSTRAINT tax_clearance_certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tender_purchases_tender_id_fkey' AND c.conrelid = 'public.tender_purchases'::regclass) THEN
    ALTER TABLE public.tender_purchases ADD CONSTRAINT tender_purchases_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public_tenders(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'tender_purchases_user_id_fkey' AND c.conrelid = 'public.tender_purchases'::regclass) THEN
    ALTER TABLE public.tender_purchases ADD CONSTRAINT tender_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'vaccination_records_user_id_fkey' AND c.conrelid = 'public.vaccination_records'::regclass) THEN
    ALTER TABLE public.vaccination_records ADD CONSTRAINT vaccination_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'violations_user_id_fkey' AND c.conrelid = 'public.violations'::regclass) THEN
    ALTER TABLE public.violations ADD CONSTRAINT violations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'wallet_transactions_wallet_id_fkey' AND c.conrelid = 'public.wallet_transactions'::regclass) THEN
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = 'wallets_user_id_fkey' AND c.conrelid = 'public.wallets'::regclass) THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;

CREATE TRIGGER trg_protect_profile_sensitive_columns BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_sensitive_columns();

DROP TRIGGER IF EXISTS svc_req_updated ON public.service_requests;

CREATE TRIGGER svc_req_updated BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
