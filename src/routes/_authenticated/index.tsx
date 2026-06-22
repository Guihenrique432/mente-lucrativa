import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
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
  LogOut,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Lucro Real — Controle financeiro para autônomos e lojistas" },
      {
        name: "description",
        content:
          "Entenda seu lucro real, controle estoque e metas em um app simples feito para quem empreende no Brasil.",
      },
    ],
  }),
  component: Dashboard,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

type Receita = { valor: number; data: string; categoria: string };
type Despesa = { valor: number; data: string; categoria: string };
type Produto = { id?: string; nome: string; quantidade: number; custo: number; preco_venda: number };
type MovSaida = { produto_id: string; quantidade: number };

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), daysInMonth: end.getDate(), today: d.getDate() };
}

function prevMonthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const end = new Date(d.getFullYear(), d.getMonth(), 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function Dashboard() {
  const navigate = useNavigate();
  const [nome, setNome] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [receitasPrev, setReceitasPrev] = useState<Receita[]>([]);
  const [despesasPrev, setDespesasPrev] = useState<Despesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [saidasMes, setSaidasMes] = useState<MovSaida[]>([]);
  const [meta, setMeta] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const m = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      const first =
        (m?.full_name || m?.name || data.user?.email?.split("@")[0] || "").split(" ")[0];
      setNome(first ? first.charAt(0).toUpperCase() + first.slice(1) : "");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cur = monthRange();
      const prev = prevMonthRange();
      const [r, d, rp, dp, p, m, mov] = await Promise.all([
        supabase.from("receitas").select("valor,data,categoria").gte("data", cur.start).lte("data", cur.end),
        supabase.from("despesas").select("valor,data,categoria").gte("data", cur.start).lte("data", cur.end),
        supabase.from("receitas").select("valor,data,categoria").gte("data", prev.start).lte("data", prev.end),
        supabase.from("despesas").select("valor,data,categoria").gte("data", prev.start).lte("data", prev.end),
        supabase.from("produtos").select("id,nome,quantidade,custo,preco_venda"),
        supabase.from("metas").select("meta_lucro").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("movimentacoes_estoque").select("produto_id,quantidade,tipo,data").eq("tipo", "saida").gte("data", cur.start).lte("data", cur.end + "T23:59:59"),
      ]);
      if (cancelled) return;
      setReceitas((r.data as Receita[]) ?? []);
      setDespesas((d.data as Despesa[]) ?? []);
      setReceitasPrev((rp.data as Receita[]) ?? []);
      setDespesasPrev((dp.data as Despesa[]) ?? []);
      setProdutos((p.data as Produto[]) ?? []);
      setSaidasMes(((mov.data as MovSaida[]) ?? []));
      setMeta(Number(m.data?.meta_lucro ?? 0));
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const stats = useMemo(() => {
    const sum = (xs: { valor: number }[]) => xs.reduce((a, b) => a + Number(b.valor || 0), 0);
    const faturamento = sum(receitas);
    const desp = sum(despesas);
    const lucro = faturamento - desp;
    const fatPrev = sum(receitasPrev);
    const lucroPrev = fatPrev - sum(despesasPrev);
    const variacaoLucro = lucroPrev > 0 ? ((lucro - lucroPrev) / lucroPrev) * 100 : lucro > 0 ? 100 : 0;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    const progressoMeta = meta > 0 ? Math.min(100, Math.round((lucro / meta) * 100)) : 0;
    const health: "saudavel" | "atencao" | "risco" =
      faturamento === 0 ? "atencao" : margem >= 25 ? "saudavel" : margem >= 10 ? "atencao" : "risco";

    const estoqueQtd = produtos.reduce((a, b) => a + (b.quantidade || 0), 0);
    const estoqueValor = produtos.reduce((a, b) => a + (b.quantidade || 0) * Number(b.custo || 0), 0);
    const lowStock = produtos.filter((p) => p.quantidade > 0 && p.quantidade <= 5);
    const outOfStock = produtos.filter((p) => p.quantidade === 0);

    // Vendas (saídas de estoque) por produto neste mês
    const vendidoPorProd: Record<string, number> = {};
    for (const s of saidasMes) {
      if (!s.produto_id) continue;
      vendidoPorProd[s.produto_id] = (vendidoPorProd[s.produto_id] || 0) + Number(s.quantidade || 0);
    }
    // Produtos vendidos cujo estoque atual já não cobre o ritmo do mês → repor urgentemente
    const reporUrgente = produtos
      .filter((p) => p.id && (vendidoPorProd[p.id] || 0) > 0)
      .map((p) => ({
        nome: p.nome,
        vendido: vendidoPorProd[p.id!] || 0,
        estoque: p.quantidade || 0,
      }))
      .filter((x) => x.estoque <= x.vendido || x.estoque === 0)
      .sort((a, b) => b.vendido - a.vendido);

    // Top despesa categoria
    const byCat: Record<string, number> = {};
    for (const x of despesas) byCat[x.categoria] = (byCat[x.categoria] || 0) + Number(x.valor || 0);
    const topDesp = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const topDespPct = topDesp && faturamento > 0 ? (topDesp[1] / faturamento) * 100 : 0;

    const cur = monthRange();
    const ritmoDia = cur.today > 0 ? lucro / cur.today : 0;
    const faltaMeta = Math.max(0, meta - lucro);

    return {
      faturamento,
      despesas: desp,
      lucro,
      margem,
      variacaoLucro,
      progressoMeta,
      health,
      estoqueQtd,
      estoqueValor,
      lowStock,
      outOfStock,
      reporUrgente,
      topDesp,
      topDespPct,
      ritmoDia,
      faltaMeta,
    };
  }, [receitas, despesas, receitasPrev, despesasPrev, produtos, saidasMes, meta]);

  const radar = useMemo(() => buildRadar(stats, meta), [stats, meta]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="relative px-5 pt-12 pb-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs/none uppercase tracking-widest opacity-70">Bem-vindo</p>
            <h1 className="mt-1 text-2xl font-bold">
              Olá{nome ? `, ${nome}` : ""} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Notificações"
              className="relative grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
            >
              <Bell className="h-5 w-5" />
              {radar.some((r) => r.tone === "danger" || r.tone === "warning") && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning" />
              )}
            </button>
            <button
              onClick={handleSignOut}
              aria-label="Sair"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-7">
          <p className="text-sm opacity-80">Lucro deste mês</p>
          <div className="mt-1 flex items-end gap-3">
            <span className="text-4xl font-bold tracking-tight">{BRL(stats.lucro)}</span>
            {stats.faturamento > 0 && (
              <span
                className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  stats.variacaoLucro >= 0 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                }`}
              >
                {stats.variacaoLucro >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {stats.variacaoLucro >= 0 ? "+" : ""}
                {stats.variacaoLucro.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs opacity-70">comparado ao mês anterior</p>
        </div>
      </header>

      <section className="-mt-16 px-5">
        <HealthCard status={stats.health} margem={stats.margem} />
      </section>

      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/receitas">
            <KpiCard icon={<Wallet className="h-4 w-4" />} label="Faturamento" value={BRL(stats.faturamento)} tone="accent" />
          </Link>
          <Link to="/despesas">
            <KpiCard icon={<Receipt className="h-4 w-4" />} label="Despesas" value={BRL(stats.despesas)} tone="danger" />
          </Link>
          <Link to="/metas">
            <KpiCard
              icon={<Target className="h-4 w-4" />}
              label="Meta do mês"
              value={meta > 0 ? `${stats.progressoMeta}%` : "—"}
              sub={meta > 0 ? BRL(meta) : "Defina sua meta"}
              tone="success"
            />
          </Link>
          <Link to="/estoque">
            <KpiCard
              icon={<Package className="h-4 w-4" />}
              label="Estoque"
              value={`${stats.estoqueQtd} itens`}
              sub={BRL(stats.estoqueValor)}
              tone="neutral"
            />
          </Link>
        </div>
      </section>

      {meta > 0 && (
        <section className="mt-5 px-5">
          <div className="rounded-3xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Meta do mês</p>
                <p className="mt-0.5 text-base font-semibold">{BRL(stats.lucro)} de {BRL(meta)}</p>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{stats.progressoMeta}%</span>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full" style={{ width: `${stats.progressoMeta}%`, background: "var(--gradient-success)" }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {stats.faltaMeta > 0 ? (
                <>
                  Faltam <span className="font-semibold text-foreground">{BRL(stats.faltaMeta)}</span> para bater a meta.
                  {stats.ritmoDia > 0 && (
                    <> Você está no ritmo de <span className="font-semibold text-success">{BRL(stats.ritmoDia)}/dia</span>.</>
                  )}
                </>
              ) : (
                <>Você já bateu a meta deste mês 🎉</>
              )}
            </p>
          </div>
        </section>
      )}

      <section className="mt-6 px-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-bold">Radar do Negócio</h2>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando seu radar…</p>
          ) : radar.length === 0 ? (
            <RadarItem
              tone="neutral"
              icon={<Sparkles className="h-4 w-4" />}
              title="Comece a registrar suas movimentações"
              description="Adicione receitas, despesas e produtos para ver insights aqui."
            />
          ) : (
            radar.map((r, i) => (
              <RadarItem key={i} tone={r.tone} icon={r.icon} title={r.title} description={r.description} cta={r.cta} />
            ))
          )}
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="overflow-hidden rounded-3xl p-5 text-primary-foreground" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-hero)" }}>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">Sofia · sua assistente</p>
              <p className="mt-1 text-sm leading-relaxed opacity-90">
                Olá{nome ? `, ${nome}` : ""}! Analisei suas receitas, despesas, estoque e metas. Veja o que encontrei:
              </p>
              <ul className="mt-3 space-y-2">
                {buildAssistantInsights(stats, meta).map((msg, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <BottomNav active="home" />

    </div>
  );
}

type RadarTone = "danger" | "warning" | "success" | "neutral";
type RadarSpec = { tone: RadarTone; icon: React.ReactNode; title: string; description: string; cta?: string };

function buildRadar(s: ReturnType<typeof computeStatsType>, meta: number): RadarSpec[] {
  const out: RadarSpec[] = [];

  if (s.faturamento === 0 && s.despesas === 0) return out;

  if (s.lucro < 0) {
    out.push({
      tone: "danger",
      icon: <TrendingDown className="h-4 w-4" />,
      title: "Suas despesas passaram do faturamento",
      description: `Você está ${BRL(Math.abs(s.lucro))} no negativo neste mês.`,
      cta: "Ver despesas",
    });
  } else if (s.variacaoLucro < -10 && s.faturamento > 0) {
    out.push({
      tone: "danger",
      icon: <TrendingDown className="h-4 w-4" />,
      title: `Seu lucro caiu ${Math.abs(s.variacaoLucro).toFixed(0)}% vs. mês anterior`,
      description: "Olhe suas despesas para entender o que mudou.",
      cta: "Ver detalhes",
    });
  }

  if (s.reporUrgente.length > 0) {
    const top = s.reporUrgente[0];
    const more = s.reporUrgente.length - 1;
    out.push({
      tone: "danger",
      icon: <AlertTriangle className="h-4 w-4" />,
      title: `Repor URGENTE: ${top.nome}`,
      description:
        `Você vendeu ${top.vendido} un. este mês e tem apenas ${top.estoque} em estoque.` +
        (more > 0 ? ` Mais ${more} produto(s) na mesma situação.` : ""),
      cta: "Repor estoque",
    });
  }

  if (s.outOfStock.length > 0) {
    out.push({
      tone: "danger",
      icon: <AlertTriangle className="h-4 w-4" />,
      title: `${s.outOfStock.length} produto(s) zerados no estoque`,
      description: s.outOfStock.slice(0, 2).map((p) => p.nome).join(", "),
      cta: "Repor estoque",
    });
  }

  if (s.lowStock.length > 0) {
    const first = s.lowStock[0];
    out.push({
      tone: "warning",
      icon: <Package className="h-4 w-4" />,
      title: `${first.nome} com estoque baixo`,
      description:
        s.lowStock.length > 1
          ? `${first.quantidade} un. restantes. Mais ${s.lowStock.length - 1} produto(s) também precisam de atenção.`
          : `${first.quantidade} un. restantes. Considere repor em breve.`,
      cta: "Repor estoque",
    });
  }

  if (meta > 0) {
    if (s.progressoMeta >= 100) {
      out.push({
        tone: "success",
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: "Meta do mês batida!",
        description: `Você passou de ${BRL(meta)} em lucro. Continue acompanhando.`,
      });
    } else if (s.progressoMeta >= 70) {
      out.push({
        tone: "success",
        icon: <Target className="h-4 w-4" />,
        title: "Você está perto da meta mensal",
        description: `Faltam ${BRL(s.faltaMeta)} para bater os ${BRL(meta)}.`,
        cta: "Ver meta",
      });
    } else if (s.progressoMeta < 30 && new Date().getDate() > 15) {
      out.push({
        tone: "warning",
        icon: <Target className="h-4 w-4" />,
        title: "Meta do mês ainda longe",
        description: `Você está em ${s.progressoMeta}% da meta com o mês já na metade.`,
      });
    }
  }

  if (s.topDesp && s.topDespPct > 0) {
    const pct = s.topDespPct;
    const tone: RadarTone = pct > 30 ? "danger" : pct > 20 ? "warning" : "neutral";
    out.push({
      tone,
      icon: <PiggyBank className="h-4 w-4" />,
      title: `${s.topDesp[0]} representa ${pct.toFixed(0)}% do faturamento`,
      description:
        pct > 25
          ? "Está acima da faixa saudável (até 25%). Vale revisar."
          : "Dentro da faixa saudável (até 25%). Continue assim.",
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "success",
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "Seu negócio está em ordem",
      description: "Nenhum alerta importante por aqui. Bom trabalho!",
    });
  }

  return out.slice(0, 4);
}

// Helper to get the inferred type of `stats` without exporting it
function computeStatsType() {
  return {
    faturamento: 0,
    despesas: 0,
    lucro: 0,
    margem: 0,
    variacaoLucro: 0,
    progressoMeta: 0,
    health: "saudavel" as "saudavel" | "atencao" | "risco",
    estoqueQtd: 0,
    estoqueValor: 0,
    lowStock: [] as Produto[],
    outOfStock: [] as Produto[],
    reporUrgente: [] as { nome: string; vendido: number; estoque: number }[],
    topDesp: undefined as [string, number] | undefined,
    topDespPct: 0,
    ritmoDia: 0,
    faltaMeta: 0,
  };
}

function buildAssistantInsights(s: ReturnType<typeof computeStatsType>, meta: number): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  if (s.faturamento === 0 && s.despesas === 0) {
    return [
      <>Comece registrando uma <strong>receita</strong> ou <strong>despesa</strong> para eu te ajudar com sugestões personalizadas.</>,
    ];
  }

  // Variação de lucro vs mês anterior
  if (s.variacaoLucro <= -5 && s.faturamento > 0) {
    out.push(
      <>Seu lucro caiu <strong>{Math.abs(s.variacaoLucro).toFixed(0)}%</strong> em relação ao mês anterior.</>
    );
  } else if (s.variacaoLucro >= 10) {
    out.push(
      <>Seu lucro cresceu <strong>{s.variacaoLucro.toFixed(0)}%</strong> em relação ao mês anterior. Continue assim!</>
    );
  }

  // Maior gasto
  if (s.topDesp) {
    out.push(
      <>Seu maior gasto é <strong>{s.topDesp[0]}</strong> ({BRL(s.topDesp[1])}, {s.topDespPct.toFixed(0)}% do faturamento).</>
    );
  }

  // Estoque / reajuste de produtos
  if (s.outOfStock.length > 0) {
    out.push(
      <><strong>{s.outOfStock.length}</strong> produto(s) estão zerados — repor pode destravar novas vendas.</>
    );
  } else if (s.lowStock.length > 0) {
    out.push(
      <>Você tem <strong>{s.lowStock.length}</strong> produto(s) com estoque baixo. Reajustar o preço ou repor pode aumentar seu lucro.</>
    );
  }

  // Saúde do caixa
  if (s.health === "saudavel") {
    out.push(<>Seu caixa está <strong>saudável</strong> com margem de {s.margem.toFixed(0)}%.</>);
  } else if (s.health === "risco") {
    out.push(<>Seu caixa está <strong>apertado</strong> (margem de {s.margem.toFixed(0)}%). Vale revisar custos.</>);
  }

  // Meta
  if (meta > 0) {
    if (s.progressoMeta >= 100) {
      out.push(<>Você bateu a meta do mês de <strong>{BRL(meta)}</strong> 🎉</>);
    } else if (s.progressoMeta < 70) {
      out.push(
        <>Você está <strong>abaixo da meta</strong> ({s.progressoMeta}% de {BRL(meta)}). Faltam {BRL(s.faltaMeta)}.</>
      );
    } else {
      out.push(<>Você está perto da meta ({s.progressoMeta}% de {BRL(meta)}). Quase lá!</>);
    }
  }

  if (out.length === 0) {
    out.push(<>Tudo certo por aqui. Continue registrando suas movimentações para insights mais precisos.</>);
  }

  return out.slice(0, 5);
}

function HealthCard({ status, margem }: { status: "saudavel" | "atencao" | "risco"; margem: number }) {
  const map = {
    saudavel: { label: "Saudável", desc: "Seu negócio vai bem. Continue acompanhando.", color: "var(--color-success)", bg: "color-mix(in oklab, var(--color-success) 14%, white)" },
    atencao: { label: "Atenção", desc: "Alguns indicadores merecem cuidado.", color: "var(--color-warning)", bg: "color-mix(in oklab, var(--color-warning) 18%, white)" },
    risco: { label: "Em risco", desc: "Seu lucro está apertado. Veja o que ajustar.", color: "var(--color-danger)", bg: "color-mix(in oklab, var(--color-danger) 14%, white)" },
  }[status];
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl" style={{ background: map.bg }}>
        <span className="h-3 w-3 rounded-full" style={{ background: map.color, boxShadow: `0 0 0 6px color-mix(in oklab, ${map.color} 22%, transparent)` }} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground">Saúde do negócio</p>
        <p className="mt-0.5 text-lg font-bold" style={{ color: map.color }}>{map.label}</p>
        <p className="text-xs text-muted-foreground">{map.desc}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem</p>
        <p className="text-lg font-bold">{margem.toFixed(0)}%</p>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: "accent" | "danger" | "success" | "neutral" }) {
  const toneMap = {
    accent: { bg: "bg-accent/10", text: "text-accent" },
    danger: { bg: "bg-danger/10", text: "text-danger" },
    success: { bg: "bg-success/15", text: "text-success" },
    neutral: { bg: "bg-secondary", text: "text-foreground" },
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${toneMap.bg} ${toneMap.text}`}>{icon}</div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function RadarItem({ tone, icon, title, description, cta }: { tone: RadarTone; icon: React.ReactNode; title: string; description: string; cta?: string }) {
  const map = {
    danger: { bg: "bg-danger/10", text: "text-danger" },
    warning: { bg: "bg-warning/20", text: "text-warning-foreground" },
    success: { bg: "bg-success/15", text: "text-success" },
    neutral: { bg: "bg-accent/10", text: "text-accent" },
  }[tone];
  return (
    <article className="flex gap-3 rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${map.bg} ${map.text}`}>{icon}</div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold leading-snug">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        {cta && <button className={`mt-2 text-xs font-semibold ${map.text}`}>{cta} →</button>}
      </div>
    </article>
  );
}

function NavTab({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition ${active ? "text-accent" : "text-muted-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function FabButton() {
  return (
    <button aria-label="Novo lançamento" className="-mt-7 grid h-14 w-14 place-items-center rounded-full text-primary-foreground" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-pop)" }}>
      <Plus className="h-6 w-6" />
    </button>
  );
}

// Use ArrowUpRight to avoid unused import warning in strict mode
void ArrowUpRight;
