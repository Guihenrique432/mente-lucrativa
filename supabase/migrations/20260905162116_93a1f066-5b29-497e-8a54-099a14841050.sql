CREATE TABLE public.lembretes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horario text NOT NULL DEFAULT '21:30',
  dias_semana integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  assunto text NOT NULL DEFAULT 'lucro',
  mensagem text,
  canal text NOT NULL DEFAULT 'push',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lembretes_horario_fmt CHECK (horario ~ '^[0-2][0-9]:[0-5][0-9]$'),
  CONSTRAINT lembretes_assunto_chk CHECK (assunto IN ('lucro','despesas','estoque','meta','personalizado')),
  CONSTRAINT lembretes_canal_chk CHECK (canal IN ('push')),
  CONSTRAINT lembretes_mensagem_len CHECK (mensagem IS NULL OR char_length(mensagem) <= 140)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembretes TO authenticated;
GRANT ALL ON public.lembretes TO service_role;

ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lembretes: own all" ON public.lembretes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER lembretes_set_updated_at BEFORE UPDATE ON public.lembretes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX lembretes_user_idx ON public.lembretes(user_id);

ALTER TABLE public.notificacoes_diarias ADD COLUMN IF NOT EXISTS lembrete_id uuid;

INSERT INTO public.lembretes (user_id, horario, assunto)
SELECT p.user_id, h, 'lucro'
FROM public.preferencias_notificacao p, unnest(p.horarios) AS h
WHERE h ~ '^[0-2][0-9]:[0-5][0-9]$';