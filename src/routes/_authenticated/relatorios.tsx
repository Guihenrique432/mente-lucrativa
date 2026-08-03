import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, TrendingDown, Download, FileText } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SkeletonChart } from "@/components/Skeleton";
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
      { property: "og:title", content: "Relatórios — Lucro Real" },
      { property: "og:description", content: "Veja gráficos de faturamento, despesas e lucro dos últimos meses." },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/relatorios" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/relatorios" }],
  }),
  component: RelatoriosPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const BRL2 = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

type Row = { valor: number; data: string; categoria: string };

const RANGES = [
  { key: 3, label: "3 meses" },
  { key: 6, label: "6 meses" },
  { key: 12, label: "12 meses" },
] as const;

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
};

function csvEscape(v: string | number) {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadFile(name: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(
  receitas: Row[],
  despesas: Row[],
  mensal: { label: string; receita: number; despesa: number; lucro: number }[],
) {
  const rows: string[] = [];
  rows.push("Tipo;Data;Categoria;Valor");
  for (const r of receitas) rows.push(["Receita", r.data, r.categoria, r.valor].map(csvEscape).join(";"));
  for (const d of despesas) rows.push(["Despesa", d.data, d.categoria, d.valor].map(csvEscape).join(";"));
  rows.push("");
  rows.push("Resumo mensal");
  rows.push("Mês;Receita;Despesa;Lucro");
  for (const m of mensal) rows.push([m.label, m.receita, m.despesa, m.lucro].map(csvEscape).join(";"));
  const today = new Date().toISOString().slice(0, 10);
  downloadFile(`lucro-real-${today}.csv`, rows.join("\n"));
}

async function exportPDF(params: {
  receitas: Row[];
  despesas: Row[];
  mensal: { label: string; receita: number; despesa: number; lucro: number }[];
  topCategorias: { name: string; value: number }[];
  totalFat: number;
  totalDesp: number;
  totalLucro: number;
  rangeMeses: number;
  nomeUsuario: string;
}) {
  const { jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void }).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Lucro Real", 40, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Relatório financeiro • últimos ${params.rangeMeses} meses`, 40, 62);
  const hoje = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emitido em ${hoje}${params.nomeUsuario ? " • " + params.nomeUsuario : ""}`, 40, 76);

  // Summary cards
  let y = 120;
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo do período", 40, y);
  y += 14;
  const cardW = (W - 80 - 24) / 3;
  const cards = [
    { label: "Faturamento", value: BRL2(params.totalFat), color: [16, 185, 129] },
    { label: "Despesas", value: BRL2(params.totalDesp), color: [239, 68, 68] },
    {
      label: "Lucro",
      value: BRL2(params.totalLucro),
      color: params.totalLucro >= 0 ? [59, 130, 246] : [239, 68, 68],
    },
  ];
  cards.forEach((c, i) => {
    const x = 40 + i * (cardW + 12);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 60, 8, 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(c.label.toUpperCase(), x + 12, y + 20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 12, y + 44);
  });
  y += 80;

  // Mensal table
  autoTable(doc, {
    startY: y,
    head: [["Mês", "Receita", "Despesa", "Lucro"]],
    body: params.mensal.map((m) => [m.label, BRL2(m.receita), BRL2(m.despesa), BRL2(m.lucro)]),
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: 40, right: 40 },
  });

  // Top categorias
  if (params.topCategorias.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    autoTable(doc, {
      startY: finalY + 20,
      head: [["Top categorias de despesa", "Valor"]],
      body: params.topCategorias.map((c) => [c.name, BRL2(c.value)]),
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: 40, right: 40 },
    });
  }

  // Detail pages: lançamentos
  if (params.receitas.length > 0) {
    doc.addPage();
    autoTable(doc, {
      startY: 40,
      head: [["Data", "Categoria", "Valor"]],
      body: params.receitas
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .map((r) => [r.data.split("-").reverse().join("/"), r.categoria, BRL2(Number(r.valor))]),
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: { 2: { halign: "right" } },
      didDrawPage: () => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text("Receitas detalhadas", 40, 30);
      },
      margin: { top: 40, left: 40, right: 40 },
    });
  }
  if (params.despesas.length > 0) {
    doc.addPage();
    autoTable(doc, {
      startY: 40,
      head: [["Data", "Categoria", "Valor"]],
      body: params.despesas
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .map((d) => [d.data.split("-").reverse().join("/"), d.categoria, BRL2(Number(d.valor))]),
      theme: "grid",
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: { 2: { halign: "right" } },
      didDrawPage: () => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text("Despesas detalhadas", 40, 30);
      },
      margin: { top: 40, left: 40, right: 40 },
    });
  }

  // Footer with page numbers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Lucro Real • Página ${i} de ${total}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`lucro-real-${today}.pdf`);
}

function RelatoriosPage() {
  const [receitas, setReceitas] = useState<Row[]>([]);
  const [despesas, setDespesas] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [meses, setMeses] = useState<3 | 6 | 12>(6);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      setNomeUsuario(meta?.full_name || meta?.name || "");
    })();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const start = new Date();
      start.setMonth(start.getMonth() - (meses - 1));
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
  }, [meses]);

  const { mensal, totalFat, totalDesp, totalLucro, topCategorias } = useMemo(() => {
    const months: { key: string; label: string; receita: number; despesa: number; lucro: number }[] = [];
    const now = new Date();
    for (let i = meses - 1; i >= 0; i--) {
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
  }, [receitas, despesas, meses]);

  const colorForCategoria = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("salár") || n.includes("salar") || n.includes("pró-labore") || n.includes("pro-labore") || n.includes("folha"))
      return "hsl(217 91% 60%)";
    if (n.includes("lucro") || n.includes("reserva") || n.includes("investimento"))
      return "hsl(142 71% 45%)";
    const reds = ["hsl(0 84% 60%)", "hsl(0 72% 51%)", "hsl(14 91% 55%)", "hsl(350 80% 55%)", "hsl(25 85% 53%)"];
    return reds[Math.abs(hashStr(name)) % reds.length];
  };

  async function handlePDF() {
    setExporting("pdf");
    try {
      await exportPDF({
        receitas,
        despesas,
        mensal,
        topCategorias,
        totalFat,
        totalDesp,
        totalLucro,
        rangeMeses: meses,
        nomeUsuario,
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="relative px-5 pt-12 pb-24 text-primary-foreground"
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
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setExporting("csv");
                exportCSV(receitas, despesas, mensal);
                setTimeout(() => setExporting(null), 300);
              }}
              disabled={exporting !== null || loading}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-md transition hover:bg-white/15 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              onClick={handlePDF}
              disabled={exporting !== null || loading}
              className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white/90 disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              {exporting === "pdf" ? "Gerando..." : "PDF"}
            </button>
          </div>
        </div>

        <div className="mt-7">
          <p className="text-xs uppercase tracking-widest opacity-70">Últimos {meses} meses</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{BRL(totalLucro)}</p>
          <p className="mt-1 text-xs opacity-70">lucro acumulado</p>
        </div>

        <div className="mt-5 flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setMeses(r.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                meses === r.key ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <section className="-mt-16 px-5">
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
              <SkeletonChart h={224} />
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
            {loading ? (
              <SkeletonChart h={176} />
            ) : (
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
          {loading ? (
            <div className="mt-4"><SkeletonChart h={224} /></div>
          ) : topCategorias.length === 0 ? (
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
