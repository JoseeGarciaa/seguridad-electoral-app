-- Adds hierarchical role support for delegates
ALTER TABLE public.delegates
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'testigo_electoral',
  ADD COLUMN IF NOT EXISTS zone text NULL,
  ADD COLUMN IF NOT EXISTS supervisor_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'delegates_supervisor_id_fkey'
      AND tc.table_name = 'delegates'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.delegates
      ADD CONSTRAINT delegates_supervisor_id_fkey
      FOREIGN KEY (supervisor_id)
      REFERENCES public.delegates(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS delegates_role_idx ON public.delegates(role);
CREATE INDEX IF NOT EXISTS delegates_supervisor_idx ON public.delegates(supervisor_id);
