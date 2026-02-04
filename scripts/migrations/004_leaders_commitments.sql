-- Migration: leaders, commitments, promises, audit, and schema extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) New tables
CREATE TABLE IF NOT EXISTS public.leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  department_code text REFERENCES departments(code),
  municipality_code text REFERENCES municipalities(code),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.candidate_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled')),
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leader_commitment_promises (
  leader_id uuid NOT NULL REFERENCES leaders(id) ON DELETE CASCADE,
  commitment_id uuid NOT NULL REFERENCES candidate_commitments(id) ON DELETE CASCADE,
  promised_votes integer NOT NULL CHECK (promised_votes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (leader_id, commitment_id)
);

CREATE TABLE IF NOT EXISTS public.commitment_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES candidate_commitments(id) ON DELETE CASCADE,
  previous_status text CHECK (previous_status IN ('pending','fulfilled')),
  new_status text NOT NULL CHECK (new_status IN ('pending','fulfilled')),
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Table alterations
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS leader_id uuid REFERENCES leaders(id) ON DELETE SET NULL,
  ADD CONSTRAINT users_role_chk CHECK (role IN ('admin','leader','delegate'));

ALTER TABLE public.delegates
  ADD COLUMN IF NOT EXISTS leader_id uuid REFERENCES leaders(id) ON DELETE SET NULL;

ALTER TABLE public.delegate_polling_assignments
  ADD COLUMN IF NOT EXISTS divipole_location_id bigint REFERENCES divipole_locations(id) ON DELETE SET NULL;

ALTER TABLE public.vote_reports
  ADD COLUMN IF NOT EXISTS divipole_location_id bigint REFERENCES divipole_locations(id) ON DELETE SET NULL;

-- 3) Dashboard indexes
CREATE INDEX IF NOT EXISTS idx_leaders_candidate ON public.leaders(candidate_id);
CREATE INDEX IF NOT EXISTS idx_leaders_location ON public.leaders(department_code, municipality_code);
CREATE INDEX IF NOT EXISTS idx_commitments_candidate_status ON public.candidate_commitments(candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_promises_leader ON public.leader_commitment_promises(leader_id);
CREATE INDEX IF NOT EXISTS idx_promises_commitment ON public.leader_commitment_promises(commitment_id);
CREATE INDEX IF NOT EXISTS idx_users_leader ON public.users(leader_id);
CREATE INDEX IF NOT EXISTS idx_delegates_leader ON public.delegates(leader_id);
CREATE INDEX IF NOT EXISTS idx_delegate_assign_divipole ON public.delegate_polling_assignments(divipole_location_id);
CREATE INDEX IF NOT EXISTS idx_vote_reports_delegate ON public.vote_reports(delegate_id);
CREATE INDEX IF NOT EXISTS idx_vote_reports_assignment ON public.vote_reports(delegate_assignment_id);
CREATE INDEX IF NOT EXISTS idx_vote_reports_divipole ON public.vote_reports(divipole_location_id);
CREATE INDEX IF NOT EXISTS idx_vote_reports_reported_at ON public.vote_reports(reported_at);
