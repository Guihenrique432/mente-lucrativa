#!/usr/bin/env bun
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { exigirVariavel, pastaPadrao, TAMANHO_PAGINA, TABELAS_PUBLICAS } from "./config";

const supabase = createClient(
  exigirVariavel("SUPABASE_URL"),
  exigirVariavel("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const pasta = pastaPadrao();
const pastaDados = join(pasta, "dados");
await mkdir(pastaDados, { recursive: true });

const contagens: Record<string, number> = {};
let sql = [
  "-- Carga pública do Lucro Real.",
  "-- Execute depois de criar os usuários com importar_usuarios.ts.",
  "BEGIN;",
  "SET LOCAL session_replication_role = replica;",
  "",
].join("\n");

for (const tabela of TABELAS_PUBLICAS) {
  const linhas: Record<string, unknown>[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Falha ao exportar ${tabela}: ${error.message}`);
    linhas.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < TAMANHO_PAGINA) break;
  }

  contagens[tabela] = linhas.length;
  await writeFile(join(pastaDados, `${tabela}.json`), JSON.stringify(linhas, null, 2));
  if (tabela !== "push_subscriptions" && linhas.length > 0) {
    sql += criarInsert(tabela, linhas);
  }
  console.log(`${tabela}: ${linhas.length}`);
}

const usuarios: Record<string, unknown>[] = [];
for (let pagina = 1; ; pagina++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1_000 });
  if (error) throw new Error(`Falha ao listar usuários: ${error.message}`);
  usuarios.push(
    ...data.users.map((usuario) => ({
      id: usuario.id,
      email: usuario.email ?? null,
      email_confirmed_at: usuario.email_confirmed_at ?? null,
      phone: usuario.phone ?? null,
      user_metadata: usuario.user_metadata ?? {},
      providers: usuario.app_metadata?.providers ?? [],
      created_at: usuario.created_at,
    })),
  );
  if (data.users.length < 1_000) break;
}

await writeFile(join(pastaDados, "auth_users.json"), JSON.stringify(usuarios, null, 2));
sql += "\nSET LOCAL session_replication_role = origin;\nCOMMIT;\n";
await writeFile(join(pasta, "dados_publicos.export.sql"), sql);
await writeFile(
  join(pasta, "manifesto.json"),
  JSON.stringify(
    {
      versao: 2,
      exportado_em: new Date().toISOString(),
      usuarios: usuarios.length,
      tabelas: contagens,
      observacoes: [
        "Senhas, fatores MFA e tokens OAuth não são exportados.",
        "push_subscriptions foi preservada para auditoria, mas não deve ser importada.",
      ],
    },
    null,
    2,
  ),
);
console.log(`Exportação concluída em ${pasta}`);

function criarInsert(tabela: string, linhas: Record<string, unknown>[]) {
  const json = JSON.stringify(linhas).replaceAll("'", "''");
  const nome = identificador(tabela);
  return `INSERT INTO public.${nome} SELECT * FROM jsonb_populate_recordset(NULL::public.${nome}, '${json}'::jsonb) ON CONFLICT DO NOTHING;\n`;
}

function identificador(valor: string) {
  return `"${valor.replaceAll('"', '""')}"`;
}
