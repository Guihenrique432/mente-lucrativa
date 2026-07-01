import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Crown, Zap } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Lucro Real" },
      { name: "description", content: "Escolha o plano ideal para o seu negócio." },
    ],
  }),
  component: PlanosPage,
});

type PlanId = "gratuito" | "profissional" | "premium";

const plans = [
  {
    id: "gratuito" as PlanId,
    name: "Gratuito",
    price: "R$ 0",
    period: "para sempre",
    tagline: "Para começar a organizar seu negócio",
    icon: Sparkles,
    color: "from-slate-500 to-slate-700",
    features: [
      "Até 20 produtos no estoque",
      "Fluxo de caixa básico",
      "Dashboard com lucro real",
      "Alertas de estoque baixo",
    ],
    cta: "Plano atual",
    highlight: false,
  },
  {
    id: "profissional" as PlanId,
    name: "Profissional",
    price: "R$ 29,90",
    period: "por mês",
    tagline: "Para quem quer crescer com inteligência",
    icon: Zap,
    color: "from-blue-500 to-blue-700",
    features: [
      "Produtos ilimitados",
      "Assistente Sofia com IA",
      "Relatórios completos",
      "Metas mensais avançadas",
      "Suporte prioritário",
    ],
    cta: "Assinar Profissional",
    highlight: true,
  },
  {
    id: "premium" as PlanId,
    name: "Premium",
    price: "R$ 59,90",
    period: "por mês",
    tagline: "Para múltiplas lojas e análises avançadas",
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    features: [
      "Tudo do Profissional",
      "Múltiplas lojas",
      "Relatórios avançados",
      "Exportação em PDF",
      "IA ilimitada",
      "Consultoria mensal",
    ],
    cta: "Assinar Premium",
    highlight: false,
  },
];

function PlanosPage() {
  const [current] = useState<PlanId>("gratuito");

  function handleSelect(plan: (typeof plans)[number]) {
    if (plan.id === "gratuito") {
      toast.info("Você já está no plano Gratuito.");
      return;
    }
    toast.success(`Checkout em teste — ${plan.name}`, {
      description: "Em breve o pagamento real será habilitado.",
    });
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
            Comece grátis e evolua quando o seu negócio crescer.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-md space-y-4 px-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === current;
          return (
            <article
              key={plan.id}
              className={`rounded-2xl border bg-surface p-5 shadow-sm ${
                plan.highlight
                  ? "border-accent ring-2 ring-accent/40"
                  : "border-border"
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
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/ {plan.period}</span>
              </div>

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
                disabled={isCurrent}
                className={`mt-5 w-full rounded-xl py-3 text-sm font-semibold transition ${
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
                {isCurrent ? "Plano atual" : plan.cta}
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
