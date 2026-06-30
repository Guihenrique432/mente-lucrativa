import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Pencil, Trash2, X, Receipt, Search, Package } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

type ProdutoOpt = {
  id: string;
  nome: string;
  preco_venda: number;
  quantidade: number;
};

export type Tipo = "receita" | "despesa";

type Lancamento = {
  id: string;
  valor: number;
  categoria: string;
  data: string;
  observacao: string | null;
};

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SUGESTOES: Record<Tipo, string[]> = {
  receita: ["Venda", "Serviço", "Comissão", "Outro"],
  despesa: ["Fornecedor", "Aluguel", "Salário", "Marketing", "Insumos", "Imposto", "Outro"],
};

export function LancamentosPage({ tipo }: { tipo: Tipo }) {
  const table = tipo === "receita" ? "receitas" : "despesas";
  const titulo = tipo === "receita" ? "Receitas" : "Despesas";
  const accentVar = tipo === "receita" ? "var(--gradient-success)" : "var(--gradient-hero)";
  const accentColor = tipo === "receita" ? "text-success" : "text-danger";
  const accentBg = tipo === "receita" ? "bg-success/10" : "bg-danger/10";

  const [items, setItems] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("id,valor,categoria,data,observacao")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(`Erro ao carregar ${titulo.toLowerCase()}`);
    setItems((data as Lancamento[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [tipo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.categoria.toLowerCase().includes(q) ||
        (i.observacao ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Lancamento[]>();
    for (const i of filtered) {
      const arr = map.get(i.data) ?? [];
      arr.push(i);
      map.set(i.data, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalMes = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return items
      .filter((i) => i.data.startsWith(ym))
      .reduce((a, b) => a + Number(b.valor || 0), 0);
  }, [items]);

  async function handleDelete(i: Lancamento) {
    const nome = i.observacao?.trim() || i.categoria;
    if (!confirm(`Excluir "${nome}"?`)) return;

    // Se for receita com venda vinculada, reverter o movimento de estoque
    let estoqueRevertido = false;
    if (tipo === "receita") {
      const tag = `Venda receita:${i.id}`;
      const { data: movs } = await supabase
        .from("movimentacoes_estoque")
        .select("id")
        .eq("observacao", tag)
        .eq("tipo", "saida");
      if (movs && movs.length > 0) {
        const ids = movs.map((m: { id: string }) => m.id);
        const { error: errMov } = await supabase
          .from("movimentacoes_estoque")
          .delete()
          .in("id", ids);
        if (!errMov) estoqueRevertido = true;
      }
    }

    const { error } = await supabase.from(table).delete().eq("id", i.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success(estoqueRevertido ? "Excluído e estoque restaurado" : "Excluído");
    load();
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="relative px-5 pt-12 pb-20 text-primary-foreground"
        style={{ background: accentVar }}
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex gap-2">
            <Link
              to="/receitas"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tipo === "receita" ? "bg-white text-foreground" : "bg-white/10 text-white"
              }`}
            >
              Receitas
            </Link>
            <Link
              to="/despesas"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                tipo === "despesa" ? "bg-white text-foreground" : "bg-white/10 text-white"
              }`}
            >
              Despesas
            </Link>
          </div>
        </div>
        <div className="mt-7">
          <p className="text-xs uppercase tracking-widest opacity-70">Total do mês</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{BRL(totalMes)}</p>
          <p className="mt-1 text-xs opacity-70">
            {items.length} lançamento{items.length === 1 ? "" : "s"} no total
          </p>
        </div>
      </header>

      <section className="-mt-12 px-5">
        <div
          className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${titulo.toLowerCase()}...`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </section>

      <section className="mt-5 space-y-5 px-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : grouped.length === 0 ? (
          <EmptyState tipo={tipo} onAdd={() => setShowForm(true)} />
        ) : (
          grouped.map(([data, arr]) => (
            <div key={data}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {fmtDate(data)}
              </p>
              <div className="space-y-2">
                {arr.map((i) => (
                  <article
                    key={i.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accentBg} ${accentColor}`}>
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.categoria}</p>
                      {i.observacao && (
                        <p className="truncate text-xs text-muted-foreground">{i.observacao}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${accentColor}`}>
                        {tipo === "receita" ? "+" : "-"} {BRL(Number(i.valor))}
                      </p>
                      <div className="mt-1 flex justify-end gap-1">
                        <button
                          aria-label="Editar"
                          onClick={() => {
                            setEditing(i);
                            setShowForm(true);
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-muted-foreground transition hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label="Excluir"
                          onClick={() => handleDelete(i)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-muted-foreground transition hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <button
        onClick={() => {
          setEditing(null);
          setShowForm(true);
        }}
        aria-label="Adicionar"
        className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full text-primary-foreground"
        style={{ background: accentVar, boxShadow: "var(--shadow-pop)" }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {showForm && (
        <LancamentoForm
          tipo={tipo}
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
        />
      )}

      <BottomNav active="movimentos" fabTo={tipo === "receita" ? "/receitas" : "/despesas"} />
    </div>
  );
}

function EmptyState({ tipo, onAdd }: { tipo: Tipo; onAdd: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Receipt className="h-6 w-6" />
      </div>
      <p className="mt-3 text-sm font-semibold">Nenhuma {tipo} registrada</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Adicione sua primeira {tipo} para acompanhar.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar
      </button>
    </div>
  );
}

const TAX_RATE_KEY = "lr_tax_rate";
const TAX_AUTO_KEY = "lr_tax_auto";

function LancamentoForm({
  tipo,
  initial,
  onClose,
  onSaved,
}: {
  tipo: Tipo;
  initial: Lancamento | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const table = tipo === "receita" ? "receitas" : "despesas";
  const [valor, setValor] = useState(initial ? String(initial.valor) : "");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "");
  const [data, setData] = useState(initial?.data ?? todayIso());
  const [observacao, setObservacao] = useState(initial?.observacao ?? "");
  const [saving, setSaving] = useState(false);

  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [produtoId, setProdutoId] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("1");
  const produtoSel = useMemo(
    () => produtos.find((p) => p.id === produtoId) || null,
    [produtos, produtoId],
  );

  useEffect(() => {
    if (tipo !== "receita" || initial) return;
    (async () => {
      const { data } = await supabase
        .from("produtos")
        .select("id,nome,preco_venda,quantidade")
        .order("nome");
      setProdutos((data as ProdutoOpt[]) ?? []);
    })();
  }, [tipo, initial]);

  // Quando seleciona produto/quantidade, calcula valor automaticamente
  useEffect(() => {
    if (!produtoSel) return;
    const qtd = Math.max(1, Number(quantidade.replace(",", ".")) || 0);
    const total = +(qtd * Number(produtoSel.preco_venda || 0)).toFixed(2);
    setValor(String(total).replace(".", ","));
    if (!categoria) setCategoria("Venda");
  }, [produtoSel, quantidade]);

  const [taxRate, setTaxRate] = useState<number>(() => {
    if (typeof window === "undefined") return 6;
    const v = Number(localStorage.getItem(TAX_RATE_KEY));
    return Number.isFinite(v) && v > 0 ? v : 6;
  });
  const [taxAuto, setTaxAuto] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(TAX_AUTO_KEY) !== "0";
  });

  const valorNum = Number((valor || "0").replace(",", ".")) || 0;
  const taxValor = +(valorNum * (taxRate / 100)).toFixed(2);
  const liquido = +(valorNum - taxValor).toFixed(2);

  function persistTax(rate: number, auto: boolean) {
    try {
      localStorage.setItem(TAX_RATE_KEY, String(rate));
      localStorage.setItem(TAX_AUTO_KEY, auto ? "1" : "0");
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(valor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Informe um valor válido");
    if (!categoria.trim()) return toast.error("Escolha uma categoria");

    const qtdVenda = produtoSel
      ? Math.max(1, Math.floor(Number(quantidade.replace(",", ".")) || 0))
      : 0;
    if (produtoSel && qtdVenda <= 0) return toast.error("Quantidade inválida");

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user!.id;
    const obsFinal =
      produtoSel && !observacao.trim()
        ? `Venda: ${qtdVenda}× ${produtoSel.nome}`
        : observacao.trim() || null;
    const payload = {
      valor: v,
      categoria: categoria.trim(),
      data,
      observacao: obsFinal,
      user_id: userId,
    };
    const { data: saved, error } = initial
      ? await supabase.from(table).update(payload).eq("id", initial.id).select("id").single()
      : await supabase.from(table).insert(payload).select("id").single();
    if (error) {
      setSaving(false);
      return toast.error("Erro ao salvar");
    }
    const savedId = (saved as { id: string } | null)?.id ?? initial?.id;

    // Baixa de estoque quando produto foi vinculado
    if (tipo === "receita" && !initial && produtoSel && qtdVenda > 0) {
      const { error: errMov } = await supabase.from("movimentacoes_estoque").insert({
        user_id: userId,
        produto_id: produtoSel.id,
        tipo: "saida",
        quantidade: qtdVenda,
        observacao: `Venda receita:${savedId}`,
      });
      if (errMov) {
        toast.warning("Receita salva, mas não foi possível dar baixa no estoque");
      } else if (qtdVenda > produtoSel.quantidade) {
        toast.warning(
          `Estoque insuficiente! Vendido ${qtdVenda}, havia ${produtoSel.quantidade}. Reponha urgente.`,
        );
      }
    }

    if (tipo === "receita" && !initial && taxAuto && taxValor > 0) {
      persistTax(taxRate, taxAuto);
      const { error: errImp } = await supabase.from("despesas").insert({
        valor: taxValor,
        categoria: "Imposto",
        data,
        observacao: `Imposto ${taxRate}% sobre receita de ${BRL(v)}`,
        user_id: userId,
      });
      if (errImp) toast.warning("Receita salva, mas não consegui lançar o imposto");
      else toast.success(`Receita + imposto de ${BRL(taxValor)} lançados`);
    } else {
      if (tipo === "receita") persistTax(taxRate, taxAuto);
      toast.success(initial ? "Atualizado" : "Adicionado");
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-3xl bg-card p-5 sm:rounded-3xl"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {initial ? "Editar" : "Nova"} {tipo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {tipo === "receita" && !initial && produtos.length > 0 && (
            <Field label="Produto vendido (opcional)">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <select
                  value={produtoId}
                  onChange={(e) => setProdutoId(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">— Venda avulsa —</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} · {BRL(Number(p.preco_venda))} · estoque {p.quantidade}
                    </option>
                  ))}
                </select>
              </div>
              {produtoSel && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Qtd</span>
                  <input
                    inputMode="numeric"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value.replace(/[^\d]/g, ""))}
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <span
                    className={`text-[11px] font-semibold ${
                      Number(quantidade) > produtoSel.quantidade
                        ? "text-danger"
                        : "text-muted-foreground"
                    }`}
                  >
                    {Number(quantidade) > produtoSel.quantidade
                      ? `Faltam ${Number(quantidade) - produtoSel.quantidade} no estoque`
                      : `${produtoSel.quantidade - Number(quantidade || 0)} restantes após venda`}
                  </span>
                </div>
              )}
            </Field>
          )}

          <Field label="Valor">
            <input
              autoFocus
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-accent"
            />
          </Field>


          {tipo === "receita" && (
            <div className="rounded-2xl border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Imposto estimado
                </span>
                <div className="flex items-center gap-1">
                  <input
                    inputMode="decimal"
                    value={String(taxRate)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(",", "."));
                      if (Number.isFinite(n) && n >= 0 && n <= 100) setTaxRate(n);
                    }}
                    className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-right text-xs outline-none focus:border-accent"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-card p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Imposto
                  </p>
                  <p className="mt-0.5 font-bold text-danger">{BRL(taxValor)}</p>
                </div>
                <div className="rounded-lg bg-card p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Líquido
                  </p>
                  <p className="mt-0.5 font-bold text-success">{BRL(liquido)}</p>
                </div>
              </div>
              {!initial && (
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={taxAuto}
                    onChange={(e) => setTaxAuto(e.target.checked)}
                    className="h-4 w-4 accent-current"
                  />
                  Lançar imposto automaticamente como despesa
                </label>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Sugestão Simples Nacional: 6% comércio · 6% serviços iniciais. Ajuste conforme seu regime.
              </p>
            </div>
          )}

          <Field label="Categoria">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGESTOES[tipo].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCategoria(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    categoria === s
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ou digite uma categoria"
              maxLength={60}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>

          <Field label="Data">
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>

          <Field label="Observação (opcional)">
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              maxLength={240}
              placeholder="Ex: cliente João, NF 123..."
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-border bg-card py-3 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            style={{ background: "var(--gradient-hero)" }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
