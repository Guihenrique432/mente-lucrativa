CREATE OR REPLACE FUNCTION public.protect_plano_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR pg_has_role(current_user, 'service_role', 'member') THEN
    RETURN NEW;
  END IF;

  NEW.plano := OLD.plano;
  NEW.plano_status := OLD.plano_status;
  NEW.plano_expira_em := OLD.plano_expira_em;
  NEW.plano_cancelado_em := OLD.plano_cancelado_em;
  NEW.plano_renova_automaticamente := OLD.plano_renova_automaticamente;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_plano_columns ON public.profiles;
CREATE TRIGGER trg_protect_plano_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_plano_columns();

REVOKE EXECUTE ON FUNCTION public.protect_plano_columns() FROM PUBLIC, anon, authenticated;