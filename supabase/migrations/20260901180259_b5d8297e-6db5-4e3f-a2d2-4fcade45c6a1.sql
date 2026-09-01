CREATE TABLE public.perfil_financeiro (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  modelo text NOT NULL DEFAULT 'outro',
  profissao text,
  atividade text,
  forma_recebimento text,
  tem_estoque boolean NOT NULL DEFAULT false,
  tem_contratos boolean NOT NULL DEFAULT false,
  atende_clientes boolean NOT NULL DEFAULT false,
  funcionarios integer NOT NULL DEFAULT 0,
  recorrencia_receita text NOT NULL DEFAULT 'variavel',
  principais_despesas text[] NOT NULL DEFAULT '{}'::text[],
  separa_pessoal_empresa boolean NOT NULL DEFAULT false,
  observacoes text,
  onboarding_concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_financeiro TO authenticated;
GRANT ALL ON public.perfil_financeiro TO service_role;

ALTER TABLE public.perfil_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil_financeiro: own all" ON public.perfil_financeiro
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER perfil_financeiro_set_updated_at
  BEFORE UPDATE ON public.perfil_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();