ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS token_plain text,
  ADD COLUMN IF NOT EXISTS uses integer NOT NULL DEFAULT 0;

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_kind_check;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_kind_check CHECK (kind IN ('single','rotating'));

CREATE INDEX IF NOT EXISTS invitations_rotating_idx
  ON public.invitations (kind, status, expires_at DESC);