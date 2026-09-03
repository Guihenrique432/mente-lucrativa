import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rotulos, premissaProjecao, modeloLabel, type ModeloPerfil } from "@/lib/perfil-financeiro";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

type Valor = { valor: number };
type Produto = { quantidade: number; custo: number };

export function IndicadoresPerfilCard() {
  const [loading, setLoading] = useState(true);
  const [modelo, setModelo] = useState<ModeloPerfil>("outro");
  const [profissao, setProfissao] = useState("");
  const [receitas, setReceitas] = useState<Valor[]>([]);
  const [despesas, setDespesas] = useState<Valor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cur = monthRange();
      const [r, d, p, pf] = await Promise.all([
        supabase.from("receitas").select("valor").gte("data", cur.start).lte("data", cur.end),
        supabase.from("despesas").select("valor").gte("data", cur.start).lte("data", cur.end),
        supabase.from("produtos").select("quantidade,custo"),
        supabase.from("perfil_financeiro").select("modelo,profissao").maybeSingle(),
      ]);
      if (cancelled) return;
      setReceitas((r.data as Valor[]) ?? []);
      setDespesas((d.data as Valor[]) ?? []);
      setProdutos((p.data as Produto[]) ?? []);
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
    const sum = (xs: Valor[]) => xs.reduce((a, b) => a + Number(b.valor || 0), 0);
    const faturamento = sum(receitas);
    const desp = sum(despesas);
    const lucro = faturamento - desp;
    const volume = receitas.length;
    const ticketMedio = volume > 0 ? faturamento / volume : 0;
    const estoqueValor = produtos.reduce(
      (a, b) => a + Number(b.quantidade || 0) * Number(b.custo || 0),
      0,
    );
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    return { faturamento, lucro, volume, ticketMedio, estoqueValor, margem };
  }, [receitas, despesas, produtos]);

  const rot = rotulos(modelo);

  return (
    <section className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Indicadores do seu perfil
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {profissao ? `${profissao} · ` : ""}
        {modeloLabel(modelo)}
      </p>

      {loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-xl bg-surface" />
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}
