CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente text NOT NULL,
  titulo text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'contrato',
  valor_contratado numeric NOT NULL DEFAULT 0,
  custo_estimado numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  dia_vencimento integer,
  situacao text NOT NULL DEFAULT 'ativo',
  recorrente boolean NOT NULL DEFAULT false,
  valor_mensal numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contratos: own all" ON public.contratos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER contratos_set_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX contratos_user_idx ON public.contratos (user_id, situacao);

CREATE TABLE public.contratos_recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  valor numeric NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  vencimento date,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_recebimentos TO authenticated;
GRANT ALL ON public.contratos_recebimentos TO service_role;

ALTER TABLE public.contratos_recebimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recebimentos: own all" ON public.contratos_recebimentos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER contratos_recebimentos_set_updated_at
  BEFORE UPDATE ON public.contratos_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX contratos_receb_idx ON public.contratos_recebimentos (user_id, contrato_id);