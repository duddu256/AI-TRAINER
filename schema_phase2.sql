-- =========================================================
-- AURATRAINER PHASE 2 MVP EXPANSION SQL MIGRATION
-- Run this in your Supabase SQL Editor
-- =========================================================

-- 1. SAVED MEALS TABLE (User-customized meal templates)
CREATE TABLE IF NOT EXISTS public.saved_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Post-Workout Oats"
    calories INTEGER NOT NULL,
    protein_g NUMERIC(5,2) NOT NULL,
    carbs_g NUMERIC(5,2) NOT NULL,
    fat_g NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'saved_meals' AND policyname = 'Users can manage their own saved meals'
    ) THEN
        CREATE POLICY "Users can manage their own saved meals" 
        ON public.saved_meals FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. BADGES & GAMIFICATION TABLES
CREATE TABLE IF NOT EXISTS public.badges (
    id VARCHAR(100) PRIMARY KEY, -- e.g., 'diet_streak_7'
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(100) DEFAULT 'shield',
    category VARCHAR(50) DEFAULT 'streak',
    requirement_val INTEGER DEFAULT 7
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id VARCHAR(100) NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'Users can view their own unlocked achievements'
    ) THEN
        CREATE POLICY "Users can view their own unlocked achievements" 
        ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- SEED DEFAULT BADGES
INSERT INTO public.badges (id, title, description, icon_name, category, requirement_val)
VALUES 
    ('iron_pioneer', 'Iron Pioneer', 'Completed and mastered your first workout protocol', 'sword', 'workout', 1),
    ('diet_streak_7', '7-Day Consistent Diet Plan', 'Met your daily nutrition targets for 7 consecutive days', 'flame', 'diet', 7),
    ('water_streak_7', 'Perfect Hydration Week', 'Achieved your 3,000ml water intake target for 7 consecutive days', 'droplet', 'water', 7),
    ('steps_streak_7', '10K Steps 7-Day Streak', 'Hit or exceeded 10,000 steps for 7 consecutive days', 'zap', 'steps', 7),
    ('workout_30', '30 Workouts Mastered', 'Logged 30 completed training split sessions', 'trophy', 'workout', 30)
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    category = EXCLUDED.category,
    requirement_val = EXCLUDED.requirement_val;

-- 3. CUSTOM WORKOUT SPLITS TABLE
CREATE TABLE IF NOT EXISTS public.custom_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    split_name VARCHAR(100) NOT NULL,
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.custom_splits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'custom_splits' AND policyname = 'Users can manage their custom splits'
    ) THEN
        CREATE POLICY "Users can manage their custom splits" 
        ON public.custom_splits FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
