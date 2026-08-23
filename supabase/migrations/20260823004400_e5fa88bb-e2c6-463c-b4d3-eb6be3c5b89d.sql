CREATE TABLE IF NOT EXISTS public.preferencias_notificacao (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  horarios text[] NOT NULL DEFAULT ARRAY['21:30']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferencias_notificacao TO authenticated;
GRANT ALL ON public.preferencias_notificacao TO service_role;

ALTER TABLE public.preferencias_notificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prefs notificacao: own all" ON public.preferencias_notificacao
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS preferencias_notificacao_set_updated_at ON public.preferencias_notificacao;
CREATE TRIGGER preferencias_notificacao_set_updated_at
  BEFORE UPDATE ON public.preferencias_notificacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notificacoes_diarias ADD COLUMN IF NOT EXISTS horario text NOT NULL DEFAULT '21:30';
CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_diarias_slot_uidx
  ON public.notificacoes_diarias (user_id, data, canal, horario);

ALTER TABLE public.notificacao_execucoes ADD COLUMN IF NOT EXISTS horario text NOT NULL DEFAULT '21:30';
