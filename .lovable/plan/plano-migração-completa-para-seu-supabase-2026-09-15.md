# Plano: migração completa para seu Supabase

## Objetivo
Transferir o aplicativo, os 6 usuários e todos os dados atuais do Lovable Cloud para o projeto Supabase que você já criou, mantendo o vínculo entre cada usuário e seus lançamentos. O acesso no novo ambiente será somente por Google e Apple.

## Situação confirmada
- O banco de origem voltou e está respondendo.
- Existem 6 usuários e dados reais a preservar, incluindo 9 receitas, 17 despesas, 1 lembrete e 2 inscrições de notificação.
- A estrutura atual inclui perfis, receitas, despesas, estoque, contratos, metas, lembretes, auditoria, convites, planos e controles de acesso.
- O pacote existente precisa ser corrigido antes da execução: hoje ele não exporta usuários automaticamente, pode duplicar histórico e saldo de estoque durante a carga, e ainda depende do login social gerenciado pela Lovable.

## Etapas

### 1. Congelar e inventariar a origem
- Gerar um inventário com contagens por tabela, usuários, vínculos e dependências.
- Criar uma janela curta sem novos lançamentos durante a cópia final.
- Manter o banco atual intacto até a validação completa do novo ambiente.

### 2. Corrigir o pacote de estrutura
- Gerar uma estrutura reproduzível a partir das migrations existentes.
- Separar a instalação em: estrutura base, carga de usuários/dados e ajustes posteriores.
- Remover dados fixos do fundador e outros registros de exemplo da instalação inicial.
- Preservar RLS, permissões, funções, políticas, índices e gatilhos.
- Tornar a instalação repetível, com falhas claras e sem comandos específicos do Lovable Cloud.

### 3. Exportar os dados com segurança
- Atualizar o exportador para paginação, manifesto de contagens e arquivos por tabela.
- Exportar todas as tabelas públicas na ordem correta.
- Exportar um manifesto mínimo dos usuários: UUID, e-mail confirmado, telefone e metadados necessários.
- Não exportar senhas; elas não serão usadas no novo fluxo social.
- Não transportar fatores de autenticação em duas etapas; cada usuário precisará configurá-los novamente.

### 4. Preservar usuários com Google e Apple
- Recriar os 6 usuários no destino com os mesmos UUIDs antes da carga dos dados.
- Configurar Google e Apple diretamente no novo Supabase.
- Substituir o login social dependente da Lovable pelo login nativo do novo Supabase.
- No primeiro acesso, vincular a identidade social pelo mesmo e-mail verificado.
- Tratar separadamente contas Apple com endereço privado/oculto, pois esse e-mail pode não coincidir com o cadastro atual.
- Manter o acesso privado por convite para novos usuários.

### 5. Importar sem alterar saldos ou histórico
- Suspender temporariamente os gatilhos que recalculam estoque, plano e histórico durante a carga.
- Importar primeiro usuários e perfis; depois dados financeiros, estoque, contratos, lembretes e auditoria.
- Usar inserções tolerantes a repetição para evitar conflitos de chave.
- Reativar os gatilhos após a carga e executar verificações de integridade.
- Conceder novamente o papel administrativo ao usuário fundador depois que os usuários existirem.

### 6. Migrar configurações operacionais
- Preparar as variáveis do novo Supabase para navegador e servidor sem gravar chaves privadas no código.
- Incluir as chaves VAPID e o remetente usado pelas notificações.
- Recriar o agendamento que chama o lembrete diário.
- Configurar os endereços de retorno de Google e Apple para o novo domínio.
- Atualizar referências ao domínio antigo e preparar o deploy na Vercel.

### 7. Validar antes da troca
- Comparar origem e destino por contagem de linhas e integridade dos UUIDs.
- Confirmar que não há perfis órfãos, histórico duplicado ou estoque alterado.
- Testar login Google e Apple, convite, receitas, despesas, estoque, contratos, metas, Sofia, relatórios e planos.
- Verificar RLS com dois usuários diferentes para impedir leitura cruzada.
- Testar o agendamento e o clique das notificações.
- Solicitar nova autorização de notificações no novo domínio, pois inscrições push antigas não migram entre domínios.

### 8. Corte e retorno seguro
- Fazer uma exportação incremental final após interromper gravações na origem.
- Trocar as variáveis e publicar a Vercel somente após os testes.
- Manter a origem sem alterações por um período de segurança.
- Documentar como voltar temporariamente ao ambiente anterior se a validação falhar.

## Entregáveis
- Estrutura SQL limpa e ordenada.
- Exportador completo dos dados e manifesto de usuários.
- Importador de usuários preservando UUIDs.
- Importador de dados com proteção contra duplicidade e efeitos de gatilhos.
- Script de validação comparando origem e destino.
- Login nativo Google/Apple e configuração para Vercel.
- Guia operacional com execução, testes, corte e retorno.

## Dados necessários para executar no destino
Após a preparação, serão adicionados de forma segura: URL do novo projeto, chave pública e chave administrativa do novo Supabase, além das credenciais próprias de Google e Apple. Nenhuma chave privada será incluída nos arquivos do projeto.
