import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Lucro Real" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase colocou o token no hash quando o usuário clicou no email.
    // O SDK trata isso automaticamente. Aguardamos ter uma sessão de recuperação.
    let unsub: { subscription: { unsubscribe: () => void } } | null = null;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        // aguarda evento
        const sub = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
            setReady(true);
          }
        });
        unsub = sub.data;
        // fallback: se em 2s nada aconteceu, marca inválido
        setTimeout(() => {
          if (!ready) setInvalid(true);
        }, 2500);
      }
    });
    return () => {
      unsub?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Senha atualizada! Você já está logado.");
      setTimeout(() => navigate({ to: "/" }), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível atualizar a senha.";
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
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <KeyRound className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide">Nova senha</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold leading-tight">Defina sua nova senha</h1>
        <p className="mt-2 text-sm opacity-80">
          Escolha uma senha que você lembre — mínimo 6 caracteres.
        </p>
      </div>

      <div className="-mt-12 px-5 pb-10">
        <div
          className="rounded-3xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {done ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-semibold text-foreground">Tudo certo!</p>
              <p className="mt-1 text-sm text-muted-foreground">Redirecionando...</p>
            </div>
          ) : invalid && !ready ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Link inválido ou expirado. Solicite um novo link de recuperação.
              </p>
              <button
                onClick={() => navigate({ to: "/forgot-password" })}
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-hero)" }}
              >
                Pedir novo link
              </button>
            </div>
          ) : !ready ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando link...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <PasswordField label="Nova senha" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
              <PasswordField label="Confirmar senha" value={confirm} onChange={setConfirm} placeholder="Repita a senha" />
              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-60"
                style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-pop)" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          minLength={6}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
    </label>
  );
}
