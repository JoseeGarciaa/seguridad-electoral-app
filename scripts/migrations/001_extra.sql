-- Extra domain tables to support UI modules beyond core DDL
-- Run this using psql against your DATABASE_URL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS team_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegate_id uuid UNIQUE REFERENCES delegates(id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL,
  zone text NULL,
  municipality text NULL,
  assigned_polling_stations integer NOT NULL DEFAULT 0,
  reports_submitted integer NOT NULL DEFAULT 0,
  last_active_at timestamptz NULL,
  avatar_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  assignee_id uuid NULL REFERENCES delegates(id) ON DELETE SET NULL,
  delegate_assignment_id uuid NULL REFERENCES delegate_polling_assignments(id) ON DELETE SET NULL,
  municipality text NULL,
  zone text NULL,
  due_date timestamptz NULL,
  priority text NOT NULL,
  status text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  tasks_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignments_assignee_idx ON assignments(assignee_id);
CREATE INDEX IF NOT EXISTS assignments_delegate_assignment_idx ON assignments(delegate_assignment_id);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NULL REFERENCES assignments(id) ON DELETE SET NULL,
  title text NOT NULL,
  owner text NOT NULL,
  place text NULL,
  status text NOT NULL,
  priority text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  due_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_assignment_idx ON tasks(assignment_id);

CREATE TABLE IF NOT EXISTS supporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  municipality_code text NULL REFERENCES municipalities(code) ON DELETE SET NULL,
  zone text NULL,
  phone text NULL,
  email text NULL,
  commitment integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  channel text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supporters_municipality_idx ON supporters(municipality_code);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date timestamptz NULL,
  hour text NULL,
  place text NULL,
  type text NOT NULL,
  attendance integer NOT NULL DEFAULT 0,
  lead text NULL,
  status text NOT NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  description text NULL,
  municipality text NULL,
  polling_station text NULL,
  uploaded_by_id uuid NULL REFERENCES delegates(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  url text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  vote_report_id uuid NULL REFERENCES vote_reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidences_municipality_idx ON evidences(municipality);
CREATE INDEX IF NOT EXISTS evidences_uploaded_by_idx ON evidences(uploaded_by_id);

CREATE TABLE IF NOT EXISTS communication_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  channel text NOT NULL,
  preview text NOT NULL,
  content text NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS communication_messages_channel_idx ON communication_messages(channel);

CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  channel text NOT NULL,
  reach integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  scheduled_at timestamptz NULL,
  content text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS broadcasts_channel_idx ON broadcasts(channel);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level text NOT NULL,
  category text NOT NULL,
  municipality text NULL,
  detail text NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);
CREATE INDEX IF NOT EXISTS alerts_level_idx ON alerts(level);
CREATE INDEX IF NOT EXISTS alerts_status_idx ON alerts(status);

CREATE TABLE IF NOT EXISTS kpi_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  value text NOT NULL,
  target text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  detail text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date timestamptz NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
