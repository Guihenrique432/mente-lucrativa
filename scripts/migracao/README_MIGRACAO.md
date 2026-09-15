# Migração completa do Lucro Real

Este pacote transfere os usuários e os dados para um projeto Supabase próprio e publica o aplicativo na Vercel. A origem não é apagada.

## Arquivos

- `schema_completo.sql`: estrutura limpa, sem usuário fundador ou lembrete fixo.
- `exportar_dados.ts`: exporta todas as tabelas em páginas, os 6 usuários e um manifesto.
- `importar_usuarios.ts`: recria usuários no destino preservando UUIDs.
- `importar_dados.ts`: carrega dados com gatilhos suspensos na transação.
- `pos_importacao.sql`: reforça papéis, gatilhos e unicidade dos lembretes.
- `validar_migracao.ts`: compara as contagens do destino com o manifesto.
- `configurar_agendamento.sql.example`: agenda lembretes a cada 5 minutos.
- `inventario_origem.json`: fotografia de referência da origem.

Por padrão, a exportação é gravada em `/mnt/documents/export/lucro-real`. Defina `MIGRATION_OUTPUT_DIR` para usar outra pasta. Nunca versionar essa pasta: ela contém dados pessoais.

## 1. Janela de corte

Avise os usuários para não fazer lançamentos durante a cópia final. Mantenha a origem disponível e sem alterações até concluir todos os testes.

## 2. Criar a estrutura no destino

No editor SQL do projeto novo, execute `schema_completo.sql`. A estrutura não cria usuários, administrador ou dados de exemplo.

## 3. Exportar a origem

Use as credenciais administrativas da origem somente no terminal:

```bash
SUPABASE_URL='...' \
SUPABASE_SERVICE_ROLE_KEY='...' \
bun scripts/migracao/exportar_dados.ts
```

O exportador gera JSON por tabela, `auth_users.json`, `dados_publicos.export.sql` e `manifesto.json`. Senhas, sessões, identidades OAuth e MFA não são copiadas.

## 4. Recriar os usuários

```bash
NOVO_SUPABASE_URL='...' \
NOVO_SUPABASE_SERVICE_ROLE_KEY='...' \
bun scripts/migracao/importar_usuarios.ts
```

Os UUIDs são preservados. O script pode ser executado novamente: usuários existentes são ignorados. Google e Apple criarão a identidade social no primeiro acesso com o mesmo e-mail confirmado. Contas Apple que escondem o e-mail devem ser vinculadas manualmente pelo Perfil.

## 5. Importar os dados

Use a conexão PostgreSQL direta do projeto novo:

```bash
NOVO_SUPABASE_DB_URL='postgresql://...' \
bun scripts/migracao/importar_dados.ts
```

A carga usa uma única transação e `session_replication_role = replica`, impedindo que os gatilhos dupliquem o histórico, alterem estoque ou recalculem planos. Cada `INSERT` usa `ON CONFLICT DO NOTHING`, permitindo repetição segura. `push_subscriptions` não é importada porque pertence ao domínio antigo.

Depois, execute `pos_importacao.sql` no editor SQL do destino.

## 6. Configurar Google e Apple

Ative apenas Google e Apple no Auth do projeto novo. Cadastre como URLs permitidas:

- `https://SEU-DOMINIO/auth`
- `https://SEU-PROJETO.vercel.app/auth`
- `http://localhost:3000/auth` somente para desenvolvimento

No provedor Google e no Apple Developer, use a URL de callback exibida pelo novo Supabase. Não use a URL antiga da Lovable. O aplicativo usa OAuth nativo quando `VITE_AUTH_MODE=supabase`.

## 7. Configurar Vercel

Importe o repositório na Vercel. O `vercel.json` já seleciona a compilação correta. Cadastre todas as variáveis de `.env.example` nos ambientes Production e Preview. Variáveis `VITE_*` são públicas; `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` e `VAPID_PRIVATE_KEY` são somente do servidor.

O endereço final deve ser colocado em `VITE_APP_URL`. Depois de publicar, inclua esse endereço nas URLs permitidas do Auth.

## 8. Recriar lembretes

Gere um `CRON_SECRET` forte, use o mesmo valor na Vercel e em uma cópia privada de `configurar_agendamento.sql.example`, substitua `<URL_DO_APP>` e execute no destino. O agendamento chama o aplicativo a cada 5 minutos; cada usuário mantém seus próprios horários e dias.

As chaves VAPID podem permanecer as mesmas, mas cada usuário precisa autorizar notificações novamente no novo domínio.

## 9. Validar

```bash
NOVO_SUPABASE_URL='...' \
NOVO_SUPABASE_SERVICE_ROLE_KEY='...' \
bun scripts/migracao/validar_migracao.ts
```

Além das contagens, teste com dois usuários diferentes:

1. Login Google e Apple.
2. Receitas, despesas, metas, estoque e contratos.
3. Perfil financeiro, Visão e Sofia.
4. Convites privados e papel de administrador.
5. Relatórios e exportação CSV.
6. Criação, pausa e clique de lembretes.
7. Confirme que um usuário não lê dados do outro.

## 10. Troca e retorno

Quando tudo estiver aprovado, faça uma última exportação durante uma nova janela sem lançamentos, repita importação e validação e publique a Vercel. Se qualquer teste falhar, mantenha o endereço antigo como principal e não grave novos dados no destino até corrigir.
