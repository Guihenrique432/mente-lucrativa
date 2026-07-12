import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Lucro Real" },
      { name: "description", content: "Acesse sua conta no Lucro Real e veja a saúde do seu negócio." },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If already signed in, bounce to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: nome },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada! Vamos começar 🎉");
          navigate({ to: "/" });
        } else {
          toast.success("Conta criada! Você já pode entrar.");
          setMode("signin");
        }
      } else {

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
          navigate({ to: "/auth/2fa" });
        } else {
          toast.success("Bem-vindo de volta!");
          navigate({ to: "/" });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Algo deu errado";
      const friendly =
        msg.includes("Invalid login") ? "Email ou senha incorretos"
        : msg.includes("already registered") ? "Este email já tem conta. Faça login."
        : msg.includes("Password should") ? "A senha precisa ter pelo menos 6 caracteres"
        : msg;
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Não foi possível entrar com Google. Tente novamente.");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return; // browser redirects
      navigate({ to: "/" });
    } catch {
      toast.error("Não foi possível entrar com Google.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative px-6 pt-14 pb-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-wide">Lucro Real</span>
        </div>
        <h1 className="mt-8 text-3xl font-bold leading-tight">
          {mode === "signin" ? "Bem-vindo de volta 👋" : "Comece grátis hoje"}
        </h1>
        <p className="mt-2 text-sm opacity-80">
          {mode === "signin"
            ? "Entre para acompanhar a saúde do seu negócio."
            : "Crie sua conta em segundos. Sem cartão de crédito."}
        </p>
      </div>

      {/* Card */}
      <div className="-mt-12 px-5 pb-10">
        <div
          className="rounded-3xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              ou
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field
                label="Seu nome"
                icon={<Sparkles className="h-4 w-4" />}
                value={nome}
                onChange={setNome}
                placeholder="Como devemos te chamar?"
                required
              />
            )}
            <Field
              label="Email"
              icon={<Mail className="h-4 w-4" />}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="voce@email.com"
              required
            />
            <Field
              label="Senha"
              icon={<Lock className="h-4 w-4" />}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
            {mode === "signin" && (
              <div className="flex justify-end -mt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            )}


            <button
              type="submit"
              disabled={loading || googleLoading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-60"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-pop)" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Entrar" : "Criar conta"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-accent"
            >
              {mode === "signin" ? "Criar agora" : "Entrar"}
            </button>
          </p>
        </div>

        <p className="mt-6 px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Ao continuar você concorda com nossos termos de uso e política de privacidade.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <span className="text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
    </label>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.47a5.52 5.52 0 01-2.4 3.62v3h3.88c2.27-2.09 3.54-5.18 3.54-8.86z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A11.99 11.99 0 0012 24z"/>
      <path fill="#FBBC05" d="M5.29 14.29A7.21 7.21 0 014.91 12c0-.79.14-1.56.38-2.29V6.62H1.28A12 12 0 000 12c0 1.94.46 3.77 1.28 5.38l4.01-3.09z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.81l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 001.28 6.62l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75z"/>
    </svg>
  );
}
