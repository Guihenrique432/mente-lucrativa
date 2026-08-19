import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, TrendingUp, Loader2, Info, AlertTriangle, Upload } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ImportarDadosModal } from "@/components/ImportarDadosModal";
import { simularDecisao } from "@/lib/visao.functions";
import type { ResultadoSimulacao } from "@/lib/visao-calc";

export const Route = createFileRoute("/_authenticated/visao")({
  head: () => ({
    meta: [
      { title: "Visão Financeira — Impacto das Decisões" },
      {
        name: "description",
        content:
          "Simule uma compra e veja o impacto estimado no seu caixa hoje, em 30 dias, 6 e 12 meses, com base nos seus dados reais.",
      },
      { property: "og:title", content: "Visão Financeira — Impacto das Decisões" },
      {
        property: "og:description",
        content: "Simule uma compra e veja o impacto estimado no seu caixa a curto, médio e longo prazo.",
      },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/visao" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/visao" }],
  }),
  component: VisaoPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const hoje = () => new Date().toISOString().slice(0, 10);

function VisaoPage() {
  const simular = useServerFn(simularDecisao);
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState<"avista" | "parcelado">("avista");
  const [parcelas, setParcelas] = useState("12");
  const [data, setData] = useState(hoje());
  const [finalidade, setFinalidade] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [res, setRes] = useState<(ResultadoSimulacao & { analise: string }) | null>(null);
  const [cenarioAtivo, setCenarioAtivo] = useState("agora");
  const [importar, setImportar] = useState(false);

  async function rodar(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(String(valor).replace(/\./g, "").replace(",", "."));
    if (!v || v <= 0) {
      setErro("Informe o valor da compra.");
      return;
    }
    setErro("");
    setLoading(true);
    setRes(null);
    try {
      const out = await simular({
        data: {
          valor: v,
          forma,
          parcelas: forma === "parcelado" ? Math.min(420, Math.max(1, Number(parcelas) || 1)) : 1,
          data,
          finalidade: finalidade.trim() || undefined,
        },
      });
      setRes(out as any);
      setCenarioAtivo(forma === "parcelado" ? "parcelar" : "agora");
    } catch (err: any) {
      setErro(err?.message || "Não consegui simular agora. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  const cenario = res?.cenarios.find((c) => c.chave === cenarioAtivo) ?? res?.cenarios[0];

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-5 pt-12 pb-6 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Visão Financeira</p>
              <p className="text-[10px] leading-tight opacity-80">Impacto das decisões</p>
            </div>
          </div>
          <span className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-5">
        <h1 className="sr-only">Visão Financeira — impacto das suas decisões</h1>

        <button
          type="button"
          onClick={() => setImportar(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent"
        >
          <Upload className="h-4 w-4" />
          Importar extrato, faturas e metas
        </button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Traga seus lançamentos reais para a projeção deixar de mostrar valores zerados.
        </p>


        <form onSubmit={rodar} className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Simule uma decisão</p>

          <label className="block">
            <span className="text-xs text-muted-foreground">Valor da compra</span>
            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="4600,00"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>

          <div>
            <span className="text-xs text-muted-foreground">Forma de pagamento</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["avista", "parcelado"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForma(f)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    forma === f ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border text-muted-foreground"
                  }`}
                >
                  {f === "avista" ? "À vista" : "Parcelado"}
                </button>
              ))}
            </div>
          </div>

          {forma === "parcelado" && (
            <label className="block">
              <span className="text-xs text-muted-foreground">Número de parcelas (1 a 420)</span>
              <input
                inputMode="numeric"
                value={parcelas}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setParcelas(n);
                }}
                onBlur={() => {
                  const n = Math.min(420, Math.max(1, Number(parcelas) || 1));
                  setParcelas(String(n));
                }}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
              />

            </label>
          )}

          <label className="block">
            <span className="text-xs text-muted-foreground">Data da compra</span>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="text-xs text-muted-foreground">Finalidade (opcional)</span>
            <input
              value={finalidade}
              onChange={(e) => setFinalidade(e.target.value)}
              placeholder="Ex.: máquina nova, estoque, notebook"
              maxLength={200}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>

          {erro && <p className="text-xs font-medium text-danger">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            style={{ background: "var(--gradient-hero)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            {loading ? "Calculando impacto..." : "Calcular impacto"}
          </button>
        </form>

        {res && (
          <>
            {!res.base.temDados && (
              <div className="mt-4 flex gap-2 rounded-2xl border border-danger/40 bg-danger/5 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <p className="text-xs text-foreground">
                  Ainda não há lançamentos suficientes. Registre receitas e despesas para que a projeção use seus números
                  reais.
                </p>
              </div>
            )}

            <section className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Sua situação hoje</p>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <Item label="Saldo acumulado" value={BRL(res.base.saldoAtual)} />
                <Item label="Poupança por mês" value={BRL(res.base.poupancaMensal)} />
                <Item label="Receita média/mês" value={BRL(res.base.receitaMediaMensal)} />
                <Item label="Despesa média/mês" value={BRL(res.base.despesaMediaMensal)} />
                {res.base.metaLucro > 0 && <Item label="Meta de lucro" value={BRL(res.base.metaLucro)} />}
                {res.base.compromissosMensais > 0 && (
                  <Item label="Compromissos/mês" value={BRL(res.base.compromissosMensais)} />
                )}
              </dl>
            </section>

            <section className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Comparar cenários
              </p>
              <div className="grid grid-cols-2 gap-2">
                {res.cenarios.map((c) => (
                  <button
                    key={c.chave}
                    onClick={() => setCenarioAtivo(c.chave)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                      cenarioAtivo === c.chave
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </section>

            {cenario && (
              <section className="mt-3 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{cenario.nome}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{cenario.descricao}</p>

                <div className="mt-3 space-y-2">
                  {cenario.pontos.map((p) => (
                    <div key={p.horizonte} className="flex items-center justify-between border-b border-border/60 pb-1.5 last:border-0">
                      <span className="text-xs text-muted-foreground">{p.label}</span>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${p.saldoComCompra < 0 ? "text-danger" : "text-foreground"}`}>
                          {BRL(p.saldoComCompra)}
                        </p>
                        {p.diferenca !== 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {p.diferenca > 0 ? "+" : ""}
                            {BRL(p.diferenca)} vs. não comprar
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-1 rounded-xl bg-surface p-3 text-xs">
                  <p>
                    Menor saldo projetado em 24 meses:{" "}
                    <strong className={cenario.saldoMinimo < 0 ? "text-danger" : ""}>{BRL(cenario.saldoMinimo)}</strong>
                  </p>
                  {cenario.mesesNegativo > 0 && (
                    <p className="text-danger">Meses com saldo negativo na projeção: {cenario.mesesNegativo}</p>
                  )}
                  {cenario.atrasoMetaMeses !== null && res.base.metaLucro > 0 && (
                    <p>
                      Impacto estimado na meta de {BRL(res.base.metaLucro)}: cerca de{" "}
                      <strong>{cenario.atrasoMetaMeses.toFixed(1)} meses</strong> a mais no seu ritmo atual de economia.
                    </p>
                  )}
                </div>
              </section>
            )}

            {res.analise && (
              <section className="mt-4 rounded-2xl border border-accent/40 p-4" style={{ background: "linear-gradient(135deg, hsl(var(--accent) / 0.12), hsl(var(--accent) / 0.04))" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Leitura da Sofia</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{res.analise}</p>
              </section>
            )}

            <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">Hipóteses usadas nesta projeção</p>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-muted-foreground">
                {res.hipoteses.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Estas são estimativas baseadas nos seus dados e nas hipóteses acima — não são garantia de resultado
                futuro.
              </p>
            </section>
          </>
        )}
      </main>

      <BottomNav active="relatorios" />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
