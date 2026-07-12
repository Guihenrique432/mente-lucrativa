import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, History, Filter, X, Plus, Pencil, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SkeletonList } from "@/components/Skeleton";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Lucro Real" },
      { name: "description", content: "Veja todas as alterações feitas em receitas e despesas." },
    ],
  }),
  component: HistoricoPage,
});

type Registro = {
  id: string;
  tabela: "receitas" | "despesas";
  registro_id: string;
  acao: "insert" | "update" | "delete";
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  campos_alterados: string[];
  created_at: string;
};

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const CAMPO_LABEL: Record<string, string> = {
  valor: "Valor",
  categoria: "Categoria",
  data: "Data",
  observacao: "Observação",
};

function formatValor(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (campo === "valor") return BRL(Number(v));
  if (campo === "data") {
    const s = String(v);
    const [y, m, d] = s.split("-");
    if (y && m && d) return `${d}/${m}/${y.slice(2)}`;
    return s;
  }
  return String(v);
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoricoPage() {
  const [items, setItems] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTabela, setFiltroTabela] = useState<"todos" | "receitas" | "despesas">("todos");
  const [filtroAcao, setFiltroAcao] = useState<"todos" | "insert" | "update" | "delete">("todos");
  const [detalhe, setDetalhe] = useState<Registro | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("historico_lancamentos")
        .select("id,tabela,registro_id,acao,dados_antes,dados_depois,campos_alterados,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      setItems((data as Registro[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (filtroTabela === "todos" || i.tabela === filtroTabela) &&
          (filtroAcao === "todos" || i.acao === filtroAcao),
      ),
    [items, filtroTabela, filtroAcao],
  );

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="px-5 pt-12 pb-16 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            to="/perfil"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-semibold">Histórico</p>
          <span className="w-10" />
        </div>
        <div className="mx-auto mt-6 max-w-md">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <History className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold">Alterações</p>
              <p className="text-xs opacity-80">Tudo que foi criado, editado ou excluído</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-md space-y-3 px-4">
        <section
          className="rounded-2xl border border-border bg-card p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>
          <div className="mt-3 space-y-2">
            <ChipRow
              options={[
                { v: "todos", l: "Todos" },
                { v: "receitas", l: "Receitas" },
                { v: "despesas", l: "Despesas" },
              ]}
              value={filtroTabela}
              onChange={(v) => setFiltroTabela(v as typeof filtroTabela)}
            />
            <ChipRow
              options={[
                { v: "todos", l: "Todas ações" },
                { v: "insert", l: "Criados" },
                { v: "update", l: "Editados" },
                { v: "delete", l: "Excluídos" },
              ]}
              value={filtroAcao}
              onChange={(v) => setFiltroAcao(v as typeof filtroAcao)}
            />
          </div>
        </section>

        {loading ? (
          <SkeletonList n={5} />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setDetalhe(r)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-accent/50"
                >
                  <AcaoBadge acao={r.acao} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {r.tabela === "receitas" ? "Receita" : "Despesa"}{" "}
                      <span className="font-normal text-muted-foreground">
                        {resumo(r)}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(r.created_at)}
                      {r.acao === "update" && r.campos_alterados.length > 0 && (
                        <>
                          {" · "}
                          {r.campos_alterados
                            .filter((c) => CAMPO_LABEL[c])
                            .map((c) => CAMPO_LABEL[c] ?? c)
                            .join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {detalhe && <DetalheModal registro={detalhe} onClose={() => setDetalhe(null)} />}

      <BottomNav active="movimentos" />
    </div>
  );
}

function resumo(r: Registro): string {
  const src = r.acao === "delete" ? r.dados_antes : r.dados_depois;
  if (!src) return "";
  const cat = (src as { categoria?: string }).categoria;
  const val = (src as { valor?: number | string }).valor;
  const parts: string[] = [];
  if (cat) parts.push(String(cat));
  if (val !== undefined && val !== null) parts.push(BRL(Number(val)));
  return parts.length ? `— ${parts.join(" · ")}` : "";
}

function AcaoBadge({ acao }: { acao: Registro["acao"] }) {
  if (acao === "insert")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
        <Plus className="h-4 w-4" />
      </span>
    );
  if (acao === "update")
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Pencil className="h-4 w-4" />
      </span>
    );
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
      <Trash2 className="h-4 w-4" />
    </span>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; l: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            value === o.v
              ? "border-accent bg-accent text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-accent/50"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function DetalheModal({ registro, onClose }: { registro: Registro; onClose: () => void }) {
  const campos =
    registro.acao === "update"
      ? registro.campos_alterados.filter((c) => CAMPO_LABEL[c])
      : Object.keys(
          (registro.acao === "delete" ? registro.dados_antes : registro.dados_depois) ?? {},
        ).filter((c) => CAMPO_LABEL[c]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {registro.tabela === "receitas" ? "Receita" : "Despesa"} ·{" "}
              {registro.acao === "insert" ? "Criado" : registro.acao === "update" ? "Editado" : "Excluído"}
            </p>
            <p className="mt-0.5 text-sm text-foreground">{formatDateTime(registro.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {campos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem detalhes disponíveis.</p>
          ) : (
            campos.map((c) => {
              const antes = registro.dados_antes ? (registro.dados_antes as Record<string, unknown>)[c] : undefined;
              const depois = registro.dados_depois
                ? (registro.dados_depois as Record<string, unknown>)[c]
                : undefined;
              return (
                <div key={c} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {CAMPO_LABEL[c] ?? c}
                  </p>
                  {registro.acao === "update" ? (
                    <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Antes</p>
                        <p className="text-danger">{formatValor(c, antes)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Depois</p>
                        <p className="text-success">{formatValor(c, depois)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-foreground">
                      {formatValor(c, registro.acao === "delete" ? antes : depois)}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
