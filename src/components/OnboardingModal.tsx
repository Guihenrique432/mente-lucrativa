import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Target, User, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

/**
 * Modal de onboarding: aparece quando o usuário ainda não tem
 * nome no perfil OU não definiu nenhuma meta de lucro.
 * Salva nome em profiles e cria a primeira meta.
 */
export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      setUserId(u.user.id);

      const [{ data: prof }, { data: m }] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", u.user.id).maybeSingle(),
        supabase.from("metas").select("id").limit(1).maybeSingle(),
      ]);
      if (cancelled) return;

      const nomeAtual = (prof?.nome ?? "").trim();
      const hasMeta = !!m?.id;
      const dismissed = typeof window !== "undefined" && localStorage.getItem("onboarding_dismissed") === "1";

      if ((!nomeAtual || !hasMeta) && !dismissed) {
        setNome(nomeAtual);
        setOpen(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFinish() {
    if (!userId) return;
    setSaving(true);
    try {
      const cleanNome = nome.trim();
      const cleanMeta = Number(meta.replace(/\./g, "").replace(",", "."));
      if (cleanNome.length >= 2) {
        await supabase.from("profiles").update({ nome: cleanNome }).eq("id", userId);
      }
      if (!Number.isNaN(cleanMeta) && cleanMeta > 0) {
        await supabase.from("metas").insert({ user_id: userId, meta_lucro: cleanMeta });
      }
      localStorage.setItem("onboarding_dismissed", "1");
      toast.success("Pronto! Bora começar 🚀");
      setOpen(false);
      // recarrega para o dashboard puxar os dados novos
      window.location.reload();
    } catch {
      toast.error("Não deu certo agora. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    localStorage.setItem("onboarding_dismissed", "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 pt-16 animate-in fade-in">
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card animate-in slide-in-from-bottom-6"
        style={{ boxShadow: "var(--shadow-hero)" }}
      >
        <div
          className="relative px-6 pt-6 pb-5 text-primary-foreground"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 backdrop-blur">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Passo {step + 1} de 2
            </span>
          </div>
          <h2 className="mt-3 text-xl font-bold">
            {step === 0 ? "Bem-vindo ao Lucro Real 💙" : "Qual é a sua meta de lucro?"}
          </h2>
          <p className="mt-1 text-xs opacity-85">
            {step === 0
              ? "Vamos configurar rapidinho pra você começar a lucrar mais."
              : "Defina quanto você quer lucrar por mês. Dá pra mudar depois."}
          </p>
        </div>

        <div className="px-6 py-6">
          {step === 0 ? (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Como devemos te chamar?
              </span>
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome ou apelido"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Target className="h-3.5 w-3.5" /> Meta de lucro mensal (R$)
              </span>
              <input
                autoFocus
                inputMode="decimal"
                value={meta}
                onChange={(e) => setMeta(e.target.value.replace(/[^\d,.]/g, ""))}
                placeholder="Ex: 5000"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Sem pressão — você pode pular e definir depois em Metas.
              </p>
            </label>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={handleSkip}
              className="flex-1 rounded-2xl border border-border bg-background py-3 text-sm font-semibold text-muted-foreground transition hover:bg-secondary"
            >
              Pular
            </button>
            {step === 0 ? (
              <button
                onClick={() => setStep(1)}
                disabled={nome.trim().length < 2}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
                style={{ background: "var(--gradient-hero)" }}
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
                style={{ background: "var(--gradient-hero)" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
