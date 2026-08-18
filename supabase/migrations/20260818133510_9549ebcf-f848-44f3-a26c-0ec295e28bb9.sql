CREATE TABLE public.push_subscriptions (
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
ALTER TABLE public.notificacao_execucoes ENABLE ROW LEVEL SECURITY;