#!/usr/bin/env bun
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { exigirVariavel, pastaPadrao } from "./config";

const caminho = process.argv[2] || join(pastaPadrao(), "dados_publicos.export.sql");
const conteudo = await readFile(caminho, "utf8");
const db = postgres(exigirVariavel("NOVO_SUPABASE_DB_URL"), {
  max: 1,
  ssl: "require",
  idle_timeout: 10,
  connect_timeout: 20,
});

try {
  await db.unsafe(conteudo);
  console.log("Dados importados sem executar gatilhos de estoque, histórico ou plano.");
} finally {
  await db.end();
}