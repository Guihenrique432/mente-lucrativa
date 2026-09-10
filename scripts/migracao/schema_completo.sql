
-- =========== PROFILES ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  plano TEXT NOT NULL DEFAULT 'gratuito',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: select own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: insert own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- updated_at trigger function (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========== RECEITAS ===========
CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  categoria TEXT NOT NULL,
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receitas TO authenticated;
GRANT ALL ON public.receitas TO service_role;
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Receitas: own all" ON public.receitas
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER receitas_set_updated_at BEFORE UPDATE ON public.receitas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX receitas_user_data_idx ON public.receitas(user_id, data DESC);

-- =========== DESPESAS ===========
CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  categoria TEXT NOT NULL,
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO authenticated;
GRANT ALL ON public.despesas TO service_role;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Despesas: own all" ON public.despesas
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER despesas_set_updated_at BEFORE UPDATE ON public.despesas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX despesas_user_data_idx ON public.despesas(user_id, data DESC);

-- =========== PRODUTOS ===========
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  custo NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (custo >= 0),
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (preco_venda >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Produtos: own all" ON public.produtos
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER produtos_set_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX produtos_user_idx ON public.produtos(user_id);

-- =========== METAS ===========
CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_lucro NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (meta_lucro >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Metas: own all" ON public.metas
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER metas_set_updated_at BEFORE UPDATE ON public.metas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TYPE public.tipo_movimentacao AS ENUM ('entrada', 'saida');

CREATE TABLE public.movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo public.tipo_movimentacao NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  observacao text,
  data timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mov_produto ON public.movimentacoes_estoque(produto_id, data DESC);
CREATE INDEX idx_mov_user ON public.movimentacoes_estoque(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movimentacoes: own all"
  ON public.movimentacoes_estoque FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.apply_movimentacao_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END;
    UPDATE public.produtos
      SET quantidade = GREATEST(0, quantidade + delta), updated_at = now()
      WHERE id = NEW.produto_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.tipo = 'entrada' THEN -OLD.quantidade ELSE OLD.quantidade END;
    UPDATE public.produtos
      SET quantidade = GREATEST(0, quantidade + delta), updated_at = now()
      WHERE id = OLD.produto_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_apply_movimentacao
  AFTER INSERT OR DELETE ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.apply_movimentacao_estoque();

REVOKE EXECUTE ON FUNCTION public.apply_movimentacao_estoque() FROM PUBLIC, anon, authenticated;

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

REVOKE EXECUTE ON FUNCTION public.log_lancamento_changes() FROM PUBLIC, anon, authenticated;
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
);REVOKE ALL ON FUNCTION public.expirar_assinaturas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expirar_assinaturas() TO postgres, service_role;-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles: select own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

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

-- Fundador
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'guilhermecandido1505@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Convites
DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM ('pending', 'used', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  token_hint text NOT NULL DEFAULT '',
  label text,
  status public.invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid,
  created_by uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS invitations_token_hash_idx ON public.invitations (token_hash);
CREATE INDEX IF NOT EXISTS invitations_status_idx ON public.invitations (status);

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations: admin select" ON public.invitations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "invitations: admin insert" ON public.invitations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "invitations: admin update" ON public.invitations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS token_plain text,
  ADD COLUMN IF NOT EXISTS uses integer NOT NULL DEFAULT 0;

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_kind_check;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_kind_check CHECK (kind IN ('single','rotating'));

CREATE INDEX IF NOT EXISTS invitations_rotating_idx
  ON public.invitations (kind, status, expires_at DESC);REVOKE EXECUTE ON FUNCTION public.expirar_assinaturas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_movimentacao_estoque() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lancamento_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expirar_assinaturas() TO service_role;CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;CREATE TABLE public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions: own all" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notificacoes_diarias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  canal text not null,
  status text not null default 'enviado',
  created_at timestamptz not null default now(),
  unique (user_id, data, canal)
);
GRANT SELECT ON public.notificacoes_diarias TO authenticated;
GRANT ALL ON public.notificacoes_diarias TO service_role;
ALTER TABLE public.notificacoes_diarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes_diarias: select own" ON public.notificacoes_diarias FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notificacao_execucoes (
  data date primary key,
  status text not null default 'rodando',
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  detalhe text
);
GRANT ALL ON public.notificacao_execucoes TO service_role;
ALTER TABLE public.notificacao_execucoes ENABLE ROW LEVEL SECURITY;CREATE POLICY "notificacao_execucoes: no client access" ON public.notificacao_execucoes FOR SELECT TO authenticated USING (false);CREATE OR REPLACE FUNCTION public.protect_plano_columns()
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

REVOKE EXECUTE ON FUNCTION public.protect_plano_columns() FROM PUBLIC, anon, authenticated;CREATE TABLE IF NOT EXISTS public.preferencias_notificacao (
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
ALTER TABLE public.notificacao_execucoes DROP CONSTRAINT IF EXISTS notificacao_execucoes_pkey;
ALTER TABLE public.notificacao_execucoes ADD PRIMARY KEY (data, horario);CREATE TABLE public.perfil_financeiro (
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
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();CREATE TABLE public.contratos (
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

CREATE INDEX contratos_receb_idx ON public.contratos_recebimentos (user_id, contrato_id);ALTER TABLE public.perfil_financeiro
  ADD COLUMN IF NOT EXISTS regime_tributario text NOT NULL DEFAULT 'nao_informado',
  ADD COLUMN IF NOT EXISTS anexo_simples text,
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS natureza_juridica text,
  ADD COLUMN IF NOT EXISTS tipos_receita text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS aliquota_iss numeric,
  ADD COLUMN IF NOT EXISTS tem_folha boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS folha_mensal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_labore numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS possui_creditos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creditos_deducoes text,
  ADD COLUMN IF NOT EXISTS beneficios_fiscais text,
  ADD COLUMN IF NOT EXISTS faturamento_12m numeric,
  ADD COLUMN IF NOT EXISTS periodo_apuracao text NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS tem_contador boolean NOT NULL DEFAULT false;CREATE TABLE public.lembretes (
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