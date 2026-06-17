import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Target, CheckCircle2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Lucro Real" },
      { name: "description", content: "Defina sua meta de lucro mensal e acompanhe seu progresso." },
    ],
  }),
  component: MetasPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function monthRange() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end), daysInMonth: end.getDate(), today: d.getDate() };
}

function MetasPage() {
  const [metaId, setMetaId] = useState<string | null>(null);
  const [meta, setMeta] = useState<number>(0);
  const [input, setInput] = useState("");
  const [lucro, setLucro] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { start, end } = monthRange();
    const [m, r, d] = await Promise.all([
      supabase
        .from("metas")
        .select("id,meta_lucro")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("receitas").select("valor").gte("data", start).lte("data", end),
      supabase.from("despesas").select("valor").gte("data", start).lte("data", end),
    ]);
    const valor = Number(m.data?.meta_lucro ?? 0);
    setMetaId(m.data?.id ?? null);
    setMeta(valor);
    setInput(valor ? String(valor) : "");
    const fat = (r.data ?? []).reduce((a, b) => a + Number(b.valor || 0), 0);
    const desp = (d.data ?? []).reduce((a, b) => a + Number(b.valor || 0), 0);
    setLucro(fat - desp);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const cur = monthRange();
    const progresso = meta > 0 ? Math.min(100, Math.round((lucro / meta) * 100)) : 0;
    const falta = Math.max(0, meta - lucro);
    const diasRest = Math.max(1, cur.daysInMonth - cur.today + 1);
    const ritmoNecessario = falta / diasRest;
    return { progresso, falta, diasRest, ritmoNecessario };
  }, [meta, lucro]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(input.replace(",", "."));
    if (isNaN(v) || v < 0) return toast.error("Informe um valor válido");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = { meta_lucro: v, user_id: u.user!.id };
    const { error } = metaId
      ? await supabase.from("metas").update(payload).eq("id", metaId)
      : await supabase.from("metas").insert(payload);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar");
    toast.success("Meta atualizada");
    load();
  }

  const sugestoes = [1000, 3000, 5000, 10000, 20000];

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
          <Target className="h-5 w-5 opacity-80" />
        </div>
        <div className="mt-7">
          <p className="text-xs uppercase tracking-widest opacity-70">Meta de lucro mensal</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{meta > 0 ? BRL(meta) : "—"}</p>
          <p className="mt-1 text-xs opacity-70">
            {meta > 0 ? `Você está em ${stats.progresso}% da meta` : "Defina abaixo a sua meta"}
          </p>
        </div>
      </header>

      {meta > 0 && (
        <section className="-mt-12 px-5">
          <div
            className="rounded-3xl border border-border bg-card p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Lucro até agora</p>
                <p className="mt-0.5 text-lg font-bold">{BRL(lucro)}</p>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                {stats.progresso}%
              </span>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full"
                style={{ width: `${stats.progresso}%`, background: "var(--gradient-success)" }}
              />
            </div>
            {stats.falta > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Faltam <span className="font-semibold text-foreground">{BRL(stats.falta)}</span> em{" "}
                {stats.diasRest} dia{stats.diasRest === 1 ? "" : "s"} — ritmo de{" "}
                <span className="font-semibold text-success">{BRL(stats.ritmoNecessario)}/dia</span>.
              </p>
            ) : (
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Meta batida 🎉
              </p>
            )}
          </div>
        </section>
      )}

      <section className={`${meta > 0 ? "mt-5" : "-mt-12"} px-5`}>
        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-border bg-card p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-base font-bold">Definir nova meta</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Quanto de lucro você quer ter neste mês?
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {sugestoes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInput(String(s))}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  Number(input) === s
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {BRL(s)}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-muted-foreground">Valor (R$)</label>
            <input
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0,00"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-lg font-semibold outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="mt-4 w-full rounded-full py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            style={{ background: "var(--gradient-hero)" }}
          >
            {saving ? "Salvando..." : "Salvar meta"}
          </button>
        </form>
      </section>

      <BottomNav active="home" />
    </div>
  );
}
