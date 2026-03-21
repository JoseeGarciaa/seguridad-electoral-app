-- Migration: administrative communes, voter history, leader-commune goals,
-- optional witness-leader links, and admin commitments assigned to leaders.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Communes sourced from DIVIPOLE per municipality
CREATE TABLE IF NOT EXISTS public.admin_communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code text REFERENCES public.departments(code) ON DELETE SET NULL,
  municipality_code text NOT NULL REFERENCES public.municipalities(code) ON DELETE CASCADE,
  name text NOT NULL,
  divipole_comuna text,
  voters_current integer NOT NULL DEFAULT 0 CHECK (voters_current >= 0),
  tables_current integer NOT NULL DEFAULT 0 CHECK (tables_current >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_code, name)
);

CREATE INDEX IF NOT EXISTS idx_admin_communes_department ON public.admin_communes(department_code);
CREATE INDEX IF NOT EXISTS idx_admin_communes_municipality ON public.admin_communes(municipality_code);

-- 2) Voter history snapshots by commune
CREATE TABLE IF NOT EXISTS public.commune_voter_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id uuid NOT NULL REFERENCES public.admin_communes(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  women integer NOT NULL DEFAULT 0 CHECK (women >= 0),
  men integer NOT NULL DEFAULT 0 CHECK (men >= 0),
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  tables integer NOT NULL DEFAULT 0 CHECK (tables >= 0),
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commune_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_commune_voter_history_date ON public.commune_voter_history(snapshot_date);

-- 3) Leader assignments to communes with vote/witness goals
CREATE TABLE IF NOT EXISTS public.leader_commune_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  commune_id uuid NOT NULL REFERENCES public.admin_communes(id) ON DELETE CASCADE,
  assigned_votes integer NOT NULL DEFAULT 0 CHECK (assigned_votes >= 0),
  assigned_witnesses integer NOT NULL DEFAULT 0 CHECK (assigned_witnesses >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (leader_id, commune_id)
);

CREATE INDEX IF NOT EXISTS idx_leader_commune_assignments_commune ON public.leader_commune_assignments(commune_id);
CREATE INDEX IF NOT EXISTS idx_leader_commune_assignments_status ON public.leader_commune_assignments(status);

-- 4) Optional links from witness/delegate to leader and commune
ALTER TABLE public.delegates
  ADD COLUMN IF NOT EXISTS commune_id uuid REFERENCES public.admin_communes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delegates_commune ON public.delegates(commune_id);

-- leader_id on delegates was introduced previously, keep idempotent index here
CREATE INDEX IF NOT EXISTS idx_delegates_leader_id ON public.delegates(leader_id);

-- 5) Admin commitments and assignment to leaders
CREATE TABLE IF NOT EXISTS public.admin_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  due_date timestamptz,
  created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_commitments_status ON public.admin_commitments(status);
CREATE INDEX IF NOT EXISTS idx_admin_commitments_due_date ON public.admin_commitments(due_date);

CREATE TABLE IF NOT EXISTS public.leader_admin_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_commitment_id uuid NOT NULL REFERENCES public.admin_commitments(id) ON DELETE CASCADE,
  leader_id uuid NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  notes text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_commitment_id, leader_id)
);

CREATE INDEX IF NOT EXISTS idx_leader_admin_commitments_leader_status
  ON public.leader_admin_commitments(leader_id, status);

-- 6) Optional direct relation from task to leader
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS leader_id uuid REFERENCES public.leaders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_leader ON public.tasks(leader_id);
