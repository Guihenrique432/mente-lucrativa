import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Lucro Real" },
      { name: "description", content: "Veja gráficos de faturamento, despesas e lucro dos últimos meses." },
    ],
  }),
  component: RelatoriosPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

type Row = { valor: number; data: string; categoria: string };

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
};

function RelatoriosPage() {
  const [receitas, setReceitas] = useState<Row[]>([]);
  const [despesas, setDespesas] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Últimos 6 meses
      const start = new Date();
      start.setMonth(start.getMonth() - 5);
      start.setDate(1);
      const iso = start.toISOString().slice(0, 10);
      const [r, d] = await Promise.all([
        supabase.from("receitas").select("valor,data,categoria").gte("data", iso),
        supabase.from("despesas").select("valor,data,categoria").gte("data", iso),
      ]);
      setReceitas((r.data as Row[]) ?? []);
      setDespesas((d.data as Row[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const { mensal, totalFat, totalDesp, totalLucro, topCategorias } = useMemo(() => {
    const months: { key: string; label: string; receita: number; despesa: number; lucro: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: monthLabel(d), receita: 0, despesa: 0, lucro: 0 });
    }
    const findIdx = (data: string) => months.findIndex((m) => data.startsWith(m.key));
    for (const r of receitas) {
      const i = findIdx(r.data);
      if (i >= 0) months[i].receita += Number(r.valor || 0);
    }
    for (const x of despesas) {
      const i = findIdx(x.data);
      if (i >= 0) months[i].despesa += Number(x.valor || 0);
    }
    months.forEach((m) => (m.lucro = m.receita - m.despesa));

    const totalFat = months.reduce((a, b) => a + b.receita, 0);
    const totalDesp = months.reduce((a, b) => a + b.despesa, 0);
    const totalLucro = totalFat - totalDesp;

    const byCat: Record<string, number> = {};
    for (const x of despesas) byCat[x.categoria] = (byCat[x.categoria] || 0) + Number(x.valor || 0);
    const topCategorias = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return { mensal: months, totalFat, totalDesp, totalLucro, topCategorias };
  }, [receitas, despesas]);

  const colorForCategoria = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("salár") || n.includes("salar") || n.includes("pró-labore") || n.includes("pro-labore") || n.includes("folha"))
      return "hsl(217 91% 60%)"; // azul
    if (n.includes("lucro") || n.includes("reserva") || n.includes("investimento"))
      return "hsl(142 71% 45%)"; // verde
    // gastos em tons de vermelho
    const reds = ["hsl(0 84% 60%)", "hsl(0 72% 51%)", "hsl(14 91% 55%)", "hsl(350 80% 55%)", "hsl(25 85% 53%)"];
    return reds[Math.abs(hashStr(name)) % reds.length];
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="relative px-5 pt-12 pb-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BarChart3 className="h-5 w-5 opacity-80" />
        </div>
        <div className="mt-7">
          <p className="text-xs uppercase tracking-widest opacity-70">Últimos 6 meses</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{BRL(totalLucro)}</p>
          <p className="mt-1 text-xs opacity-70">lucro acumulado</p>
        </div>
      </header>

      <section className="-mt-12 px-5">
        <div className="grid grid-cols-2 gap-3">
          <SmallCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Faturamento"
            value={BRL(totalFat)}
            tone="success"
          />
          <SmallCard
            icon={<TrendingDown className="h-4 w-4" />}
            label="Despesas"
            value={BRL(totalDesp)}
            tone="danger"
          />
        </div>
      </section>

      <section className="mt-5 px-5">
        <div
          className="rounded-3xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-sm font-bold">Faturamento vs Despesas</h2>
          <p className="text-xs text-muted-foreground">Comparativo mês a mês</p>
          <div className="mt-4 h-56">
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensal} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <Tooltip
                    formatter={(v: number) => BRL(v)}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--danger))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 px-5">
        <div
          className="rounded-3xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-sm font-bold">Lucro mês a mês</h2>
          <div className="mt-4 h-44">
            {!loading && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensal} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                  <Tooltip formatter={(v: number) => BRL(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="lucro" name="Lucro" radius={[6, 6, 0, 0]}>
                    {mensal.map((m, i) => (
                      <Cell key={i} fill={m.lucro >= 0 ? "hsl(var(--accent))" : "hsl(var(--danger))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 px-5">
        <div
          className="rounded-3xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-sm font-bold">Onde vai seu dinheiro</h2>
          <p className="text-xs text-muted-foreground">Maiores categorias de despesa</p>
          {topCategorias.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">Sem despesas registradas ainda.</p>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCategorias} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40}>
                    {topCategorias.map((_, i) => (
                      <Cell key={i} fill={colorForCategoria(topCategorias[i].name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => BRL(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <BottomNav active="relatorios" />
    </div>
  );
}

function SmallCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "danger";
}) {
  const cls = tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger";
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${cls}`}>{icon}</div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}
