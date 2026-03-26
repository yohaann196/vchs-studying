-- Registration-attempt tracking (used by the `register` Edge Function for rate limiting)
CREATE TABLE public.registration_attempts (
  id         BIGSERIAL    PRIMARY KEY,
  ip_hash    TEXT         NOT NULL,           -- SHA-256 of IP + server-side salt (never raw IP)
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reg_attempts_ip_time ON public.registration_attempts(ip_hash, created_at DESC);

-- The service-role key (used only by the Edge Function) bypasses RLS, so no policies
-- are needed for inserts/selects by the function.
-- Deny all access via the anon/authenticated roles so the table is not publicly readable.
ALTER TABLE public.registration_attempts ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies → effectively blocks all client-side access.

-- ── Leaderboard table
CREATE TABLE public.leaderboard (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT         NOT NULL,
  class_id   TEXT         NOT NULL,
  class_name TEXT         NOT NULL,
  pct        INTEGER      NOT NULL,   -- percentage correct (0-100)
  score      INTEGER      NOT NULL,   -- total points
  answered   INTEGER      NOT NULL,   -- number of questions answered
  mode       TEXT         NOT NULL,   -- 'timed' | 'methodical'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_class ON public.leaderboard(class_id);
CREATE INDEX idx_leaderboard_user ON public.leaderboard(user_id);

-- Fast helper used by the homepage stat to count distinct users
-- without fetching all leaderboard rows.
CREATE OR REPLACE FUNCTION public.count_distinct_users()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(DISTINCT user_id)::integer FROM public.leaderboard;
$$;

-- Row-Level Security
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON public.leaderboard FOR SELECT USING (true);

CREATE POLICY "Users insert own scores"
  ON public.leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own scores"
  ON public.leaderboard FOR DELETE
  USING (auth.uid() = user_id);
