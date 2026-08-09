import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, Crown, Zap } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ativarPlano,
  carregarAssinatura,
  economiaAnual,
  formatarPreco,
  PLANO_PRECOS,
  type Ciclo,
  type PlanoId,
} from "@/lib/assinatura";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Lucro Real" },
      { name: "description", content: "Escolha o plano ideal para o seu negócio." },
      { property: "og:title", content: "Planos — Lucro Real" },
      { property: "og:description", content: "Escolha o plano ideal para o seu negócio." },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/planos" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/planos" }],
  }),
  component: PlanosPage,
});

type PagoId = Exclude<PlanoId, "gratuito">;

const plans: {
  id: PagoId;
  name: string;
  tagline: string;
  icon: typeof Zap;
  color: string;
  features: string[];
  highlight: boolean;
}[] = [
  {
    id: "start",
    name: "Start",
    tagline: "Para quem quer organizar as finanças.",
    icon: Sparkles,
    color: "from-slate-500 to-slate-700",
    features: [
      "Receitas e despesas ilimitadas",
      "Controle de estoque",
      "Dashboard com lucro real",
      "Alertas de estoque baixo",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para quem quer automações, análises e IA financeira.",
    icon: Zap,
    color: "from-blue-500 to-blue-700",
    features: [
      "Tudo do Start",
      "Assistente Sofia com IA",
      "Relatórios completos",
      "Metas mensais avançadas",
      "Suporte prioritário",
    ],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    tagline: "Para empresas, equipes e recursos avançados.",
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    features: [
      "Tudo do Pro",
      "Múltiplas lojas",
      "Relatórios avançados",
      "Exportação em PDF",
      "IA ilimitada",
      "Consultoria mensal",
    ],
    highlight: false,
  },
];

function PlanosPage() {
  const [current, setCurrent] = useState<PlanoId>("gratuito");
  const [ciclo, setCiclo] = useState<Ciclo>("mensal");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      const assin = await carregarAssinatura(data.user.id);
      if (assin) setCurrent(assin.plano);
    })();
  }, []);

  async function handleSelect(plan: (typeof plans)[number]) {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const assin = await ativarPlano(userId, plan.id, ciclo);
      if (assin) setCurrent(assin.plano);
      toast.success(`Assinatura ${plan.name} ${ciclo} ativada (teste)`, {
        description:
          ciclo === "anual"
            ? "Renovação automática anual ativa. Você pode cancelar no seu perfil."
            : "Renovação automática mensal ativa. Você pode cancelar no seu perfil.",
      });
    } catch {
      toast.error("Não foi possível ativar o plano agora.");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="px-5 pt-10 pb-8 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-md">
          <p className="text-xs uppercase tracking-wider opacity-80">Planos</p>
          <h1 className="mt-1 text-2xl font-bold">Escolha o plano ideal</h1>
          <p className="mt-1 text-sm opacity-90">
            Pague por mês ou economize assinando o ano inteiro.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-md space-y-4 px-4">
        <div className="flex rounded-2xl border border-border bg-surface p-1 shadow-sm">
          {(["mensal", "anual"] as Ciclo[]).map((c) => (
            <button
              key={c}
              onClick={() => setCiclo(c)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition ${
                ciclo === c
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
              {c === "anual" && (
                <span className="ml-1.5 text-[10px] font-bold uppercase text-success">
                  -17%
                </span>
              )}
            </button>
          ))}
        </div>

        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === current;
          const precos = PLANO_PRECOS[plan.id];
          const economia = economiaAnual(plan.id);
          return (
            <article
              key={plan.id}
              className={`rounded-2xl border bg-surface p-5 shadow-sm ${
                plan.highlight ? "border-accent ring-2 ring-accent/40" : "border-border"
              }`}
            >
              {plan.highlight && (
                <div className="mb-3 inline-flex rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                  Mais popular
                </div>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white ${plan.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">
                  {formatarPreco(ciclo === "anual" ? precos.anual : precos.mensal)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {ciclo === "anual" ? "ano" : "mês"}
                </span>
              </div>
              {ciclo === "anual" ? (
                <p className="mt-1 text-xs font-medium text-success">
                  Economize {formatarPreco(economia.valor)} por ano ({economia.percentual}% off)
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  ou {formatarPreco(precos.anual)} por ano
                </p>
              )}

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || busy}
                className={`mt-5 w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-60 ${
                  isCurrent
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : plan.highlight
                      ? "text-primary-foreground hover:opacity-90"
                      : "bg-foreground text-background hover:opacity-90"
                }`}
                style={
                  plan.highlight && !isCurrent
                    ? { background: "var(--gradient-hero)" }
                    : undefined
                }
              >
                {isCurrent ? "Plano atual" : `Assinar ${plan.name}`}
              </button>
            </article>
          );
        })}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Checkout em modo de teste. Pagamentos reais serão liberados em breve.
        </p>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
