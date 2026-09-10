# Guia de migração: sair do Lovable Cloud

Este pacote contém tudo o que você precisa para recriar o banco de dados e hospedar o app fora do Lovable Cloud.

## Arquivos incluídos

| Arquivo | Descrição |
|---------|-----------|
| `schema_completo.sql` | Estrutura completa do banco (tabelas, enums, funções, triggers, RLS, policies). |
| `exportar_dados.ts` | Script que exporta os dados das tabelas `public.*` do Supabase atual. |
| `importar_usuarios.ts` | Script que recria os usuários de autenticação no novo Supabase. |
| `README_MIGRACAO.md` | Este guia. |

## Plataformas recomendadas

- **Banco de dados:** Supabase próprio (plano Free ou pago).
- **Frontend:** Vercel (plano Hobby/Free).

> Atenção: o plano Free do Supabase pausa o banco após 7 dias sem uso. Para uso diário, considere o plano pago.

## Passo a passo

### 1. Criar o novo projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta.
2. Crie um novo projeto.
3. Anote:
   - Project URL
   - anon/public key
   - service role key (Settings > API)

### 2. Importar a estrutura do banco

1. No SQL Editor do novo projeto, cole o conteúdo de `schema_completo.sql`.
2. Execute. Isso criará todas as tabelas, policies, triggers e funções.

### 3. Exportar os dados do banco atual (Lovable Cloud)

O banco atual precisa estar ativo para exportar. Se ele estiver pausado, você precisa religá-lo manualmente nas configurações do Cloud.

Com o banco ativo, rode:

```bash
SUPABASE_URL=https://rnoxsjmiykmrptoeolit.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<sua-chave-service-role-do-Lovable> \
bun exportar_dados.ts
```

Isso gera a pasta `dados/` com um JSON por tabela e o arquivo `dados_publicos.sql`.

### 4. Migrar os usuários de autenticação

As senhas não podem ser copiadas de um Supabase para outro. Por isso, os usuários precisam ser recriados e redefinir a senha depois.

No banco antigo, execute uma migration temporária para copiar os usuários:

```sql
CREATE TABLE public.migration_auth_users AS
SELECT id, email, email_confirmed_at, phone, raw_user_meta_data
FROM auth.users;

GRANT SELECT ON public.migration_auth_users TO service_role;
```

Depois exporte essa tabela junto com as demais (o script `exportar_dados.ts` já a incluirá se ela estiver no schema).

No novo Supabase, rode:

```bash
NOVO_SUPABASE_URL=<url-do-novo> \
NOVO_SUPABASE_SERVICE_ROLE_KEY=<chave-service-role-do-novo> \
bun importar_usuarios.ts dados/migration_auth_users.json
```

### 5. Importar os dados públicos

Com os usuários já criados no novo Supabase, execute no SQL Editor:

```sql
-- Cole o conteúdo de dados_publicos.sql
```

Se preferir importar via script em vez de SQL, você pode usar o próprio `supabase-js` com a service role key para inserir os JSONs.

### 6. Configurar autenticação social

No novo Supabase, vá em **Authentication > Providers** e ative:

- Email
- Google
- Apple

Para Google e Apple, você precisará criar credenciais nos painéis deles e colar no Supabase.

O URL de redirecionamento (callback) deve ser o domínio novo do app, por exemplo:

```
https://seu-app.vercel.app/auth/callback
```

### 7. Preparar o app para o novo backend

No projeto, crie um arquivo `.env` baseado em `.env.example` (já incluído no código) com as credenciais do novo Supabase.

As variáveis que precisam mudar são:

```env
SUPABASE_URL=https://<novo>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon-key-do-novo>
SUPABASE_PROJECT_ID=<id-do-novo>
VITE_SUPABASE_URL=https://<novo>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-do-novo>
VITE_SUPABASE_PROJECT_ID=<id-do-novo>
```

A `SUPABASE_SERVICE_ROLE_KEY` também deve ser a do novo projeto, mas só no servidor (Vercel).

### 8. Hospedar na Vercel

1. Crie uma conta em [vercel.com](https://vercel.com).
2. Importe o repositório Git (GitHub/GitLab).
3. Nas configurações do projeto Vercel, defina:
   - **Build Command:** `vite build --config vite.config.vercel.ts`
   - **Output Directory:** deixe em branco (o Nitro gerencia)
4. Adicione as variáveis de ambiente do novo Supabase.
5. Faça o deploy.

O arquivo `vite.config.vercel.ts` já está configurado para o preset `vercel` do Nitro.

### 9. Testar

- Crie um novo usuário no app hospedado na Vercel.
- Faça login com e-mail e com Google/Apple.
- Verifique se os dados antigos aparecem para usuários existentes.
- Teste cadastro de receita, despesa, produto, contrato e lembrete.

### 10. Domínio

O endereço atual `mente-lucrativa.lovable.app` pertence à Lovable. Para manter o mesmo nome, você precisa de um domínio próprio e apontá-lo para a Vercel. Caso contrário, o app ficará em `https://<nome>-<id>.vercel.app`.

## Suporte

Se o banco atual continuar pausado e você não conseguir exportar os dados, a única saída é religá-lo manualmente nas configurações do Lovable Cloud. Sem isso, não é possível copiar os dados antigos.
