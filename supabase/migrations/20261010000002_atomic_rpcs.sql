-- 7 atomic financial/transport RPCs — SECURITY DEFINER with SET search_path = public;

CREATE OR REPLACE FUNCTION public.contribute_to_charity_rpc(p_donor_id uuid, p_campaign_id uuid, p_amount numeric, p_is_anonymous boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_status TEXT;
  v_verified BOOLEAN;
  v_receipt TEXT;
  v_wallet_id UUID;
BEGIN
  PERFORM public.assert_actor_or_service(p_donor_id);

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ التبرع غير صالح.');
  END IF;

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_donor_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_donor_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة الرقمية غير كافٍ لإتمام التبرع.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM charity_campaigns WHERE id = p_campaign_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحملة غير موجودة أو مغلقة.');
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount, last_updated = NOW()
  WHERE user_id = p_donor_id;

  UPDATE charity_campaigns
  SET collected_amount = collected_amount + p_amount
  WHERE id = p_campaign_id;

  v_receipt := 'EHSAN-PS-' || UPPER(SUBSTRING(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO charity_contributions (campaign_id, donor_id, amount, is_anonymous, receipt_number)
  VALUES (p_campaign_id, p_donor_id, p_amount, COALESCE(p_is_anonymous, false), v_receipt);

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, p_amount, 'debit', 'مساهمة خيرية عبر منصة إحسان الوطنية', v_receipt, 'completed');

  RETURN jsonb_build_object('success', true, 'receiptNumber', v_receipt, 'newBalance', v_balance - p_amount);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.contribute_to_charity_rpc(p_donor_id uuid, p_campaign_id uuid, p_amount numeric, p_is_anonymous boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.pay_bill_rpc(p_user_id uuid, p_bill_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_bill_amount NUMERIC;
  v_bill_status TEXT;
  v_status TEXT;
  v_verified BOOLEAN;
  v_wallet_id UUID;
BEGIN
  PERFORM public.assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT amount, status INTO v_bill_amount, v_bill_status
  FROM bills WHERE id = p_bill_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الفاتورة غير موجودة أو غير مسجلة على هذه الهوية.');
  END IF;
  IF v_bill_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الفاتورة مسددة مسبقاً.');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < v_bill_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد قيمة الفاتورة.');
  END IF;

  UPDATE wallets
  SET balance = balance - v_bill_amount, last_updated = NOW()
  WHERE user_id = p_user_id;
  UPDATE bills
  SET status = 'paid', paid_at = NOW()
  WHERE id = p_bill_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_bill_amount, 'debit', 'سداد مستحقات وفواتير حكومية', p_bill_id::text, 'completed');

  RETURN jsonb_build_object('success', true, 'newBalance', v_balance - v_bill_amount);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pay_bill_rpc(p_user_id uuid, p_bill_id uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.pay_violation_rpc(p_user_id uuid, p_violation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_violation_amount NUMERIC;
  v_violation_status TEXT;
  v_status TEXT;
  v_verified BOOLEAN;
  v_wallet_id UUID;
BEGIN
  PERFORM public.assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT amount, status INTO v_violation_amount, v_violation_status
  FROM violations WHERE id = p_violation_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'المخالفة غير موجودة.');
  END IF;
  IF v_violation_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه المخالفة مسددة مسبقاً.');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < v_violation_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد المخالفة.');
  END IF;

  UPDATE wallets
  SET balance = balance - v_violation_amount, last_updated = NOW()
  WHERE user_id = p_user_id;
  UPDATE violations
  SET status = 'paid', paid_at = NOW()
  WHERE id = p_violation_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_violation_amount, 'debit', 'سداد مخالفة سير ونقل', p_violation_id::text, 'completed');

  RETURN jsonb_build_object('success', true, 'newBalance', v_balance - v_violation_amount);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pay_violation_rpc(p_user_id uuid, p_violation_id uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.purchase_tender_brochure_rpc(p_user_id uuid, p_tender_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC(10,2);
  v_price NUMERIC(10,2);
  v_status TEXT;
  v_token TEXT;
  v_wallet_id UUID;
  v_profile_status TEXT;
  v_verified BOOLEAN;
BEGIN
  SELECT status, is_verified INTO v_profile_status, v_verified
  FROM profiles WHERE id = p_user_id;
  IF v_profile_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'شراء كراسة العطاء يتطلب اعتماد الهوية الرسمية أولاً.');
  END IF;

  SELECT brochure_price, status INTO v_price, v_status
  FROM public_tenders WHERE id = p_tender_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'العطاء الحكومي المطلوب غير موجود');
  END IF;

  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذا العطاء مغلق أو قيد الترسية حالياً');
  END IF;

  IF v_price IS NULL OR v_price < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'رسم الكراسة غير معتمد');
  END IF;

  IF EXISTS (SELECT 1 FROM tender_purchases WHERE user_id = p_user_id AND tender_id = p_tender_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم شراء كراسة هذا العطاء مسبقاً');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المحفظة الرقمية غير موجودة');
  END IF;

  IF v_balance < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد رسوم كراسة العطاء');
  END IF;

  UPDATE wallets
  SET balance = balance - v_price, last_updated = NOW()
  WHERE id = v_wallet_id;

  v_token := 'BOU-TND-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO tender_purchases (user_id, tender_id, purchase_token, amount_paid)
  VALUES (p_user_id, p_tender_id, v_token, v_price);

  
  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (
    v_wallet_id,
    v_price,
    'debit',
    'رسوم كراسة عطاء حكومي — ' || v_token,
    v_token,
    'completed'
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchase_token', v_token,
    'amount_deducted', v_price,
    'new_balance', v_balance - v_price
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم شراء كراسة هذا العطاء مسبقاً');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.purchase_tender_brochure_rpc(p_user_id uuid, p_tender_id uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.renew_driving_license_rpc(p_user_id uuid, p_license_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC(10,2);
  v_fee NUMERIC(10,2) := 180.00;
  v_current_expiry DATE;
  v_new_expiry DATE;
  v_wallet_id UUID;
  v_status TEXT;
  v_verified BOOLEAN;
BEGIN
  PERFORM assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT expiry_date INTO v_current_expiry
  FROM driving_licenses
  WHERE id = p_license_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'رخصة القيادة غير موجودة أو لا تخص صاحب الجلسة');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المحفظة الرقمية غير مفعلة');
  END IF;

  IF v_balance < v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد رسم تجديد الرخصة (180.00 ₪)');
  END IF;

  v_new_expiry := (GREATEST(v_current_expiry, CURRENT_DATE) + INTERVAL '5 years')::date;

  UPDATE wallets
  SET balance = balance - v_fee, last_updated = NOW()
  WHERE user_id = p_user_id;

  UPDATE driving_licenses
  SET expiry_date = v_new_expiry, status = 'active'
  WHERE id = p_license_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_fee, 'debit', 'رسم تجديد رخصة القيادة — وزارة النقل والمواصلات', p_license_id::text, 'completed');

  RETURN jsonb_build_object(
    'success', true,
    'amount_deducted', v_fee,
    'new_balance', v_balance - v_fee,
    'new_expiry', v_new_expiry
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.renew_driving_license_rpc(p_user_id uuid, p_license_id uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.renew_vehicle_license_rpc(p_user_id uuid, p_vehicle_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC(10,2);
  v_fee NUMERIC(10,2);
  v_current_expiry DATE;
  v_new_expiry DATE;
  v_wallet_id UUID;
  v_status TEXT;
  v_verified BOOLEAN;
BEGIN
  PERFORM assert_actor_or_service(p_user_id);

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'هذه الخدمة تتطلب اعتماد الهوية الرسمية من قبل الشؤون المدنية أولاً.');
  END IF;

  SELECT annual_license_fee, license_expiry INTO v_fee, v_current_expiry
  FROM citizen_vehicles
  WHERE id = p_vehicle_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'بيانات المركبة غير مسجلة لصالح هذا الحساب');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المحفظة الرقمية غير مفعلة');
  END IF;

  IF v_balance < v_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'رصيد المحفظة غير كافٍ لسداد رسوم ترخيص المركبة');
  END IF;

  v_new_expiry := (GREATEST(v_current_expiry, CURRENT_DATE) + INTERVAL '1 year')::date;

  UPDATE wallets
  SET balance = balance - v_fee, last_updated = NOW()
  WHERE user_id = p_user_id;

  UPDATE citizen_vehicles
  SET license_expiry = v_new_expiry, insurance_status = 'valid'
  WHERE id = p_vehicle_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (v_wallet_id, v_fee, 'debit', 'رسم تجديد رخصة سير المركبة — الديناموميتر', p_vehicle_id::text, 'completed');

  RETURN jsonb_build_object(
    'success', true,
    'amount_deducted', v_fee,
    'new_balance', v_balance - v_fee,
    'new_expiry', v_new_expiry
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.renew_vehicle_license_rpc(p_user_id uuid, p_vehicle_id uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_border_permit_rpc(p_user_id uuid, p_crossing text, p_travel_date date, p_travel_purpose text, p_name_ar text, p_name_en text, p_passport_no text, p_passport_expiry date, p_destination text, p_category text, p_companions jsonb, p_logistics jsonb, p_fee numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance NUMERIC;
  v_status TEXT;
  v_verified BOOLEAN;
  v_tracking TEXT;
  v_permit_id UUID;
  v_wallet_id UUID;
  v_companions JSONB;
  v_logistics JSONB;
  v_qr TEXT;
BEGIN
  PERFORM public.assert_actor_or_service(p_user_id);

  IF p_crossing IS NULL OR p_crossing NOT IN ('karameh_bridge', 'rafah_crossing', 'erez_crossing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'معبر غير صالح.');
  END IF;
  IF p_travel_date IS NULL OR p_travel_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'تاريخ السفر يجب أن يكون اليوم أو بعده.');
  END IF;
  IF p_travel_purpose IS NULL OR char_length(btrim(p_travel_purpose)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الغرض من السفر مطلوب.');
  END IF;
  IF p_name_ar IS NULL OR char_length(btrim(p_name_ar)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الاسم العربي كما في الجواز مطلوب.');
  END IF;
  IF p_name_en IS NULL OR p_name_en !~ '^[A-Za-z][A-Za-z ''-]{1,80}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'الاسم الإنجليزي يجب أن يطابق حروف الجواز اللاتينية.');
  END IF;
  IF p_passport_no IS NULL OR upper(btrim(p_passport_no)) !~ '^[A-Z0-9]{5,12}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'رقم الجواز غير صالح.');
  END IF;
  IF p_passport_expiry IS NULL OR p_passport_expiry <= p_travel_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'يجب أن يكون الجواز سارياً بعد تاريخ السفر.');
  END IF;
  IF p_destination IS NULL OR char_length(btrim(p_destination)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'بلد الوجهة مطلوب.');
  END IF;
  IF p_category IS NULL OR p_category NOT IN (
    'medical', 'education', 'business', 'humanitarian', 'tourism_family', 'delegation'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'فئة السفر غير معتمدة.');
  END IF;
  IF p_fee IS NULL OR p_fee <> 170.00 THEN
    RETURN jsonb_build_object('success', false, 'error', 'رسوم التنسيق والمغادرة السيادية ثابتة بمبلغ 170.00 شيكل.');
  END IF;

  v_companions := CASE
    WHEN p_companions IS NULL OR jsonb_typeof(p_companions) <> 'array' THEN '[]'::jsonb
    ELSE p_companions
  END;
  IF jsonb_array_length(v_companions) > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'الحد الأقصى للمرافقين هو 10.');
  END IF;

  v_logistics := jsonb_build_object(
    'wheelchair', COALESCE((p_logistics ->> 'wheelchair')::boolean, false),
    'ambulance', COALESCE((p_logistics ->> 'ambulance')::boolean, false),
    'vip_hall', COALESCE((p_logistics ->> 'vip_hall')::boolean, false)
  );

  SELECT status, is_verified INTO v_status, v_verified FROM profiles WHERE id = p_user_id;
  IF v_status IS DISTINCT FROM 'active' OR v_verified IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'إصدار تصاريح السفر يتطلب اعتماد وتدقيق الهوية الرسمية من قبل الشؤون المدنية أولاً.'
    );
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_id IS NULL OR v_balance IS NULL OR v_balance < 170.00 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'رصيد المحفظة الرقمية غير كافٍ لسداد رسوم التنسيق والمغادرة السيادية (170 شيكل).'
    );
  END IF;

  UPDATE wallets
  SET balance = balance - 170.00, last_updated = NOW()
  WHERE id = v_wallet_id;

  v_tracking := 'PAL-BRD-' || UPPER(SUBSTRING(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_qr := 'PAL-PASS-VERIFIED-' || v_tracking;

  INSERT INTO border_permits (
    user_id, crossing_name, travel_date, travel_purpose, companions_count,
    permit_number, status, qr_token, full_name_passport_ar, full_name_passport_en,
    passport_number, passport_expiry_date, destination_country, travel_category,
    companions_data, special_logistics, coordination_fee_ils, payment_status,
    clearance_tracking_code
  ) VALUES (
    p_user_id, p_crossing, p_travel_date, btrim(p_travel_purpose), jsonb_array_length(v_companions),
    v_tracking, 'under_review', v_qr, btrim(p_name_ar), btrim(p_name_en),
    upper(btrim(p_passport_no)), p_passport_expiry, btrim(p_destination), p_category,
    v_companions, v_logistics, 170.00, 'paid', v_tracking
  ) RETURNING id INTO v_permit_id;

  INSERT INTO wallet_transactions (wallet_id, amount, type, description, ref_id, status)
  VALUES (
    v_wallet_id,
    170.00,
    'debit',
    'رسوم تنسيق ومغادرة المعابر السيادية — تصريح #' || v_tracking,
    v_tracking,
    'completed'
  );

  RETURN jsonb_build_object(
    'success', true,
    'trackingCode', v_tracking,
    'permitId', v_permit_id,
    'qrToken', v_qr,
    'newBalance', v_balance - 170.00,
    'paymentStatus', 'paid',
    'status', 'under_review'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_border_permit_rpc(p_user_id uuid, p_crossing text, p_travel_date date, p_travel_purpose text, p_name_ar text, p_name_en text, p_passport_no text, p_passport_expiry date, p_destination text, p_category text, p_companions jsonb, p_logistics jsonb, p_fee numeric) TO service_role;
