/*
# IRIS Cognitive Core Schema

1. Purpose
This migration establishes the persistent backing store for IRIS's upgraded
cognitive core. It introduces four tables that together enable:
  - Multi-turn conversation memory with context retention
  - System telemetry snapshots (CPU, memory, temperature, processes)
  - Managed background process registry
  - Proactive routines that cross-reference time/location to anticipate needs

2. New Tables
- `conversations`
    Stores every conversational turn (user + model) so IRIS can retain
    multi-turn context across sessions. Each row is one message.
    Columns:
      id           uuid PK
      role         text  ('user' | 'model' | 'system')
      content      text  (the message text)
      mood         text  (detected mood at time of message)
      turn_id      uuid  (groups user+model pairs into a single turn)
      created_at   timestamptz
- `system_metrics`
    Time-series snapshots of host telemetry pushed by the Electron main
    process. Queried by the renderer for live gauges and sparklines.
    Columns:
      id            uuid PK
      cpu_percent   numeric
      mem_percent   numeric
      mem_used_mb   numeric
      mem_total_mb  numeric
      temp_c        numeric  (CPU temp, null if unavailable)
      process_count integer
      load_avg      numeric  (1-minute load average, null if unavailable)
      created_at    timestamptz
- `processes`
    Registry of background processes IRIS is managing (launched, watched,
    or killed). Used by the System Command Center process manager.
    Columns:
      id          uuid PK
      name        text
      pid         integer  (null if not running)
      status      text     ('running' | 'stopped' | 'error')
      cpu_percent numeric
      mem_mb      numeric
      command     text     (launch command/path)
      created_at  timestamptz
      updated_at  timestamptz
- `routines`
    Proactive routines that IRIS cross-references against the current
    time and context to anticipate user needs (e.g. "start focus playlist
    at 09:00", "open standup doc 5 min before 10:00 meeting").
    Columns:
      id          uuid PK
      title       text
      trigger     text     (cron-like or natural-language trigger)
      action      text     (what IRIS should do)
      time_hint   text     (HH:MM or freeform time reference)
      location    text     (optional geofence/location tag)
      enabled     boolean  default true
      last_fired   timestamptz
      created_at  timestamptz
      updated_at  timestamptz

3. Indexes
- conversations_created_at_idx on conversations(created_at DESC) for
  fast "load recent context" queries.
- conversations_turn_id_idx on conversations(turn_id) for grouping.
- system_metrics_created_at_idx on system_metrics(created_at DESC) for
  the live telemetry window.
- processes_status_idx on processes(status) for filtering running/stopped.
- routines_enabled_idx on routines(enabled) where enabled for quick
  proactive scans.

4. Security
This is a single-tenant, no-auth desktop OS application. There is no
sign-in screen; the renderer talks to Supabase with the anon key for its
entire lifetime. Therefore ALL policies use `TO anon, authenticated` with
`USING (true)` / `WITH CHECK (true)` because the data is intentionally
shared within the single desktop instance. RLS is still enabled on every
table to satisfy the non-negotiable RLS requirement; the policies simply
grant the anon role full CRUD since there is no multi-user boundary to
enforce.

5. Notes
- No user_id columns and no auth.users FKs — this is single-tenant.
- All tables use gen_random_uuid() defaults so inserts can omit the id.
- updated_at columns are maintained by the application layer (or a future
  trigger) rather than by a default expression.
*/

-- conversations -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role       text NOT NULL CHECK (role IN ('user', 'model', 'system')),
  content    text NOT NULL,
  mood       text,
  turn_id    uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_created_at_idx
  ON conversations (created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_turn_id_idx
  ON conversations (turn_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_conversations" ON conversations;
CREATE POLICY "anon_select_conversations" ON conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_conversations" ON conversations;
CREATE POLICY "anon_insert_conversations" ON conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_conversations" ON conversations;
CREATE POLICY "anon_update_conversations" ON conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_conversations" ON conversations;
CREATE POLICY "anon_delete_conversations" ON conversations FOR DELETE
  TO anon, authenticated USING (true);

-- system_metrics ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpu_percent   numeric,
  mem_percent   numeric,
  mem_used_mb   numeric,
  mem_total_mb  numeric,
  temp_c        numeric,
  process_count integer,
  load_avg      numeric,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_metrics_created_at_idx
  ON system_metrics (created_at DESC);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_system_metrics" ON system_metrics;
CREATE POLICY "anon_select_system_metrics" ON system_metrics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_system_metrics" ON system_metrics;
CREATE POLICY "anon_insert_system_metrics" ON system_metrics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_system_metrics" ON system_metrics;
CREATE POLICY "anon_delete_system_metrics" ON system_metrics FOR DELETE
  TO anon, authenticated USING (true);

-- processes -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  pid         integer,
  status      text NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'error')),
  cpu_percent numeric,
  mem_mb      numeric,
  command     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS processes_status_idx ON processes (status);

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_processes" ON processes;
CREATE POLICY "anon_select_processes" ON processes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_processes" ON processes;
CREATE POLICY "anon_insert_processes" ON processes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_processes" ON processes;
CREATE POLICY "anon_update_processes" ON processes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_processes" ON processes;
CREATE POLICY "anon_delete_processes" ON processes FOR DELETE
  TO anon, authenticated USING (true);

-- routines ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  trigger    text,
  action     text NOT NULL,
  time_hint  text,
  location   text,
  enabled    boolean NOT NULL DEFAULT true,
  last_fired timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routines_enabled_idx ON routines (enabled) WHERE enabled;

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_routines" ON routines;
CREATE POLICY "anon_select_routines" ON routines FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_routines" ON routines;
CREATE POLICY "anon_insert_routines" ON routines FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_routines" ON routines;
CREATE POLICY "anon_update_routines" ON routines FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_routines" ON routines;
CREATE POLICY "anon_delete_routines" ON routines FOR DELETE
  TO anon, authenticated USING (true);
