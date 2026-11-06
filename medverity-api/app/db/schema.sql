-- MedVerity — PostgreSQL Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Table creation order respects foreign key dependencies.

-- ══════════════════════════════════════════════════════════
-- 1. Users (extended profile on top of Supabase Auth)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT '',
    phone           TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    role            TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'caregiver')),
    blood_group     TEXT,
    emergency_notes TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (each user can only read/write their own row)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- ══════════════════════════════════════════════════════════
-- 2. Caregiver Links
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS caregiver_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(caregiver_id, patient_id)
);

ALTER TABLE caregiver_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caregiver or patient can view link"
    ON caregiver_links FOR SELECT
    USING (auth.uid() = caregiver_id OR auth.uid() = patient_id);

-- ══════════════════════════════════════════════════════════
-- 3. Scans (OCR + NLP results)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url       TEXT,
    ocr_confidence  FLOAT,
    extracted_text  TEXT,
    medicine_name   TEXT,
    dosage          TEXT,
    frequency       TEXT,
    duration        TEXT,
    category        TEXT,
    uses            TEXT,
    how_to_take     TEXT,
    warnings        TEXT[],
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view own scans"   ON scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own scans" ON scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- 4. Allergies
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS allergies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allergy_name    TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, allergy_name)
);

ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can manage own allergies" ON allergies FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- 5. Reminders
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_id         UUID REFERENCES scans(id) ON DELETE SET NULL,
    medicine_name   TEXT NOT NULL,
    time_of_day     TEXT NOT NULL DEFAULT 'morning' CHECK (time_of_day IN ('morning', 'afternoon', 'night')),
    reminder_time   TEXT NOT NULL DEFAULT '08:00',
    instructions    TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed')),
    channel         TEXT NOT NULL DEFAULT 'app' CHECK (channel IN ('app', 'sms')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can manage own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- 6. Drug Database (curated safety data)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS drug_db (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generic_name    TEXT NOT NULL UNIQUE,
    brand_names     TEXT[],
    uses            TEXT,
    side_effects    TEXT,
    food_interactions TEXT[],
    pregnancy_note  TEXT,
    dosage_limit    TEXT
);

-- No RLS needed — drug_db is a public read-only reference table
CREATE POLICY "Anyone can read drug_db" ON drug_db FOR SELECT TO authenticated USING (true);

-- ══════════════════════════════════════════════════════════
-- 7. Interaction Rules
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS interaction_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_a          TEXT NOT NULL,
    drug_b          TEXT NOT NULL,
    risk_level      TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    description     TEXT NOT NULL
);

CREATE POLICY "Anyone can read interaction_rules" ON interaction_rules FOR SELECT TO authenticated USING (true);

-- ══════════════════════════════════════════════════════════
-- Trigger: auto-create user profile on sign-up
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, preferred_language, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
        'patient'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ══════════════════════════════════════════════════════════
-- 8. Prescription Scans
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS prescription_scans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url       TEXT,
    medicines       JSONB,
    summary         JSONB,
    scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prescription_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view own prescription scans"   ON prescription_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own prescription scans" ON prescription_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
