-- ====================================================================
-- REAL-TIME QUIZ BEE COMPETITION SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Paste and Run this SQL once in your Supabase Dashboard -> SQL Editor
-- Project: https://wffofucnrknernuirtnn.supabase.co
-- ====================================================================

-- 1. Event & Display Configuration Table
CREATE TABLE IF NOT EXISTS event_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    event_name TEXT NOT NULL DEFAULT 'IT Skills Olympics',
    event_category TEXT NOT NULL DEFAULT 'Quiz Bee',
    event_subtitle TEXT NOT NULL DEFAULT 'Inter-University Competition Portal',
    participant_label TEXT NOT NULL DEFAULT 'School / University',
    primary_color TEXT NOT NULL DEFAULT '#3e1b20',
    accent_color TEXT NOT NULL DEFAULT '#b89b4a',
    display_theme TEXT NOT NULL DEFAULT 'light',
    results_sort_by TEXT NOT NULL DEFAULT 'number',
    round_complete_note TEXT NOT NULL DEFAULT 'Results are locked while the host prepares the next round.',
    auto_evaluate_exact BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Rounds / Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    badge_color TEXT NOT NULL DEFAULT '#3e1b20',
    default_points INTEGER NOT NULL DEFAULT 3,
    default_timer_seconds INTEGER NOT NULL DEFAULT 15,
    question_count INTEGER NOT NULL DEFAULT 10,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL DEFAULT 1,
    question_type TEXT NOT NULL DEFAULT 'identification',
    choices JSONB NOT NULL DEFAULT '[]'::jsonb,
    question_text TEXT NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    correct_answer TEXT NOT NULL,
    accepted_answers TEXT NOT NULL DEFAULT '',
    explanation TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 3,
    timer_seconds INTEGER NOT NULL DEFAULT 15,
    order_index INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Participating Schools / Groups / Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    seat_number INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🏛️',
    color TEXT NOT NULL DEFAULT '#3e1b20',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Live Competition Session State Table
CREATE TABLE IF NOT EXISTS competition_sessions (
    id TEXT PRIMARY KEY DEFAULT 'active_session',
    title TEXT NOT NULL DEFAULT 'IT Skills Olympics / Quiz Bee',
    status TEXT NOT NULL DEFAULT 'IDLE',
    active_category_id TEXT,
    results_category_id TEXT,
    current_question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
    timer_started_at TIMESTAMPTZ,
    timer_ends_at TIMESTAMPTZ,
    timer_duration INTEGER NOT NULL DEFAULT 15,
    show_correct_answer BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Contestant Answers & Judge Evaluations Table
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL DEFAULT 'active_session',
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL DEFAULT '',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_evaluated BOOLEAN NOT NULL DEFAULT FALSE,
    is_correct BOOLEAN DEFAULT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    override_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ,
    CONSTRAINT unique_team_question_answer UNIQUE (question_id, team_id)
);

-- 7. Judge & Competition Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'host',
    summary TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Useful Indexes
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id, question_number);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_team ON answers(team_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows the Quiz Bee server using the publishable key to sync data
-- ====================================================================
ALTER TABLE event_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow quizbee full access event_config" ON event_config;
CREATE POLICY "Allow quizbee full access event_config" ON event_config FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow quizbee full access categories" ON categories;
CREATE POLICY "Allow quizbee full access categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow quizbee full access questions" ON questions;
CREATE POLICY "Allow quizbee full access questions" ON questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow quizbee full access teams" ON teams;
CREATE POLICY "Allow quizbee full access teams" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow quizbee full access competition_sessions" ON competition_sessions;
CREATE POLICY "Allow quizbee full access competition_sessions" ON competition_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow quizbee full access answers" ON answers;
CREATE POLICY "Allow quizbee full access answers" ON answers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow quizbee full access audit_logs" ON audit_logs;
CREATE POLICY "Allow quizbee full access audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
