#!/usr/bin/env bun
// Recria os usuários de autenticação no novo Supabase a partir de um JSON.
// Uso:
//   NOVO_SUPABASE_URL=<url> NOVO_SUPABASE_SERVICE_ROLE_KEY=<key> bun importar_usuarios.ts
//
// O JSON de entrada deve ter sido gerado previamente a partir de auth.users,
// por exemplo com uma migration temporária no banco antigo:
//   CREATE TABLE public.migration_auth_users AS
//   SELECT id, email, email_confirmed_at, phone, raw_user_meta_data
//   FROM auth.users;
//
// Depois de rodar este script, os usuários poderão fazer login usando
// "Esqueci a senha" no novo app, pois as senhas não são migráveis.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const url = process.env["NOVO_SUPABASE_URL"];
const key = process.env["NOVO_SUPABASE_SERVICE_ROLE_KEY"];

if (!url || !key) {
  console.error("Erro: defina NOVO_SUPABASE_URL e NOVO_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const caminho = process.argv[2] || join(import.meta.dir, "dados", "migration_auth_users.json");
const raw = await readFile(caminho, "utf8");
const usuarios = JSON.parse(raw) as Array<Record<string, unknown>>;

for (const u of usuarios) {
  const { data, error } = await supabase.auth.admin.createUser({
    id: u.id as string,
    email: u.email as string,
    email_confirm: Boolean(u.email_confirmed_at),
    phone: (u.phone as string) || undefined,
    user_metadata: (u.raw_user_meta_data as object) || {},
    app_metadata: { provider: "email", providers: ["email"] },
  });

  if (error) {
    console.error("Falha ao criar", u.email, ":", error.message);
  } else {
    console.log("Criado:", data.user?.email || u.email);
  }
}

console.log("\nImportação de usuários finalizada.");
console.log("Avise os usuários para redefinir a senha no primeiro acesso.");
