-- Execute depois da carga dos dados públicos.
BEGIN;

ALTER TABLE public.profiles ENABLE TRIGGER ALL;
ALTER TABLE public.receitas ENABLE TRIGGER ALL;
ALTER TABLE public.despesas ENABLE TRIGGER ALL;
ALTER TABLE public.produtos ENABLE TRIGGER ALL;
ALTER TABLE public.movimentacoes_estoque ENABLE TRIGGER ALL;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER TABLE public.notificacoes_diarias
  DROP CONSTRAINT IF EXISTS notificacoes_diarias_user_id_data_canal_key;
DROP INDEX IF EXISTS public.notificacoes_diarias_slot_uidx;
CREATE UNIQUE INDEX notificacoes_diarias_slot_uidx
  ON public.notificacoes_diarias (
    user_id, data, canal, horario,
    COALESCE(lembrete_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

COMMIT;
