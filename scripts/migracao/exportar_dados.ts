#!/usr/bin/env bun
console.log("INICIO");
// Script para exportar os dados das tabelas public.* do Supabase atual.
// Uso:
//   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> bun exportar_dados.ts
//
// O script gera:
//   - export/dados/<tabela>.json   -> um JSON por tabela
//   - export/dados_publicos.sql    -> INSERTs prontos para importação
//
// IMPORTANTE: este script NÃO exporta a tabela auth.users.
// Os usuários de autenticação precisam ser recriados no novo Supabase
// (via admin API ou redefinição de senha) para que os dados antigos
// continuem vinculados aos mesmos UUIDs.

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!url || !key) {
  console.error("Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Ordem respeita dependências simples (tabelas pai primeiro).
const tabelas = [
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
  "push_subscriptions",
  "notificacoes_diarias",
  "notificacao_execucoes",
  "invitations",
];

const pastaSaida = join(import.meta.dir, "dados");
await mkdir(pastaSaida, { recursive: true });

let sqlTotal = "-- Dados exportados das tabelas public.*\n";
sqlTotal += "-- Execute este arquivo no SQL Editor do novo Supabase.\n";
sqlTotal += "-- Lembre-se: os usuários auth.users devem existir primeiro.\n\n";

for (const tabela of tabelas) {
  process.stdout.write(`Exportando ${tabela}... `);
  const { data, error } = await supabase.from(tabela).select("*").limit(100000);

  if (error) {
    console.error("ERRO", error.message);
    continue;
  }

  if (!data || data.length === 0) {
    console.log("vazio");
    continue;
  }

  await writeFile(join(pastaSaida, `${tabela}.json`), JSON.stringify(data, null, 2));

  const colunas = Object.keys(data[0]);
  for (const row of data) {
    const valores = colunas.map((col) => formatarValor(row[col]));
    sqlTotal += `INSERT INTO public.${tabela} (${colunas.join(", ")}) VALUES (${valores.join(", ")});\n`;
  }

  console.log(`${data.length} linhas`);
}

await writeFile(join(import.meta.dir, "dados_publicos.sql"), sqlTotal);
console.log("\nExportação concluída. Arquivos em:", pastaSaida);
console.log("SQL gerado:", join(import.meta.dir, "dados_publicos.sql"));

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "NULL";
  if (typeof valor === "boolean") return valor ? "TRUE" : "FALSE";
  if (typeof valor === "number") return String(valor);
  if (Array.isArray(valor)) {
    const itens = valor.map((v) => (typeof v === "number" ? String(v) : `"${String(v).replace(/"/g, '\\"')}"`));
    return "ARRAY[" + itens.join(",") + "]";
  }
  if (typeof valor === "object") return "'" + JSON.stringify(valor).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(valor).replace(/'/g, "''") + "'";
}
