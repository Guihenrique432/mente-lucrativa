
-- Historico de lançamentos
CREATE TABLE public.historico_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tabela text NOT NULL CHECK (tabela IN ('receitas','despesas')),
  registro_id uuid NOT NULL,
  acao text NOT NULL CHECK (acao IN ('insert','update','delete')),
  dados_antes jsonb,
  dados_depois jsonb,
  campos_alterados text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.historico_lancamentos TO authenticated;
GRANT ALL ON public.historico_lancamentos TO service_role;

ALTER TABLE public.historico_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Historico: select own" ON public.historico_lancamentos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_historico_user_created ON public.historico_lancamentos (user_id, created_at DESC);
CREATE INDEX idx_historico_registro ON public.historico_lancamentos (registro_id);

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_lancamento_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_before jsonb;
  v_after jsonb;
  v_changed text[] := '{}';
  v_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_user := NEW.user_id;
    v_after := to_jsonb(NEW) - 'updated_at' - 'created_at';
    INSERT INTO public.historico_lancamentos(user_id, tabela, registro_id, acao, dados_depois)
    VALUES (v_user, TG_TABLE_NAME, NEW.id, 'insert', v_after);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_user := NEW.user_id;
    v_before := to_jsonb(OLD) - 'updated_at' - 'created_at';
    v_after := to_jsonb(NEW) - 'updated_at' - 'created_at';
    FOR v_key IN SELECT jsonb_object_keys(v_after) LOOP
      IF v_before->v_key IS DISTINCT FROM v_after->v_key THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;
    IF array_length(v_changed,1) IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.historico_lancamentos(user_id, tabela, registro_id, acao, dados_antes, dados_depois, campos_alterados)
    VALUES (v_user, TG_TABLE_NAME, NEW.id, 'update', v_before, v_after, v_changed);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_user := OLD.user_id;
    v_before := to_jsonb(OLD) - 'updated_at' - 'created_at';
    INSERT INTO public.historico_lancamentos(user_id, tabela, registro_id, acao, dados_antes)
    VALUES (v_user, TG_TABLE_NAME, OLD.id, 'delete', v_before);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_log_receitas
AFTER INSERT OR UPDATE OR DELETE ON public.receitas
FOR EACH ROW EXECUTE FUNCTION public.log_lancamento_changes();

CREATE TRIGGER trg_log_despesas
AFTER INSERT OR UPDATE OR DELETE ON public.despesas
FOR EACH ROW EXECUTE FUNCTION public.log_lancamento_changes();
