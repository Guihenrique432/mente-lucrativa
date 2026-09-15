import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { acceptInviteAfterOAuth } from "@/lib/invites.functions";

const APP_URL = (import.meta.env.VITE_APP_URL || "https://mente-lucrativa.lovable.app").replace(/\/$/, "");

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Lucro Real" },
      { name: "description", content: "Acesse sua conta no Lucro Real e veja a saúde do seu negócio." },
      { property: "og:title", content: "Entrar — Lucro Real" },
      { property: "og:description", content: "Acesse sua conta no Lucro Real e veja a saúde do seu negócio." },
      { property: "og:url", content: `${APP_URL}/auth` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${APP_URL}/auth` }],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // If already signed in, bounce to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const token = sessionStorage.getItem("lucro-real-convite");
      if (token) {
        const accepted = await acceptInviteAfterOAuth({ data: { token } });
        if (accepted.ok) sessionStorage.removeItem("lucro-real-convite");
      }
      const { data: profile } = await supabase.from("profiles").select("id").maybeSingle();
      if (profile) {
        navigate({ to: "/" });
      } else {
        await supabase.auth.signOut();
        toast.error("Esta conta ainda não possui um convite válido.");
      }
    });
  }, [navigate]);

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      if (import.meta.env.VITE_AUTH_MODE === "supabase") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        return;
      }
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
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

  async function handleApple() {
    setAppleLoading(true);
    try {
      if (import.meta.env.VITE_AUTH_MODE === "supabase") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: { redirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        return;
      }
      const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
      if (result.error) {
        toast.error("Não foi possível entrar com Apple. Tente novamente.");
        setAppleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch {
      toast.error("Não foi possível entrar com Apple.");
      setAppleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
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
          <h1 className="mt-8 text-3xl font-bold leading-tight">Bem-vindo de volta</h1>
          <p className="mt-2 text-sm opacity-80">
            Entre para acompanhar a saúde do seu negócio.
          </p>

        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 -mt-14 px-5 pb-12">
        <div
          className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >

          {/* Social */}
          <div className="space-y-2.5">
            <button
              onClick={handleGoogle}
              disabled={googleLoading || appleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              Continuar com Google
            </button>

            <button
              onClick={handleApple}
              disabled={appleLoading || googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
            >
              {appleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AppleIcon className="h-5 w-5" />
              )}
              Continuar com Apple
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            O Lucro Real é privado: novas contas só com convite.
          </p>

        </div>

        <p className="mx-auto mt-6 w-full max-w-md px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Ao continuar você concorda com nossos termos de uso e política de privacidade.
        </p>

      </div>
    </div>
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

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
