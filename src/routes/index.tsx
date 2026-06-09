import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Target,
  Package,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Wallet,
  Receipt,
  PiggyBank,
  Home,
  BarChart3,
  Plus,
  Boxes,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lucro Real — Controle financeiro para autônomos e lojistas" },
      {
        name: "description",
        content:
          "Entenda seu lucro real, controle estoque e metas em um app simples feito para quem empreende no Brasil.",
      },
      { property: "og:title", content: "Lucro Real" },
      {
        property: "og:description",
        content: "O app que mostra a saúde do seu negócio em segundos.",
      },
    ],
  }),
  component: Dashboard,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function Dashboard() {
  // Mock data — Fase 1: visual only
  const faturamento = 28450;
  const despesas = 16230;
  const lucro = faturamento - despesas;
  const meta = 15000;
  const estoque = 12;
  const progressoMeta = Math.min(100, Math.round((lucro / meta) * 100));

  // Health: green if margem >= 25%, yellow >= 10%, red <
  const margem = (lucro / faturamento) * 100;
  const health =
    margem >= 25 ? "saudavel" : margem >= 10 ? "atencao" : "risco";

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Hero header */}
      <header
        className="relative px-5 pt-12 pb-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs/none uppercase tracking-widest opacity-70">
              Bem-vindo
            </p>
            <h1 className="mt-1 text-2xl font-bold">Olá, Marina 👋</h1>
          </div>
          <button
            aria-label="Notificações"
            className="relative grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning" />
          </button>
        </div>

        <div className="mt-7">
          <p className="text-sm opacity-80">Lucro deste mês</p>
          <div className="mt-1 flex items-end gap-3">
            <span className="text-4xl font-bold tracking-tight">
              {BRL(lucro)}
            </span>
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success">
              <TrendingUp className="h-3 w-3" />
              +8,4%
            </span>
          </div>
          <p className="mt-1 text-xs opacity-70">
            comparado ao mês anterior
          </p>
        </div>
      </header>

      {/* Health card — overlaps hero */}
      <section className="-mt-16 px-5">
        <HealthCard status={health} margem={margem} />
      </section>

      {/* KPI grid */}
      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label="Faturamento"
            value={BRL(faturamento)}
            tone="accent"
          />
          <KpiCard
            icon={<Receipt className="h-4 w-4" />}
            label="Despesas"
            value={BRL(despesas)}
            tone="danger"
          />
          <KpiCard
            icon={<Target className="h-4 w-4" />}
            label="Meta do mês"
            value={`${progressoMeta}%`}
            sub={BRL(meta)}
            tone="success"
          />
          <KpiCard
            icon={<Package className="h-4 w-4" />}
            label="Estoque"
            value={`${estoque} itens`}
            sub="R$ 4.820"
            tone="neutral"
          />
        </div>
      </section>

      {/* Meta progress */}
      <section className="mt-5 px-5">
        <div
          className="rounded-3xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Meta do mês
              </p>
              <p className="mt-0.5 text-base font-semibold">
                {BRL(lucro)} de {BRL(meta)}
              </p>
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              {progressoMeta}%
            </span>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressoMeta}%`,
                background: "var(--gradient-success)",
              }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Faltam <span className="font-semibold text-foreground">{BRL(Math.max(0, meta - lucro))}</span> para bater a meta.
            Você está no ritmo de <span className="font-semibold text-success">R$ 510/dia</span>.
          </p>
        </div>
      </section>

      {/* Radar do Negócio */}
      <section className="mt-6 px-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 place-items-center rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-bold">Radar do Negócio</h2>
          </div>
          <button className="text-xs font-medium text-accent">Ver tudo</button>
        </div>

        <div className="space-y-3">
          <RadarItem
            tone="danger"
            icon={<TrendingDown className="h-4 w-4" />}
            title="Seu lucro caiu 12% esta semana"
            description="Aumento de R$ 1.240 em despesas com fornecedor."
            cta="Ver detalhes"
          />
          <RadarItem
            tone="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Camiseta Básica acaba em 5 dias"
            description="Saída média de 3 unidades/dia. Reposição sugerida: 20 un."
            cta="Repor estoque"
          />
          <RadarItem
            tone="success"
            icon={<Target className="h-4 w-4" />}
            title="Você está perto da meta mensal"
            description="Faltam apenas R$ 2.780 para bater os R$ 15.000."
            cta="Ver meta"
          />
          <RadarItem
            tone="neutral"
            icon={<PiggyBank className="h-4 w-4" />}
            title="Aluguel representa 18% do faturamento"
            description="Dentro da faixa saudável (até 25%). Continue assim."
          />
        </div>
      </section>

      {/* Assistente */}
      <section className="mt-6 px-5">
        <div
          className="overflow-hidden rounded-3xl p-5 text-primary-foreground"
          style={{
            background: "var(--gradient-hero)",
            boxShadow: "var(--shadow-hero)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                Assistente Lucro Real
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                Seu maior gasto este mês foi <strong>estoque (38%)</strong>.
                Reajustar o preço de 2 produtos pode aumentar seu lucro em
                cerca de <strong>R$ 480</strong>.
              </p>
              <button className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-primary">
                Ver sugestão
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2.5">
          <NavTab icon={<Home className="h-5 w-5" />} label="Início" active />
          <NavTab icon={<Receipt className="h-5 w-5" />} label="Movimentos" />
          <FabButton />
          <NavTab icon={<Boxes className="h-5 w-5" />} label="Estoque" />
          <NavTab icon={<BarChart3 className="h-5 w-5" />} label="Relatórios" />
        </div>
      </nav>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function HealthCard({
  status,
  margem,
}: {
  status: "saudavel" | "atencao" | "risco";
  margem: number;
}) {
  const map = {
    saudavel: {
      label: "Saudável",
      desc: "Seu negócio vai bem. Continue acompanhando.",
      color: "var(--color-success)",
      bg: "color-mix(in oklab, var(--color-success) 14%, white)",
    },
    atencao: {
      label: "Atenção",
      desc: "Alguns indicadores merecem cuidado.",
      color: "var(--color-warning)",
      bg: "color-mix(in oklab, var(--color-warning) 18%, white)",
    },
    risco: {
      label: "Em risco",
      desc: "Seu lucro está apertado. Veja o que ajustar.",
      color: "var(--color-danger)",
      bg: "color-mix(in oklab, var(--color-danger) 14%, white)",
    },
  }[status];

  return (
    <div
      className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl"
        style={{ background: map.bg }}
      >
        <span
          className="h-3 w-3 rounded-full"
          style={{
            background: map.color,
            boxShadow: `0 0 0 6px color-mix(in oklab, ${map.color} 22%, transparent)`,
          }}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Saúde do negócio
          </p>
        </div>
        <p className="mt-0.5 text-lg font-bold" style={{ color: map.color }}>
          {map.label}
        </p>
        <p className="text-xs text-muted-foreground">{map.desc}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Margem
        </p>
        <p className="text-lg font-bold">{margem.toFixed(0)}%</p>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "accent" | "danger" | "success" | "neutral";
}) {
  const toneMap = {
    accent: { bg: "bg-accent/10", text: "text-accent" },
    danger: { bg: "bg-danger/10", text: "text-danger" },
    success: { bg: "bg-success/15", text: "text-success" },
    neutral: { bg: "bg-secondary", text: "text-foreground" },
  }[tone];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className={`grid h-8 w-8 place-items-center rounded-lg ${toneMap.bg} ${toneMap.text}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tracking-tight">{value}</p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function RadarItem({
  tone,
  icon,
  title,
  description,
  cta,
}: {
  tone: "danger" | "warning" | "success" | "neutral";
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: string;
}) {
  const map = {
    danger: { bg: "bg-danger/10", text: "text-danger", dot: "var(--color-danger)" },
    warning: { bg: "bg-warning/20", text: "text-warning-foreground", dot: "var(--color-warning)" },
    success: { bg: "bg-success/15", text: "text-success", dot: "var(--color-success)" },
    neutral: { bg: "bg-accent/10", text: "text-accent", dot: "var(--color-accent)" },
  }[tone];

  return (
    <article
      className="flex gap-3 rounded-2xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${map.bg} ${map.text}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold leading-snug">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        {cta && (
          <button className={`mt-2 text-xs font-semibold ${map.text}`}>
            {cta} →
          </button>
        )}
      </div>
    </article>
  );
}

function NavTab({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition ${
        active ? "text-accent" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function FabButton() {
  return (
    <button
      aria-label="Novo lançamento"
      className="-mt-7 grid h-14 w-14 place-items-center rounded-full text-primary-foreground"
      style={{
        background: "var(--gradient-hero)",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
