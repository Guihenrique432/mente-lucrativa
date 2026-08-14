import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({ token: z.string().trim().min(20).max(200) });

const signupSchema = z.object({
  token: z.string().trim().min(20).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(200),
  nome: z.string().trim().min(1).max(100),
});

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Throws when the caller is not the founder/admin. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: data === true };
  });

export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("invitations")
      .select("id, token_hint, label, status, created_at, expires_at, used_at, used_by")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os convites.");

    const rows = data ?? [];
    const userIds = rows.map((r) => r.used_by).filter((v): v is string => !!v);
    let emails: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      emails = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email ?? ""]));
    }

    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      hint: r.token_hint,
      label: r.label,
      status:
        r.status === "pending" && r.expires_at && new Date(r.expires_at).getTime() <= now
          ? ("expired" as const)
          : r.status,
      created_at: r.created_at,
      expires_at: r.expires_at,
      used_at: r.used_at,
      used_email: r.used_by ? (emails[r.used_by] ?? null) : null,
    }));
  });

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      label: z.string().trim().max(100).optional(),
      expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const token = randomToken();
    const token_hash = await sha256Hex(token);
    const expires_at = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400000).toISOString()
      : null;

    const { error } = await supabaseAdmin.from("invitations").insert({
      token_hash,
      token_hint: token.slice(-6),
      label: data.label?.trim() || null,
      expires_at,
      created_by: context.userId,
    });
    if (error) throw new Error("Não foi possível criar o convite.");

    return { token };
  });

const ROTATING_MS = 12 * 60 * 60 * 1000;

/**
 * Rotating share link: valid for 12h, multi-use. When the current one ends,
 * it is marked expired and a fresh 12h link is issued automatically.
 */
export const getRotatingInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    const { data: current } = await supabaseAdmin
      .from("invitations")
      .select("id, token_plain, expires_at, uses")
      .eq("kind", "rotating")
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (current?.token_plain) {
      return {
        token: current.token_plain,
        expires_at: current.expires_at,
        uses: current.uses ?? 0,
      };
    }

    // close out anything stale, then issue a fresh 12h link
    await supabaseAdmin
      .from("invitations")
      .update({ status: "expired" })
      .eq("kind", "rotating")
      .eq("status", "pending");

    const token = randomToken();
    const expires_at = new Date(Date.now() + ROTATING_MS).toISOString();
    const { error } = await supabaseAdmin.from("invitations").insert({
      kind: "rotating",
      token_hash: await sha256Hex(token),
      token_hint: token.slice(-6),
      token_plain: token,
      label: "Link de acesso (12h)",
      expires_at,
      created_by: context.userId,
    });
    if (error) throw new Error("Não foi possível gerar o link de acesso.");

    return { token, expires_at, uses: 0 };
  });

export const revokeInvite = createServerFn({ method: "POST" })

  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error("Não foi possível revogar o convite.");
    return { ok: true };
  });

/** Public: says only whether the invite can currently be used. */
export const checkInvite = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token_hash = await sha256Hex(data.token);
    const { data: row } = await supabaseAdmin
      .from("invitations")
      .select("id, status, expires_at")
      .eq("token_hash", token_hash)
      .maybeSingle();

    const valid =
      !!row &&
      row.status === "pending" &&
      (!row.expires_at || new Date(row.expires_at).getTime() > Date.now());
    return { valid };
  });

/** Public: creates the account only when the invite is valid; consumes it atomically. */
export const signupWithInvite = createServerFn({ method: "POST" })
  .inputValidator(signupSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token_hash = await sha256Hex(data.token);
    const nowIso = new Date().toISOString();

    const { data: row } = await supabaseAdmin
      .from("invitations")
      .select("id, status, expires_at")
      .eq("token_hash", token_hash)
      .maybeSingle();

    if (
      !row ||
      row.status !== "pending" ||
      (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())
    ) {
      return { ok: false as const, error: "invalid" as const };
    }

    // Atomic claim — only one request can flip pending -> used.
    const { data: claimed } = await supabaseAdmin
      .from("invitations")
      .update({ status: "used", used_at: nowIso })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id");

    if (!claimed || claimed.length === 0) {
      return { ok: false as const, error: "invalid" as const };
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.nome },
    });

    if (createErr || !created?.user) {
      // release the invite again
      await supabaseAdmin
        .from("invitations")
        .update({ status: "pending", used_at: null })
        .eq("id", row.id);
      const msg = createErr?.message ?? "";
      return {
        ok: false as const,
        error: /already|registered|exists/i.test(msg) ? ("email" as const) : ("failed" as const),
      };
    }

    await supabaseAdmin
      .from("invitations")
      .update({ used_by: created.user.id })
      .eq("id", row.id);

    return { ok: true as const };
  });
