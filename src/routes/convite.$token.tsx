import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { checkInvite } from "@/lib/invites.functions";
import { toast } from "sonner";
import { Sparkles, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite — Lucro Real" },
      { name: "description", content: "Acesse o Lucro Real usando seu convite privado." },
      { property: "og:title", content: "Convite — Lucro Real" },
      { property: "og:description", content: "Acesse o Lucro Real usando seu convite privado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: ConvitePage,
});

type Provider = "google" | "apple";

function ConvitePage() {
  const { token } = Route.useParams();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);

  useEffect(() => {
    let alive = true;
    checkInvite({ data: { token } })
      .then((result) => alive && setValid(result.valid))
      .catch(() => alive && setValid(false))
      .finally(() => alive && setChecking(false));
    return () => { alive = false; };
  }, [token]);

  async function entrar(provider: Provider) {
    setBusy(provider);
    sessionStorage.setItem("lucro-real-convite", token);
    try {
      if (import.meta.env.VITE_AUTH_MODE === "supabase") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        return;
      }
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) window.location.assign("/auth");
    } catch {
      sessionStorage.removeItem("lucro-real-convite");
      toast.error(`Não foi possível continuar com ${provider === "google" ? "Google" : "Apple"}.`);
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-0 px-6 pt-14 pb-24 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Sparkles className="h-4 w-4" /></span><span className="text-sm font-semibold">Lucro Real</span></div>
          <h1 className="mt-8 text-3xl font-bold leading-tight">Acesso por convite</h1>
          <p className="mt-2 text-sm opacity-80">Escolha sua conta Google ou Apple para continuar.</p>
        </div>
      </div>
      <div className="relative z-10 -mt-14 px-5 pb-12">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          {checking ? <div className="flex justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verificando convite...</div> : !valid ? (
            <div className="py-4 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-danger" /><h2 className="mt-4 text-lg font-bold">Este convite não é válido ou já expirou.</h2><Link to="/auth" className="mt-6 inline-flex text-sm font-semibold text-accent">Ir para o login</Link></div>
          ) : (
            <><div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/5 p-3"><ShieldCheck className="h-5 w-5 shrink-0 text-success" /><p className="text-sm font-semibold">Convite válido. Seu acesso será vinculado à conta escolhida.</p></div><div className="mt-5 space-y-2.5">{(["google", "apple"] as Provider[]).map((provider) => <button key={provider} onClick={() => entrar(provider)} disabled={busy !== null} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold disabled:opacity-60">{busy === provider && <Loader2 className="h-4 w-4 animate-spin" />}Continuar com {provider === "google" ? "Google" : "Apple"}</button>)}</div></>
          )}
        </div>
      </div>
    </div>
  );
}