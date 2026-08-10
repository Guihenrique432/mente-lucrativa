import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkInvite, signupWithInvite } from "@/lib/invites.functions";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, Loader2, ArrowRight, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite — Lucro Real" },
      { name: "description", content: "Crie sua conta no Lucro Real usando seu convite." },
      { property: "og:title", content: "Convite — Lucro Real" },
      { property: "og:description", content: "Crie sua conta no Lucro Real usando seu convite." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: ConvitePage,
});

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    checkInvite({ data: { token } })
      .then((r) => alive && setValid(r.valid))
      .catch(() => alive && setValid(false))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signupWithInvite({
        data: { token, email: email.trim(), password, nome: nome.trim() },
      });
      if (!res.ok) {
        if (res.error === "email") {
          toast.error("Este email já possui conta. Faça login.");
        } else {
          toast.error("Este convite não é válido ou já expirou.");
          setValid(false);
        }
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.success("Conta criada! Faça login para continuar.");
        navigate({ to: "/auth" });
        return;
      }
      toast.success("Conta criada! Bem-vindo 🎉");
      navigate({ to: "/" });
    } catch {
      toast.error("Não foi possível concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="relative z-0 px-6 pt-14 pb-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide">Lucro Real</span>
          </div>
          <h1 className="mt-8 text-3xl font-bold leading-tight">Acesso por convite</h1>
          <p className="mt-2 text-sm opacity-80">
            O Lucro Real é privado. Só quem recebe um convite pode criar conta.
          </p>
        </div>
      </div>

      <div className="relative z-10 -mt-14 px-5 pb-12">
        <div
          className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {checking ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando convite...
            </div>
          ) : !valid ? (
            <div className="py-4 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">
                Este convite não é válido ou já expirou.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Peça um novo convite a quem te indicou.
              </p>
              <Link
                to="/auth"
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-hero)" }}
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/5 p-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <p className="text-sm font-semibold text-foreground">
                  Você foi convidado para acessar nossa plataforma.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <Field
                  label="Seu nome"
                  icon={<Sparkles className="h-4 w-4" />}
                  value={nome}
                  onChange={setNome}
                  placeholder="Como devemos te chamar?"
                  required
                />
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
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-60"
                  style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-pop)" }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Criar minha conta
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-muted-foreground">
                Já tem conta?{" "}
                <Link to="/auth" className="font-semibold text-accent">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
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
