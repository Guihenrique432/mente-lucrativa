# Plano: Histórico de alterações + 2FA no login

## 1. Histórico de alterações dos lançamentos

**O que faz:** cada criação, edição ou exclusão de receita/despesa fica registrada com data, hora, o que mudou (valor antigo → valor novo) e quem alterou. O usuário vê o histórico em uma nova aba **"Histórico"** no menu, com filtros por tipo (receita/despesa), ação (criou/editou/excluiu) e período.

**Backend (migration):**
- Nova tabela `historico_lancamentos` com: `id`, `user_id`, `tabela` (receitas/despesas), `registro_id`, `acao` (insert/update/delete), `dados_antes` (jsonb), `dados_depois` (jsonb), `campos_alterados` (text[]), `created_at`.
- RLS: usuário só vê o próprio histórico. Grants padrão.
- Trigger `AFTER INSERT/UPDATE/DELETE` em `receitas` e `despesas` que grava automaticamente na tabela.
- Função `SECURITY DEFINER` com `search_path` fixo (segue padrão do projeto).

**Frontend:**
- Nova rota `/_authenticated/historico.tsx` com tabela paginada e filtros.
- Item no menu lateral: "Histórico" (ícone de relógio).
- Cada linha mostra: data/hora, tipo, ação (badge colorido), valor, categoria, e um "ver detalhes" que abre modal com o diff antes/depois.

## 2. 2FA no login (TOTP via app autenticador)

**O que faz:** usuário ativa 2FA nas configurações do perfil escaneando um QR code (Google Authenticator, Authy, 1Password, etc.). Depois disso, todo login pede o código de 6 dígitos.

Usa a API nativa de MFA do backend (`supabase.auth.mfa`) — não precisa de serviço externo, é grátis.

**Frontend:**
- Nova seção **"Segurança"** em `/_authenticated/perfil` (ou criar `/configuracoes` se preferir):
  - Botão "Ativar autenticação em dois fatores"
  - Fluxo de ativação: chama `mfa.enroll()` → mostra QR code + código manual → usuário digita 6 dígitos → `mfa.challenge()` + `mfa.verify()` → ativado.
  - Se já ativo: botão "Desativar 2FA" (pede código antes).
  - Mostra códigos de recuperação (backup) após ativar.
- Componente `TwoFactorChallenge`: após login com senha, se `mfa.getAuthenticatorAssuranceLevel()` indicar `aal1` mas houver factor verified, redireciona pra tela pedindo o código de 6 dígitos antes de liberar acesso ao app.
- Ajuste em `/_authenticated/route.tsx` (gate): se AAL insuficiente, redireciona pra `/auth/2fa` em vez de liberar.
- Google OAuth: 2FA da conta Google já protege esse login; o desafio adicional só se aplica ao login por email/senha (padrão Supabase).

## Detalhes técnicos

- **Trigger de histórico:** compara `OLD` e `NEW` campo a campo, monta `campos_alterados` só com o que mudou pra evitar ruído. Ignora `updated_at`.
- **Sem service role:** tudo via RLS + `auth.uid()`. Nada de `supabaseAdmin`.
- **2FA storage:** Supabase gerencia os fatores TOTP nativamente em `auth.mfa_factors`. Nada custom no schema.
- **Sessão:** após verify, a sessão sobe pra `aal2` automaticamente. O gate checa `aal2` quando o usuário tem factor verified.

## Ordem de entrega

1. Migration: tabela `historico_lancamentos` + triggers + RLS + grants.
2. Rota `/historico` + item no menu.
3. Migração/UI de MFA no perfil (enroll/disable).
4. Tela de desafio 2FA após login + ajuste no gate.

## Fora de escopo

- SMS 2FA (custa dinheiro).
- Histórico de produtos/movimentações de estoque (só receitas e despesas nesta entrega — se quiser depois, é trivial estender).
- Rate limit customizado nas tentativas de código (Supabase já limita).
