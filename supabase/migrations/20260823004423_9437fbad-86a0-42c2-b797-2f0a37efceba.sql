ALTER TABLE public.notificacao_execucoes DROP CONSTRAINT IF EXISTS notificacao_execucoes_pkey;
ALTER TABLE public.notificacao_execucoes ADD PRIMARY KEY (data, horario);