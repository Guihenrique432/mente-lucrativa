import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Mail, Crown, LogOut, Save, Sparkles, Shield, History, Loader2, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Lucro Real" },
      { name: "description", content: "Gerencie seus dados de conta e assinatura." },
    ],
  }),
  component: PerfilPage,
});

const PLANOS: Record<string, { nome: string; cor: string }> = {
  gratuito: { nome: "Gratuito", cor: "bg-slate-500" },
  profissional: { nome: "Profissional", cor: "bg-blue-600" },
  premium: { nome: "Premium", cor: "bg-amber-500" },
};

function PerfilPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [plano, setPlano] = useState("gratuito");
  const [initialNome, setInitialNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);

  async function refreshMfa() {
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaEnabled(!!data?.totp?.some((f) => f.status === "verified"));
    setMfaLoading(false);
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setEmail(userData.user.email ?? "");
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome,plano")
        .eq("id", userData.user.id)
        .maybeSingle();
      setNome(prof?.nome ?? "");
      setInitialNome(prof?.nome ?? "");
      setPlano(prof?.plano ?? "gratuito");
      setLoading(false);
      refreshMfa();
    }
    load();
  }, []);

  async function handleDisableMfa() {
    if (!confirm("Desativar a verificação em duas etapas?")) return;
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified");
    if (!verified) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
    if (error) {
      toast.error("Não foi possível desativar.");
      return;
    }
    toast.success("2FA desativado.");
    refreshMfa();
  }


  async function handleSave() {
    if (nome.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim() })
      .eq("id", userData.user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setInitialNome(nome.trim());
    toast.success("Perfil atualizado!");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const planoInfo = PLANOS[plano] ?? PLANOS.gratuito;
  const dirty = nome.trim() !== initialNome && nome.trim().length >= 2;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="px-5 pt-12 pb-16 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-semibold">Meu perfil</p>
          <span className="w-10" />
        </div>

        <div className="mx-auto mt-8 max-w-md text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/15 text-3xl font-bold">
            {(nome || email || "?").slice(0, 1).toUpperCase()}
          </div>
          <p className="mt-3 text-lg font-semibold">{nome || "Sem nome"}</p>
          <p className="text-xs opacity-80">{email}</p>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-md space-y-4 px-4">
        <section
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-sm font-bold text-foreground">Dados da conta</h2>

          <label className="mt-4 block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Nome
            </span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={loading}
              placeholder="Como quer ser chamado(a)?"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> Email
            </span>
            <input
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </section>

        <section
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Plano atual</p>
              <p className="mt-0.5 text-base font-bold text-foreground">{planoInfo.nome}</p>
            </div>
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl text-white ${planoInfo.cor}`}
            >
              <Crown className="h-5 w-5" />
            </span>
          </div>
          <Link
            to="/planos"
            className="mt-4 flex items-center justify-center rounded-xl border border-accent/40 bg-accent/5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10"
          >
            {plano === "gratuito" ? "Fazer upgrade" : "Gerenciar plano"}
          </Link>
        </section>

        <Link
          to="/sofia"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-accent/60"
        >
          <div
            className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Falar com a Sofia</p>
            <p className="text-xs text-muted-foreground">Consultora IA para o seu negócio</p>
          </div>
          <span className="text-xs font-semibold text-accent">→</span>
        </Link>

        <Link
          to="/historico"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-accent/60"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <History className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Histórico de alterações</p>
            <p className="text-xs text-muted-foreground">Tudo que criou, editou ou excluiu</p>
          </div>
          <span className="text-xs font-semibold text-accent">→</span>
        </Link>

        <section
          className="rounded-2xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Verificação em 2 etapas</p>
                <p className="text-xs text-muted-foreground">
                  {mfaLoading ? "Carregando..." : mfaEnabled ? "Ativa" : "Desativada"}
                </p>
              </div>
            </div>
            {!mfaLoading && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  mfaEnabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {mfaEnabled ? "ON" : "OFF"}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Proteja sua conta com um código de 6 dígitos gerado pelo seu app autenticador (Google Authenticator, Authy, 1Password).
          </p>
          {!mfaLoading && (
            mfaEnabled ? (
              <button
                onClick={handleDisableMfa}
                className="mt-4 w-full rounded-xl border border-danger/30 bg-danger/5 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
              >
                Desativar 2FA
              </button>
            ) : (
              <button
                onClick={() => setShowEnroll(true)}
                className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition"
                style={{ background: "var(--gradient-hero)" }}
              >
                Ativar 2FA
              </button>
            )
          )}
        </section>


        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/5 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
