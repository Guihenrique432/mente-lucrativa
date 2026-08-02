ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plano_status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS plano_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS plano_cancelado_em timestamptz,
  ADD COLUMN IF NOT EXISTS plano_renova_automaticamente boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plano_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plano_status_check
  CHECK (plano_status IN ('ativo', 'cancelado', 'vencido'));

CREATE OR REPLACE FUNCTION public.sync_plano_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.plano = 'gratuito' THEN
    NEW.plano_status := 'ativo';
    NEW.plano_expira_em := NULL;
    NEW.plano_cancelado_em := NULL;
    RETURN NEW;
  END IF;

  IF NEW.plano_expira_em IS NOT NULL AND NEW.plano_expira_em <= now() THEN
    NEW.plano := 'gratuito';
    NEW.plano_status := 'vencido';
    NEW.plano_renova_automaticamente := false;
    RETURN NEW;
  END IF;

  IF NEW.plano_cancelado_em IS NOT NULL THEN
    NEW.plano_status := 'cancelado';
  ELSE
    NEW.plano_status := 'ativo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_plano_status ON public.profiles;
CREATE TRIGGER trg_sync_plano_status
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_plano_status();

CREATE OR REPLACE FUNCTION public.expirar_assinaturas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.profiles
     SET plano_expira_em = plano_expira_em
   WHERE plano <> 'gratuito'
     AND plano_expira_em IS NOT NULL
     AND plano_expira_em <= now();
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('expirar-assinaturas-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expirar-assinaturas-diario');

SELECT cron.schedule(
  'expirar-assinaturas-diario',
  '5 3 * * *',
  $$SELECT public.expirar_assinaturas();$$
);