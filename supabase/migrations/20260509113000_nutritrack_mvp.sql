-- NutriTrack MVP: Add workouts and weight_logs tables
-- Existing tables: users, profiles, sessions, day_logs (already exist, do not recreate)

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workouts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'strength',
    duration_minutes INTEGER DEFAULT 0,
    notes TEXT,
    exercises JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weight_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight_kg NUMERIC(5,1) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON public.workouts(date);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id ON public.weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON public.weight_logs(date);

-- Unique constraint: one weight log per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs(user_id, date);

-- ============================================================
-- 3. ENABLE RLS (idempotent)
-- ============================================================

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
-- Note: These tables use custom session auth (not Supabase Auth)
-- so we use permissive policies and rely on API-layer auth.
-- ============================================================

DROP POLICY IF EXISTS "workouts_open_access" ON public.workouts;
CREATE POLICY "workouts_open_access" ON public.workouts FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "weight_logs_open_access" ON public.weight_logs;
CREATE POLICY "weight_logs_open_access" ON public.weight_logs FOR ALL TO public USING (true) WITH CHECK (true);
