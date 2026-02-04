-- Sync delegate/team role taxonomy with UI values
-- Roles supported in UI: witness, coordinator, mobilizer, leader
-- Statuses supported in UI: active, inactive, pending

BEGIN;

-- Normalize legacy Spanish role values into canonical lowercase English codes
UPDATE delegates
SET role = CASE
  WHEN role ILIKE 'testigo%' THEN 'witness'
  WHEN role ILIKE 'coordinador%' THEN 'coordinator'
  WHEN role ILIKE 'movilizador%' THEN 'mobilizer'
  WHEN role ILIKE 'lider%' OR role ILIKE 'líder%' THEN 'leader'
  ELSE role
END,
updated_at = now();

UPDATE team_profiles
SET role = CASE
  WHEN role ILIKE 'testigo%' THEN 'witness'
  WHEN role ILIKE 'coordinador%' THEN 'coordinator'
  WHEN role ILIKE 'movilizador%' THEN 'mobilizer'
  WHEN role ILIKE 'lider%' OR role ILIKE 'líder%' THEN 'leader'
  ELSE role
END,
updated_at = now();

-- Default roles to witness for new delegates/team profiles
ALTER TABLE delegates ALTER COLUMN role SET DEFAULT 'witness';
ALTER TABLE team_profiles ALTER COLUMN role SET DEFAULT 'witness';

-- Enforce allowed role values
ALTER TABLE delegates DROP CONSTRAINT IF EXISTS delegates_role_check;
ALTER TABLE delegates ADD CONSTRAINT delegates_role_check CHECK (role IN ('witness','coordinator','mobilizer','leader'));

ALTER TABLE team_profiles DROP CONSTRAINT IF EXISTS team_profiles_role_check;
ALTER TABLE team_profiles ADD CONSTRAINT team_profiles_role_check CHECK (role IN ('witness','coordinator','mobilizer','leader'));

-- Normalize and constrain status values used by the UI (active/inactive/pending)
UPDATE team_profiles
SET status = CASE
  WHEN status ILIKE 'activo%' THEN 'active'
  WHEN status ILIKE 'inactivo%' THEN 'inactive'
  WHEN status ILIKE 'pend%' THEN 'pending'
  ELSE status
END,
updated_at = now();

ALTER TABLE team_profiles DROP CONSTRAINT IF EXISTS team_profiles_status_check;
ALTER TABLE team_profiles ADD CONSTRAINT team_profiles_status_check CHECK (status IN ('active','inactive','pending'));

COMMIT;
