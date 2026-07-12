import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/2fa")({
  head: () => ({
    meta: [
      { title: "Verificação em duas etapas — Lucro Real" },
      { name: "description", content: "Digite o código do seu app autenticador." },
    ],
  }),
  ssr: false,
  component: TwoFactorChallengePage,
});

function TwoFactorChallengePage() {
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === "verified");
      if (!verified) {
        navigate({ to: "/", replace: true });
        return;
      }
      setFactorId(verified.id);
      setInitializing(false);
    })();
  }, [navigate]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (error) throw error;
      toast.success("Verificado!");
      navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Código inválido";
      toast.error(msg.includes("Invalid") ? "Código incorreto. Tente novamente." : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (initializing) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="px-6 pt-14 pb-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto flex max-w-md items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide">Verificação em 2 etapas</span>
        </div>
        <h1 className="mx-auto mt-8 max-w-md text-2xl font-bold leading-tight">
          Digite o código do seu app
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-80">
          Abra seu autenticador (Google Authenticator, Authy, 1Password) e digite os 6 dígitos.
        </p>
      </div>

      <div className="-mt-12 px-5 pb-10">
        <div
          className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Código de 6 dígitos
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-accent"
              />
            </label>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-pop)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar e entrar"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancelar e sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
