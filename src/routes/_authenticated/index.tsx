import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { rotulos, modeloLabel, premissaProjecao, sugerirModelo, type ModeloPerfil } from "@/lib/perfil-financeiro";

import {
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
      { property: "og:title", content: "Lucro Real — Controle financeiro para autônomos e lojistas" },
      { property: "og:description", content: "Entenda seu lucro real, controle estoque e metas em um app simples feito para quem empreende no Brasil." },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/" }],
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
  const [nome, setNome] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [receitasPrev, setReceitasPrev] = useState<Receita[]>([]);
  const [despesasPrev, setDespesasPrev] = useState<Despesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [saidasMes, setSaidasMes] = useState<MovSaida[]>([]);
  const [meta, setMeta] = useState<number>(0);
  const [dividaAnterior, setDividaAnterior] = useState<number>(0);
  const [modelo, setModelo] = useState<ModeloPerfil>("outro");
  const [profissao, setProfissao] = useState<string>("");
  const [sugestaoOculta, setSugestaoOculta] = useState(false);


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
      const [r, d, rp, dp, p, m, mov, rAnt, dAnt, pf] = await Promise.all([
        supabase.from("receitas").select("valor,data,categoria").gte("data", cur.start).lte("data", cur.end),
        supabase.from("despesas").select("valor,data,categoria").gte("data", cur.start).lte("data", cur.end),
        supabase.from("receitas").select("valor,data,categoria").gte("data", prev.start).lte("data", prev.end),
        supabase.from("despesas").select("valor,data,categoria").gte("data", prev.start).lte("data", prev.end),
        supabase.from("produtos").select("id,nome,quantidade,custo,preco_venda"),
        supabase.from("metas").select("meta_lucro").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("movimentacoes_estoque").select("produto_id,quantidade,tipo,data").eq("tipo", "saida").gte("data", cur.start).lte("data", cur.end + "T23:59:59"),
        supabase.from("receitas").select("valor").lt("data", cur.start),
        supabase.from("despesas").select("valor").lt("data", cur.start),
        supabase.from("perfil_financeiro").select("modelo,profissao").maybeSingle(),
      ]);
      if (cancelled) return;
      setReceitas((r.data as Receita[]) ?? []);
      setDespesas((d.data as Despesa[]) ?? []);
      setReceitasPrev((rp.data as Receita[]) ?? []);
      setDespesasPrev((dp.data as Despesa[]) ?? []);
      setProdutos((p.data as Produto[]) ?? []);
      setSaidasMes(((mov.data as MovSaida[]) ?? []));
      setMeta(Number(m.data?.meta_lucro ?? 0));
      const sumV = (xs: { valor: number }[] | null) =>
        (xs ?? []).reduce((a, b) => a + Number(b.valor || 0), 0);
      const saldoAnterior = sumV(rAnt.data as { valor: number }[]) - sumV(dAnt.data as { valor: number }[]);
      setDividaAnterior(saldoAnterior < 0 ? Math.abs(saldoAnterior) : 0);
      if (pf.data) {
        setModelo(((pf.data as { modelo?: string }).modelo as ModeloPerfil) ?? "outro");
        setProfissao((pf.data as { profissao?: string | null }).profissao ?? "");
      }
      setLoading(false);

    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);


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

    const volume = receitas.length;
    const ticketMedio = volume > 0 ? faturamento / volume : 0;

    return {
      volume,
      ticketMedio,
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
  const rot = useMemo(() => rotulos(modelo), [modelo]);

  const sugestao = useMemo(() => {
    if (sugestaoOculta) return null;
    const textos = [...receitas, ...despesas].map((x) => x.categoria ?? "");
    const s = sugerirModelo(textos);
    return s && s !== modelo ? s : null;
  }, [receitas, despesas, modelo, sugestaoOculta]);

  async function aplicarSugestao(novo: ModeloPerfil) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase
      .from("perfil_financeiro")
      .upsert({ user_id: u.user.id, modelo: novo }, { onConflict: "user_id" });
    setModelo(novo);
    setSugestaoOculta(true);
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="relative px-5 pt-12 pb-24 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs/none uppercase tracking-widest opacity-70">
              Olá{nome ? `, ${nome}` : ""} 👋
            </p>
            <h1 className="mt-1 text-2xl font-bold">Visão geral do seu lucro real</h1>
            <p className="mt-1 text-[11px] opacity-70">
              {profissao ? `${profissao} · ` : ""}
              {modeloLabel(modelo)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/sofia"
              aria-label="Falar com a Sofia"
              className="relative grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
            >
              <Sparkles className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            </Link>
            <Link
              to="/perfil"
              aria-label="Meu perfil"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md text-sm font-bold transition hover:bg-white/15"
            >
              {(nome || "?").slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </div>

        <div className="mt-7">
          <p className="text-sm opacity-80">{rot.resultado} deste mês</p>
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

      {dividaAnterior > 0 && (
        <section className="mt-4 px-5">
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/15 text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-danger">
                  Dívida de meses anteriores: {BRL(dividaAnterior)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stats.lucro > 0
                    ? dividaAnterior - stats.lucro > 0
                      ? `Com o lucro deste mês você já quitou ${BRL(Math.min(stats.lucro, dividaAnterior))}. Faltam ${BRL(dividaAnterior - stats.lucro)} para ficar no zero.`
                      : "O lucro deste mês já cobre a dívida. Continue assim para virar o mês no positivo 🎉"
                    : "Você fechou meses anteriores no vermelho. Vamos lembrar disso todo mês até ela ser quitada."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}


      {(stats.outOfStock.length > 0 || stats.lowStock.length > 0) && (
        <section className="mt-4 px-5">
          <Link
            to="/estoque"
            className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 transition hover:bg-danger/10"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/15 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-danger">
                {stats.outOfStock.length > 0
                  ? `${stats.outOfStock.length} produto${stats.outOfStock.length > 1 ? "s" : ""} zerado${stats.outOfStock.length > 1 ? "s" : ""}`
                  : `Estoque baixo em ${stats.lowStock.length} produto${stats.lowStock.length > 1 ? "s" : ""}`}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[...stats.outOfStock, ...stats.lowStock].slice(0, 3).map((p) => p.nome).join(", ")}
                {stats.outOfStock.length + stats.lowStock.length > 3 && "..."}
              </p>
            </div>
            <span className="text-xs font-semibold text-danger">Repor →</span>
          </Link>
        </section>
      )}


      {sugestao && (
        <section className="mt-4 px-5">
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              Parece que seu trabalho é: {modeloLabel(sugestao)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Notei isso pelos seus lançamentos. Quer configurar seu perfil assim? Nada é alterado no seu histórico.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => aplicarSugestao(sugestao)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-hero)" }}
              >
                Sim, configurar
              </button>
              <button
                onClick={() => setSugestaoOculta(true)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground"
              >
                Agora não
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mt-5 px-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Indicadores do seu perfil
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">{rot.volumeLabel}</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{stats.volume}</p>
            </div>
            <div className="rounded-xl bg-surface px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">{rot.ticketLabel}</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{BRL(stats.ticketMedio)}</p>
            </div>
            {(modelo === "comercio" || modelo === "estoque" || modelo === "alimentacao") && (
              <div className="rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Dinheiro parado no estoque</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">{BRL(stats.estoqueValor)}</p>
              </div>
            )}
            {modelo === "clt" && (
              <div className="rounded-xl bg-surface px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">Capacidade de economia</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">{BRL(Math.max(0, stats.lucro))}</p>
              </div>
            )}
            <div className="rounded-xl bg-surface px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Margem do mês</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">
                {stats.faturamento > 0 ? `${stats.margem.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {premissaProjecao(modelo)}, seu resultado em 12 meses seria de aproximadamente{" "}
            {BRL(stats.lucro * 12)}. É uma projeção baseada apenas no mês atual, não uma garantia.
          </p>
        </div>
      </section>

      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/receitas">
            <KpiCard icon={<Wallet className="h-4 w-4" />} label={rot.entrada} value={BRL(stats.faturamento)} tone="accent" />
          </Link>
          <Link to="/despesas">
            <KpiCard icon={<Receipt className="h-4 w-4" />} label={rot.saida} value={BRL(stats.despesas)} tone="danger" />
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

      <section className="mt-4 px-5">
        <Link
          to="/sofia"
          className="flex items-center justify-between rounded-2xl border border-accent/40 p-4 transition hover:brightness-105"
          style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--accent) / 0.04))" }}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Pergunte para a Sofia</p>
              <p className="text-xs text-muted-foreground">IA que analisa seus números agora</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-accent">Abrir →</span>
        </Link>
      </section>

      <section className="mt-3 px-5">
        <Link
          to="/visao"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-accent/40"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Visão Financeira</p>
              <p className="text-xs text-muted-foreground">Simule uma compra e veja o impacto futuro</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-accent">Simular →</span>
        </Link>
      </section>




      {meta > 0 && (
        <section className="mt-5 px-5">
          <div className="rounded-3xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Meta do mês</p>
                <p className="mt-0.5 text-base font-semibold">
                  <span className={stats.lucro < 0 ? "text-danger" : ""}>{BRL(stats.lucro)}</span>{" "}
                  de {BRL(meta)}
                </p>
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
      <OnboardingModal />

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

  // Estoque vs vendas — sinal mais urgente, mostrar primeiro
  if (s.reporUrgente.length > 0) {
    const top = s.reporUrgente[0];
    out.push(
      <>Você vendeu <strong>{top.vendido}</strong> un. de <strong>{top.nome}</strong> este mês e só tem <strong>{top.estoque}</strong> em estoque. <strong>Reponha urgentemente</strong> para não perder vendas{s.reporUrgente.length > 1 ? ` (+${s.reporUrgente.length - 1} produto(s) na mesma situação)` : ""}.</>
    );
  } else if (s.outOfStock.length > 0) {
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
