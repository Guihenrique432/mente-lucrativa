import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Mail, Crown, LogOut, Save, Sparkles, Shield, History, Loader2, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import {
  carregarAssinatura,
  cancelarAssinatura,
  reativarAssinatura,
  diasRestantes,
  formatarData,
  STATUS_INFO,
  type Assinatura,
} from "@/lib/assinatura";



export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Lucro Real" },
      { name: "description", content: "Gerencie seus dados de conta e assinatura." },
      { property: "og:title", content: "Perfil — Lucro Real" },
      { property: "og:description", content: "Gerencie seus dados de conta e assinatura." },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/perfil" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/perfil" }],
  }),
  component: PerfilPage,
});

const PLANOS: Record<string, { nome: string; cor: string }> = {
  gratuito: { nome: "Core", cor: "bg-slate-500" },
  profissional: { nome: "Plus", cor: "bg-blue-600" },
  premium: { nome: "Prime", cor: "bg-amber-500" },
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
  const [userId, setUserId] = useState("");
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [assinaturaBusy, setAssinaturaBusy] = useState(false);

  async function refreshMfa() {
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaEnabled(!!data?.totp?.some((f) => f.status === "verified"));
    setMfaLoading(false);
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserId(userData.user.id);
      setEmail(userData.user.email ?? "");
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", userData.user.id)
        .maybeSingle();
      setNome(prof?.nome ?? "");
      setInitialNome(prof?.nome ?? "");
      const assin = await carregarAssinatura(userData.user.id);
      setAssinatura(assin);
      setPlano(assin?.plano ?? "gratuito");
      setLoading(false);
      refreshMfa();
    }
    load();
  }, []);

  async function handleCancelar() {
    if (!confirm("Cancelar a renovação automática da sua assinatura?")) return;
    setAssinaturaBusy(true);
    try {
      const atualizada = await cancelarAssinatura(userId);
      if (atualizada) {
        setAssinatura(atualizada);
        setPlano(atualizada.plano);
      }
      toast.success("Assinatura cancelada. Você mantém os benefícios até o fim do período.");
    } catch {
      toast.error("Não foi possível cancelar agora.");
    }
    setAssinaturaBusy(false);
  }

  async function handleReativar() {
    setAssinaturaBusy(true);
    try {
      const atualizada = await reativarAssinatura(userId);
      if (atualizada) {
        setAssinatura(atualizada);
        setPlano(atualizada.plano);
      }
      toast.success("Renovação automática reativada!");
    } catch {
      toast.error("Não foi possível reativar agora.");
    }
    setAssinaturaBusy(false);
  }


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

          {assinatura && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_INFO[assinatura.status].classe}`}
                >
                  {STATUS_INFO[assinatura.status].rotulo}
                </span>
                {assinatura.expiraEm && assinatura.status !== "vencido" && (
                  <span className="text-xs text-muted-foreground">
                    {assinatura.status === "cancelado" ? "Válida até" : "Renova em"}{" "}
                    {formatarData(assinatura.expiraEm)}
                    {diasRestantes(assinatura.expiraEm) !== null &&
                      ` (${diasRestantes(assinatura.expiraEm)} dias)`}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {STATUS_INFO[assinatura.status].descricao}
              </p>

              {assinatura.plano !== "gratuito" && assinatura.status === "ativo" && (
                <button
                  onClick={handleCancelar}
                  disabled={assinaturaBusy}
                  className="mt-4 w-full rounded-xl border border-danger/30 bg-danger/5 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-40"
                >
                  Cancelar assinatura
                </button>
              )}

              {assinatura.plano !== "gratuito" && assinatura.status === "cancelado" && (
                <button
                  onClick={handleReativar}
                  disabled={assinaturaBusy}
                  className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  Reativar renovação automática
                </button>
              )}
            </>
          )}

          <Link
            to="/planos"
            className="mt-3 flex items-center justify-center rounded-xl border border-accent/40 bg-accent/5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10"
          >
            {plano === "gratuito" ? "Fazer upgrade" : "Ver planos"}
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

      {showEnroll && (
        <EnrollMfaModal
          onClose={() => setShowEnroll(false)}
          onSuccess={() => {
            setShowEnroll(false);
            refreshMfa();
          }}
        />
      )}

      <BottomNav active="home" />
    </div>
  );
}

function EnrollMfaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"loading" | "scan" | "verifying">("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = existing?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Lucro Real ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollErr || !data) {
        setError(enrollErr?.message ?? "Não foi possível iniciar.");
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("scan");
    })();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setStep("verifying");
    setError("");
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;
      toast.success("2FA ativado com sucesso!");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Código inválido";
      setError(msg.includes("Invalid") ? "Código incorreto. Tente de novo." : msg);
      setStep("scan");
    }
  }

  async function handleCancel() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Segurança</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Ativar 2FA</h2>
          </div>
          <button
            onClick={handleCancel}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "loading" && (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {step !== "loading" && (
          <div className="mt-4 space-y-4">
            <ol className="space-y-1 text-xs text-muted-foreground">
              <li>1. Abra um app autenticador (Google Authenticator, Authy, 1Password).</li>
              <li>2. Escaneie o QR code abaixo ou digite o código manual.</li>
              <li>3. Digite os 6 dígitos que o app mostrar.</li>
            </ol>

            {qr && (
              <div className="flex justify-center rounded-2xl bg-white p-4">
                <img src={qr} alt="QR code para ativar 2FA" className="h-48 w-48" />
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Código manual
              </p>
              <p className="mt-1 select-all break-all rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs">
                {secret}
              </p>
            </div>

            <form onSubmit={handleVerify}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Código do app
                </span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-accent"
                />
              </label>

              {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}

              <button
                type="submit"
                disabled={code.length !== 6 || step === "verifying"}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
                style={{ background: "var(--gradient-hero)" }}
              >
                {step === "verifying" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar e ativar"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
