import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  amIAdmin,
  listInvites,
  createInvite,
  revokeInvite,
  getRotatingInvite,
} from "@/lib/invites.functions";
import { BottomNav } from "@/components/BottomNav";
import {
  ArrowLeft,
  Copy,
  Loader2,
  Plus,
  ShieldAlert,
  Ticket,
  X,
  Link2,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do fundador — Lucro Real" },
      { name: "description", content: "Gerencie convites de acesso ao Lucro Real." },
      { property: "og:title", content: "Painel do fundador — Lucro Real" },
      { property: "og:description", content: "Gerencie convites de acesso ao Lucro Real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Invite = Awaited<ReturnType<typeof listInvites>>[number];

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "Disponível", cls: "bg-success/15 text-success" },
  used: { text: "Utilizado", cls: "bg-accent/15 text-accent" },
  expired: { text: "Expirado", cls: "bg-muted text-muted-foreground" },
  revoked: { text: "Revogado", cls: "bg-danger/15 text-danger" },
};

function restante(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dias, setDias] = useState<string>("30");
  const [novoLink, setNovoLink] = useState<string | null>(null);
  const [rot, setRot] = useState<{ link: string; expiraEm: number } | null>(null);
  const [rotLoading, setRotLoading] = useState(true);
  const [agora, setAgora] = useState(() => Date.now());

  const carregarRotativo = useCallback(async () => {
    setRotLoading(true);
    try {
      const r = await getRotatingInvite();
      setRot({
        link: `${window.location.origin}/convite/${r.token}`,
        expiraEm: r.expires_at ? new Date(r.expires_at).getTime() : Date.now(),
      });
    } catch {
      setRot(null);
    } finally {
      setRotLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listInvites();
      setInvites(rows);
    } catch {
      toast.error("Não foi possível carregar os convites.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    amIAdmin()
      .then((r) => {
        setAllowed(r.admin);
        if (r.admin) {
          load();
          carregarRotativo();
        }
        else setLoading(false);
      })
      .catch(() => {
        setAllowed(false);
        setLoading(false);
      });
  }, [load, carregarRotativo]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (rot && agora >= rot.expiraEm && !rotLoading) {
      carregarRotativo();
    }
  }, [agora, rot, rotLoading, carregarRotativo]);

  async function handleCreate() {
    setCreating(true);
    try {
      const n = Number(dias);
      const { token } = await createInvite({
        data: { expiresInDays: Number.isFinite(n) && n > 0 ? Math.min(365, Math.round(n)) : null },
      });
      const link = `${window.location.origin}/convite/${token}`;
      setNovoLink(link);
      try {
        await navigator.clipboard.writeText(link);
        toast.success("Convite criado e link copiado!");
      } catch {
        toast.success("Convite criado!");
      }
      load();
    } catch {
      toast.error("Não foi possível criar o convite.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeInvite({ data: { id } });
      toast.success("Convite revogado.");
      load();
    } catch {
      toast.error("Não foi possível revogar.");
    }
  }

  if (allowed === false) {
    return (
      <div className="min-h-screen bg-background px-5 pt-20">
        <div
          className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é exclusiva do fundador.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-accent">
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div
        className="relative z-0 px-5 pt-12 pb-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link to="/perfil" className="inline-flex items-center gap-1.5 text-xs opacity-80">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="mt-6 text-2xl font-bold leading-tight">Painel do fundador</h1>
        <p className="mt-1.5 text-sm opacity-80">
          Convide pessoas e controle quem entra no app.
        </p>
      </div>

      <main className="relative z-10 -mt-12 space-y-4 px-5">
        <section
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent" />
            <p className="text-sm font-bold text-foreground">Link de acesso (12 horas)</p>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Compartilhe este link: ele libera a entrada no app e vale 12 horas. Quando o prazo
            acaba, um link novo é gerado automaticamente, também com 12 horas.
          </p>

          {rotLoading && !rot ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando link...
            </div>
          ) : rot ? (
            <>
              <div className="mt-3 rounded-2xl border border-accent/25 bg-accent/5 p-3">
                <p className="break-all text-xs text-foreground">{rot.link}</p>
                <p className="mt-2 text-[11px] font-semibold text-accent">
                  Expira em {restante(rot.expiraEm - agora)}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(rot.link);
                    toast.success("Link copiado!");
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  <Copy className="h-4 w-4" /> Copiar link
                </button>
                <button
                  onClick={carregarRotativo}
                  disabled={rotLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${rotLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={carregarRotativo}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </button>
          )}
        </section>

        <section
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm font-bold text-foreground">Novo convite</p>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Validade (dias) — deixe vazio para não expirar
            </span>
            <input
              value={dias}
              onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="30"
              className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </label>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-hero)" }}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Gerar convite
          </button>

          {novoLink && (
            <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                Link do convite (só aparece agora)
              </p>
              <p className="mt-1 break-all text-xs text-foreground">{novoLink}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(novoLink);
                  toast.success("Link copiado!");
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </button>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-accent" />
            <p className="text-sm font-bold text-foreground">Convites</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : invites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum convite criado ainda.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {invites.map((inv) => {
                const s = STATUS_LABEL[inv.status] ?? STATUS_LABEL["pending"]!;
                return (
                  <li key={inv.id} className="rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm text-foreground">••••••{inv.hint}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.cls}`}
                      >
                        {s.text}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                      <span>Criado: {fmt(inv.created_at)}</span>
                      <span>Expira: {fmt(inv.expires_at)}</span>
                      <span>Usado em: {fmt(inv.used_at)}</span>
                      <span className="truncate">Usuário: {inv.used_email ?? "—"}</span>
                    </div>
                    {inv.status === "pending" && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-semibold text-danger"
                      >
                        <X className="h-3.5 w-3.5" /> Revogar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
