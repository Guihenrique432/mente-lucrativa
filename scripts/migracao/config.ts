export const TABELAS_PUBLICAS = [
  "profiles",
  "perfil_financeiro",
  "user_roles",
  "metas",
  "preferencias_notificacao",
  "lembretes",
  "produtos",
  "receitas",
  "despesas",
  "movimentacoes_estoque",
  "contratos",
  "contratos_recebimentos",
  "historico_lancamentos",
  "notificacoes_diarias",
  "notificacao_execucoes",
  "invitations",
  "push_subscriptions",
] as const;

// Inscrições push pertencem ao domínio antigo e não funcionam depois da mudança.
export const TABELAS_IMPORTAVEIS = TABELAS_PUBLICAS.filter(
  (tabela) => tabela !== "push_subscriptions",
);

export const TAMANHO_PAGINA = 1_000;

export function exigirVariavel(nome: string) {
  const valor = process.env[nome]?.trim();
  if (!valor) throw new Error(`Defina a variável ${nome}.`);
  return valor;
}

export function pastaPadrao() {
  return process.env["MIGRATION_OUTPUT_DIR"]?.trim() || "/mnt/documents/export/lucro-real";
}