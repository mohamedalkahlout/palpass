-- PALPASS — Biometric / visual face verification column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS personal_photo_url TEXT;
