#!/usr/bin/env bun
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { exigirVariavel, pastaPadrao } from "./config";

type UsuarioExportado = {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  user_metadata: Record<string, unknown>;
};

const supabase = createClient(
  exigirVariavel("NOVO_SUPABASE_URL"),
  exigirVariavel("NOVO_SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const caminho = process.argv[2] || join(pastaPadrao(), "dados", "auth_users.json");
const usuarios = JSON.parse(await readFile(caminho, "utf8")) as UsuarioExportado[];
let criados = 0;
let existentes = 0;

for (const usuario of usuarios) {
  if (!usuario.id || !usuario.email) {
    console.warn(`Ignorado usuário sem UUID/e-mail: ${usuario.id || "sem UUID"}`);
    continue;
  }
  const { error } = await supabase.auth.admin.createUser({
    id: usuario.id,
    email: usuario.email,
    email_confirm: Boolean(usuario.email_confirmed_at),
    phone: usuario.phone || undefined,
    user_metadata: usuario.user_metadata || {},
  });
  if (!error) {
    criados++;
    console.log(`Criado: ${usuario.email}`);
    continue;
  }
  if (/already|registered|exists/i.test(error.message)) {
    existentes++;
    console.log(`Já existente: ${usuario.email}`);
    continue;
  }
  throw new Error(`Falha ao criar ${usuario.email}: ${error.message}`);
}

console.log(`Usuários concluídos: ${criados} criados, ${existentes} já existentes.`);
console.log("No primeiro acesso, cada pessoa deve usar Google ou Apple com o mesmo e-mail confirmado.");