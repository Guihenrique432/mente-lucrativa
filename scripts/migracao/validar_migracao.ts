#!/usr/bin/env bun
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { exigirVariavel, pastaPadrao, TABELAS_IMPORTAVEIS } from "./config";

type Manifesto = { usuarios: number; tabelas: Record<string, number> };
const manifesto = JSON.parse(
  await readFile(join(pastaPadrao(), "manifesto.json"), "utf8"),
) as Manifesto;
const supabase = createClient(
  exigirVariavel("NOVO_SUPABASE_URL"),
  exigirVariavel("NOVO_SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const falhas: string[] = [];
for (const tabela of TABELAS_IMPORTAVEIS) {
  const { count, error } = await supabase.from(tabela).select("*", { count: "exact", head: true });
  if (error) {
    falhas.push(`${tabela}: ${error.message}`);
    continue;
  }
  const esperado = manifesto.tabelas[tabela] ?? 0;
  const atual = count ?? 0;
  console.log(`${tabela}: origem=${esperado} destino=${atual}`);
  if (atual !== esperado) falhas.push(`${tabela}: esperado ${esperado}, encontrado ${atual}`);
}

let usuarios = 0;
for (let pagina = 1; ; pagina++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 1_000 });
  if (error) throw new Error(error.message);
  usuarios += data.users.length;
  if (data.users.length < 1_000) break;
}
console.log(`auth.users: origem=${manifesto.usuarios} destino=${usuarios}`);
if (usuarios !== manifesto.usuarios) falhas.push(`auth.users: esperado ${manifesto.usuarios}, encontrado ${usuarios}`);

if (falhas.length) {
  console.error("\nValidação reprovada:\n- " + falhas.join("\n- "));
  process.exit(1);
}
console.log("\nValidação de contagens aprovada.");