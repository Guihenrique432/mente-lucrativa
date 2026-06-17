import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Pencil, Trash2, X, Receipt, Search } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

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

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
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
                          onClick={() => handleDelete(i.id)}
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(valor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Informe um valor válido");
    if (!categoria.trim()) return toast.error("Escolha uma categoria");

    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      valor: v,
      categoria: categoria.trim(),
      data,
      observacao: observacao.trim() || null,
      user_id: u.user!.id,
    };
    const { error } = initial
      ? await supabase.from(table).update(payload).eq("id", initial.id)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar");
    toast.success(initial ? "Atualizado" : "Adicionado");
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
