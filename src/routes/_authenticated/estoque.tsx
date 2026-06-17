import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Package,
  AlertTriangle,
  Search,
  Pencil,
  Trash2,
  X,
  TrendingUp,
  PackageX,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
} from "lucide-react";

type TipoMov = "entrada" | "saida";
type Movimentacao = {
  id: string;
  produto_id: string;
  tipo: TipoMov;
  quantidade: number;
  observacao: string | null;
  data: string;
};

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Lucro Real" },
      { name: "description", content: "Cadastre produtos, quantidades, custo e preço de venda. Receba alertas de estoque baixo." },
    ],
  }),
  component: EstoquePage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const LOW_STOCK_THRESHOLD = 5;

type Produto = {
  id: string;
  nome: string;
  quantidade: number;
  custo: number;
  preco_venda: number;
};

function EstoquePage() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Produto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [movProduto, setMovProduto] = useState<Produto | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("produtos")
      .select("id,nome,quantidade,custo,preco_venda")
      .order("nome", { ascending: true });
    if (error) toast.error("Erro ao carregar estoque");
    setProdutos((data as Produto[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const totalItens = produtos.reduce((a, p) => a + (p.quantidade || 0), 0);
    const valorCusto = produtos.reduce((a, p) => a + p.quantidade * Number(p.custo || 0), 0);
    const valorVenda = produtos.reduce((a, p) => a + p.quantidade * Number(p.preco_venda || 0), 0);
    const lucroPotencial = valorVenda - valorCusto;
    const baixos = produtos.filter((p) => p.quantidade > 0 && p.quantidade <= LOW_STOCK_THRESHOLD);
    const zerados = produtos.filter((p) => p.quantidade === 0);
    return { totalItens, valorCusto, valorVenda, lucroPotencial, baixos, zerados };
  }, [produtos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) => p.nome.toLowerCase().includes(q));
  }, [produtos, search]);

  async function handleDelete(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("produtos").delete().eq("id", p.id);
    if (error) {
      toast.error("Erro ao excluir produto");
      return;
    }
    toast.success("Produto excluído");
    load();
  }

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(p: Produto) {
    setEditing(p);
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header
        className="relative px-5 pt-12 pb-20 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Voltar"
            className="grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">Estoque</h1>
          <button
            onClick={openNew}
            aria-label="Novo produto"
            className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur-md transition hover:bg-white/20"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm opacity-80">Valor em estoque (custo)</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{BRL(stats.valorCusto)}</p>
          <p className="mt-1 text-xs opacity-70">
            {stats.totalItens} itens • lucro potencial{" "}
            <span className="font-semibold">{BRL(stats.lucroPotencial)}</span>
          </p>
        </div>
      </header>

      {(stats.zerados.length > 0 || stats.baixos.length > 0) && (
        <section className="-mt-12 px-5">
          <div className="space-y-2">
            {stats.zerados.length > 0 && (
              <AlertBanner
                tone="danger"
                icon={<PackageX className="h-4 w-4" />}
                title={`${stats.zerados.length} produto(s) zerados`}
                description={stats.zerados.slice(0, 3).map((p) => p.nome).join(", ")}
              />
            )}
            {stats.baixos.length > 0 && (
              <AlertBanner
                tone="warning"
                icon={<AlertTriangle className="h-4 w-4" />}
                title={`${stats.baixos.length} produto(s) com estoque baixo`}
                description={`Restam até ${LOW_STOCK_THRESHOLD} unidades: ${stats.baixos
                  .slice(0, 3)
                  .map((p) => `${p.nome} (${p.quantidade})`)
                  .join(", ")}`}
              />
            )}
          </div>
        </section>
      )}

      <section className="mt-5 px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none transition focus:border-accent"
          />
        </div>
      </section>

      <section className="mt-4 px-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando produtos…</p>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openNew} hasSearch={!!search} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((p) => (
              <ProdutoCard
                key={p.id}
                produto={p}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p)}
                onMovimentar={() => setMovProduto(p)}
              />
            ))}
          </ul>
        )}
      </section>

      {showForm && (
        <ProdutoForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {movProduto && (
        <MovimentacoesSheet
          produto={movProduto}
          onClose={() => setMovProduto(null)}
          onChanged={load}
        />
      )}

      <BottomNav active="estoque" />

    </div>
  );
}

function AlertBanner({
  tone,
  icon,
  title,
  description,
}: {
  tone: "danger" | "warning";
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const map = {
    danger: { bg: "bg-danger/10", text: "text-danger", border: "border-danger/20" },
    warning: { bg: "bg-warning/20", text: "text-warning-foreground", border: "border-warning/30" },
  }[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border ${map.border} ${map.bg} p-3`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${map.text}`}>{icon}</div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${map.text}`}>{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ProdutoCard({
  produto,
  onEdit,
  onDelete,
  onMovimentar,
}: {
  produto: Produto;
  onEdit: () => void;
  onDelete: () => void;
  onMovimentar: () => void;
}) {
  const lucroUnit = Number(produto.preco_venda || 0) - Number(produto.custo || 0);
  const margem =
    produto.preco_venda > 0 ? (lucroUnit / Number(produto.preco_venda)) * 100 : 0;

  const status =
    produto.quantidade === 0
      ? { label: "Sem estoque", cls: "bg-danger/10 text-danger" }
      : produto.quantidade <= LOW_STOCK_THRESHOLD
      ? { label: "Estoque baixo", cls: "bg-warning/20 text-warning-foreground" }
      : { label: "Em estoque", cls: "bg-success/15 text-success" };

  return (
    <li
      className="rounded-2xl border border-border bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{produto.nome}</h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{produto.quantidade} un.</span> em estoque • custo{" "}
            {BRL(Number(produto.custo))} • venda {BRL(Number(produto.preco_venda))}
          </p>
          {produto.preco_venda > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-success">
              <TrendingUp className="h-3 w-3" />
              Margem {margem.toFixed(0)}% • {BRL(lucroUnit)}/un.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label="Editar"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Excluir"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <button
        onClick={onMovimentar}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-foreground transition hover:bg-secondary/70"
      >
        <History className="h-3.5 w-3.5" />
        Movimentações
      </button>
    </li>
  );
}

function EmptyState({ onAdd, hasSearch }: { onAdd: () => void; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
        <Package className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold">Seu estoque está vazio</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Cadastre seu primeiro produto com quantidade, custo e preço de venda.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar produto
      </button>
    </div>
  );
}

function ProdutoForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Produto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [quantidade, setQuantidade] = useState<string>(
    initial ? String(initial.quantidade) : "0",
  );
  const [custo, setCusto] = useState<string>(initial ? String(initial.custo) : "0");
  const [precoVenda, setPrecoVenda] = useState<string>(
    initial ? String(initial.preco_venda) : "0",
  );
  const [saving, setSaving] = useState(false);

  const lucroUnit = Number(precoVenda || 0) - Number(custo || 0);
  const margem = Number(precoVenda) > 0 ? (lucroUnit / Number(precoVenda)) * 100 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      toast.error("Informe o nome do produto");
      return;
    }
    if (nomeTrim.length > 120) {
      toast.error("Nome muito longo (máx. 120 caracteres)");
      return;
    }
    const qt = Math.max(0, Math.floor(Number(quantidade) || 0));
    const ct = Math.max(0, Number(custo) || 0);
    const pv = Math.max(0, Number(precoVenda) || 0);

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }

    if (initial) {
      const { error } = await supabase
        .from("produtos")
        .update({ nome: nomeTrim, custo: ct, preco_venda: pv })
        .eq("id", initial.id);
      if (error) {
        toast.error("Erro ao salvar");
        setSaving(false);
        return;
      }
      toast.success("Produto atualizado");
    } else {
      const { error } = await supabase
        .from("produtos")
        .insert({
          user_id: user.id,
          nome: nomeTrim,
          quantidade: qt,
          custo: ct,
          preco_venda: pv,
        });
      if (error) {
        toast.error("Erro ao cadastrar");
        setSaving(false);
        return;
      }
      toast.success("Produto cadastrado");
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{initial ? "Editar produto" : "Novo produto"}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label="Nome do produto">
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Camiseta Básica"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent"
            />
          </Field>

          {initial ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">
                Estoque atual:{" "}
                <span className="font-semibold text-foreground">{initial.quantidade} un.</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Para alterar a quantidade, use <strong>Movimentações</strong> (entradas e saídas).
              </p>
            </div>
          ) : (
            <Field label="Quantidade inicial em estoque">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Custo (R$)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent"
              />
            </Field>
            <Field label="Preço de venda (R$)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-accent"
              />
            </Field>
          </div>

          {Number(precoVenda) > 0 && (
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">
                Lucro por unidade:{" "}
                <span className={`font-semibold ${lucroUnit >= 0 ? "text-success" : "text-danger"}`}>
                  {BRL(lucroUnit)}
                </span>{" "}
                • Margem <span className="font-semibold">{margem.toFixed(0)}%</span>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-60"
            style={{ background: "var(--gradient-hero)" }}
          >
            {saving ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar produto"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function MovimentacoesSheet({
  produto,
  onClose,
  onChanged,
}: {
  produto: Produto;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<TipoMov>("entrada");
  const [qt, setQt] = useState<string>("1");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [saldoAtual, setSaldoAtual] = useState<number>(produto.quantidade);

  async function load() {
    setLoading(true);
    const [movRes, prodRes] = await Promise.all([
      supabase
        .from("movimentacoes_estoque")
        .select("id,produto_id,tipo,quantidade,observacao,data")
        .eq("produto_id", produto.id)
        .order("data", { ascending: false })
        .limit(100),
      supabase.from("produtos").select("quantidade").eq("id", produto.id).single(),
    ]);
    if (movRes.error) toast.error("Erro ao carregar histórico");
    setMovs((movRes.data as Movimentacao[]) ?? []);
    if (prodRes.data) setSaldoAtual(Number(prodRes.data.quantidade) || 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto.id]);

  const totais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    for (const m of movs) {
      if (m.tipo === "entrada") entradas += m.quantidade;
      else saidas += m.quantidade;
    }
    return { entradas, saidas };
  }, [movs]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const quantidade = Math.floor(Number(qt) || 0);
    if (quantidade <= 0) {
      toast.error("Informe uma quantidade maior que zero");
      return;
    }
    if (tipo === "saida" && quantidade > saldoAtual) {
      toast.error(`Saída maior que o saldo atual (${saldoAtual} un.)`);
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("movimentacoes_estoque").insert({
      user_id: user.id,
      produto_id: produto.id,
      tipo,
      quantidade,
      observacao: obs.trim() ? obs.trim().slice(0, 240) : null,
    });
    if (error) {
      toast.error("Erro ao registrar movimentação");
      setSaving(false);
      return;
    }
    toast.success(tipo === "entrada" ? "Entrada registrada" : "Saída registrada");
    setQt("1");
    setObs("");
    setSaving(false);
    await load();
    onChanged();
  }

  async function handleRemove(m: Movimentacao) {
    if (!confirm("Excluir esta movimentação? O estoque será ajustado.")) return;
    const { error } = await supabase.from("movimentacoes_estoque").delete().eq("id", m.id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Movimentação excluída");
    await load();
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Movimentações
            </p>
            <h2 className="mt-0.5 truncate text-lg font-bold">{produto.nome}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5">
          <div className="rounded-xl bg-secondary p-3">
            <p className="text-[10px] font-medium uppercase text-muted-foreground">Saldo</p>
            <p className="mt-0.5 text-base font-bold">{saldoAtual}</p>
          </div>
          <div className="rounded-xl bg-success/10 p-3">
            <p className="text-[10px] font-medium uppercase text-success">Entradas</p>
            <p className="mt-0.5 text-base font-bold text-success">+{totais.entradas}</p>
          </div>
          <div className="rounded-xl bg-danger/10 p-3">
            <p className="text-[10px] font-medium uppercase text-danger">Saídas</p>
            <p className="mt-0.5 text-base font-bold text-danger">-{totais.saidas}</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="mx-5 mt-4 rounded-2xl border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo("entrada")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                tipo === "entrada"
                  ? "bg-success text-success-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" /> Entrada
            </button>
            <button
              type="button"
              onClick={() => setTipo("saida")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                tipo === "saida"
                  ? "bg-danger text-danger-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" /> Saída
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={qt}
              onChange={(e) => setQt(e.target.value)}
              placeholder="Qtd"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              maxLength={240}
              placeholder="Observação (opcional)"
              className="col-span-2 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-3 w-full rounded-full py-2.5 text-xs font-semibold text-primary-foreground transition disabled:opacity-60"
            style={{ background: "var(--gradient-hero)" }}
          >
            {saving ? "Registrando..." : "Registrar movimentação"}
          </button>
        </form>

        <div className="mt-4 flex-1 overflow-y-auto px-5 pb-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico
          </p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : movs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Nenhuma movimentação ainda. Registre a primeira acima.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {movs.map((m) => {
                const isEntrada = m.tipo === "entrada";
                return (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                        isEntrada ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      }`}
                    >
                      {isEntrada ? (
                        <ArrowDownCircle className="h-4 w-4" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {isEntrada ? "+" : "-"}
                          {m.quantidade} un.
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.data).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {m.observacao && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {m.observacao}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(m)}
                      aria-label="Excluir"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
