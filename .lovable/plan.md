# Plano: mudar o banco de dados e o app para fora do Lovable Cloud

## Objetivo
Sair do Lovable Cloud (banco pausado e sem religamento automático) e passar a rodar o app e o banco em contas próprias, começando pelo custo zero.

## Plataforma recomendada para o banco
**Supabase com uma conta própria (plano Free).**

Por quê:
- O app já foi feito para Supabase: tabelas, RLS, autenticação, políticas e código não precisam ser reescritos.
- A migração é mais direta do que trocar para MySQL, Firebase ou outro PostgreSQL.
- O plano Free dá banco PostgreSQL, autenticação, armazenamento e 500 mil requisições/mês.
- O ponto de atenção do Free: o banco entra em pausa automática depois de 7 dias sem atividade. Para uso diário, o plano pago (a partir de ~US$ 25/mês) evita pausa.

## Plataforma recomendada para o app (frontend)
**Vercel (plano Hobby/Free).**

Por quê:
- O app é React + TanStack Start + Vite, que rodam bem na Vercel.
- Build automático a partir do GitHub/GitLab.
- HTTPS e domínio próprio incluídos no plano Free.

## Passo a passo

1. Criar conta e projeto no Supabase
   - Acessar supabase.com, criar conta com o mesmo e-mail do app (ou outro).
   - Criar um novo projeto; escolher a região mais próxima (São Paulo ou Leste dos EUA).
   - Anotar: Project URL, anon/public key e service role key.

2. Exportar o banco atual do Lovable Cloud
   - Assim que o banco atual voltar a responder, gerar um dump completo (schema + dados).
   - Alternativa: usar os arquivos de migration que já existem no projeto (`supabase/migrations`) e complementar com os dados (INSERTs) das tabelas.
   - Tabelas principais para não perder: `profiles`, `perfil_financeiro`, `receitas`, `despesas`, `produtos`, `movimentacoes_estoque`, `contratos`, `contratos_recebimentos`, `metas`, `lembretes`, `preferencias_notificacao`, `historico_lancamentos`, `push_subscriptions`, `user_roles`.

3. Importar o banco no Supabase próprio
   - Executar o dump no SQL Editor do novo projeto, ou recriar as tabelas via migrations e depois importar os dados.
   - Verificar se RLS, policies, triggers e funções foram copiados corretamente.

4. Reconfigurar a autenticação
   - Ativar os provedores que o app usa: e-mail/senha, Google e Apple.
   - Para Google e Apple, criar as credenciais nos respectivos painéis e colar no Supabase Auth > Providers.
   - Ajustar o URL de redirecionamento (callback) para o novo domínio do app.

5. Preparar o app para o novo backend
   - Atualizar as variáveis de ambiente para apontar para o novo Supabase:
     - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY`
     - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Se o app continuar sendo editado no Lovable, as variáveis precisam ser trocadas no painel do projeto. Se for hospedado na Vercel, colar as variáveis lá.

6. Hospedar o app na Vercel
   - Conectar o repositório Git (GitHub/GitLab) à Vercel.
   - Configurar o comando de build e a pasta de saída conforme o projeto TanStack Start.
   - Inserir as variáveis de ambiente do novo Supabase.
   - Fazer o deploy de teste.

7. Testes finais
   - Criar um novo usuário no app hospedado na Vercel.
   - Fazer login com e-mail e com Google/Apple.
   - Verificar se os dados antigos aparecem para usuários existentes.
   - Testar cadastro de receita, despesa, produto, contrato e lembrete.
   - Confirmar que as notificações/push continuam funcionando (será necessário recriar as chaves VAPID no novo ambiente).

8. DNS e domínio (se quiser manter o endereço atual)
   - O domínio `mente-lucrativa.lovable.app` pertence à Lovable. Para manter o mesmo nome, é preciso ter um domínio próprio e apontar para a Vercel.
   - Caso contrário, o app passa a ficar em `https://<nome>-<id>.vercel.app` ou em um domínio próprio novo.

## O que muda para o usuário final
- O app continua igual visualmente.
- Login e dados passam a ser gerenciados pela sua própria conta Supabase.
- Você passa a ser responsável por manter as credenciais de OAuth (Google/Apple) e as chaves de notificação push.

## Próximo passo
Se você aprovar esse plano, eu começo gerando o passo 2: exportar o banco atual e organizar os arquivos de migration/dados para o novo Supabase.
