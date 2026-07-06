import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, KeyRound } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Lucro Real" },
      { name: "description", content: "Recupere o acesso à sua conta no Lucro Real." },
    ],
  }),
  ssr: false,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email enviado! Confira sua caixa de entrada.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível enviar o email.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="relative px-6 pt-14 pb-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-xs opacity-80 hover:opacity-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para entrar
        </Link>
        <div className="mt-8 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide">Recuperar senha</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold leading-tight">Esqueceu sua senha?</h1>
        <p className="mt-2 text-sm opacity-80">
          Sem estresse. Vamos enviar um link para redefinir.
        </p>
      </div>

      <div className="-mt-12 px-5 pb-10">
        <div
          className="rounded-3xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">Confira seu email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos um link para <span className="font-semibold text-foreground">{email}</span>.
                Se não aparecer, veja no spam.
              </p>
              <Link
                to="/auth"
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-hero)" }}
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email da conta</span>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    required
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-60"
                style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-pop)" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
