import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, FileSignature, Loader2, Trash2, X, AlertTriangle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos e Projetos — Lucro Real" },
      {
        name: "description",
        content:
          "Acompanhe valor contratado, valor recebido, valores a receber e inadimplência de cada contrato ou projeto.",
      },
      { property: "og:title", content: "Contratos e Projetos — Lucro Real" },
      {
        property: "og:description",
        content: "Veja quanto foi contratado, quanto já entrou no caixa e o que está atrasado.",
      },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/contratos" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/contratos" }],
  }),
  component: ContratosPage,
});

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const hoje = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;

type Contrato = {
  id: string;
  cliente: string;
  titulo: string;
  tipo: string;
  valor_contratado: number;
  custo_estimado: number;
  data_inicio: string;
  data_fim: string | null;
  situacao: string;
  observacao: string | null;
};

type Recebimento = {
  id: string;
  contrato_id: string;
  valor: number;
  data: string;
  vencimento: string | null;
};

function ContratosPage() {
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [novo, setNovo] = useState(false);
  const [receberEm, setReceberEm] = useState<Contrato | null>(null);
  const [excluir, setExcluir] = useState<Contrato | null>(null);

  async function carregar() {
    const [c, r] = await Promise.all([
      supabase
        .from("contratos")
        .select("id,cliente,titulo,tipo,valor_contratado,custo_estimado,data_inicio,data_fim,situacao,observacao")
        .order("created_at", { ascending: false }),
      supabase.from("contratos_recebimentos").select("id,contrato_id,valor,data,vencimento"),
    ]);
    setContratos((c.data as Contrato[]) ?? []);
    setRecebimentos((r.data as Recebimento[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const porContrato = useMemo(() => {
    const map = new Map<string, { recebido: number; atrasado: number }>();
    const hj = hoje();
    for (const c of contratos) {
      const recs = recebimentos.filter((x) => x.contrato_id === c.id);
      const recebido = recs.reduce((a, b) => a + Number(b.valor || 0), 0);
      const atrasado = recs
        .filter((x) => x.vencimento && x.vencimento < hj && !x.data)
        .reduce((a, b) => a + Number(b.valor || 0), 0);
      map.set(c.id, { recebido, atrasado });
    }
    return map;
  }, [contratos, recebimentos]);

  const totais = useMemo(() => {
    const ativos = contratos.filter((c) => c.situacao === "ativo");
    const contratado = contratos.reduce((a, b) => a + Number(b.valor_contratado || 0), 0);
    const recebido = recebimentos.reduce((a, b) => a + Number(b.valor || 0), 0);
    const custo = contratos.reduce((a, b) => a + Number(b.custo_estimado || 0), 0);
    const aReceber = Math.max(0, contratado - recebido);
    const hj = hoje();
    const inadimplencia = contratos.reduce((acc, c) => {
      if (!c.data_fim || c.data_fim >= hj) return acc;
      const rec = porContrato.get(c.id)?.recebido ?? 0;
      return acc + Math.max(0, Number(c.valor_contratado || 0) - rec);
    }, 0);
    const margem = contratado > 0 ? ((contratado - custo) / contratado) * 100 : 0;
    return { ativos: ativos.length, contratado, recebido, aReceber, inadimplencia, margem };
  }, [contratos, recebimentos, porContrato]);

  async function confirmarExclusao() {
    if (!excluir) return;
    const { error } = await supabase.from("contratos").delete().eq("id", excluir.id);
    if (error) toast.error("Não consegui excluir agora.");
    else {
      toast.success(`"${excluir.titulo || excluir.cliente}" excluído.`);
      setExcluir(null);
      carregar();
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-5 pt-12 pb-16 text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-semibold">Contratos e projetos</p>
          <button
            onClick={() => setNovo(true)}
            aria-label="Novo contrato"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/15"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-auto mt-6 max-w-md">
          <p className="text-xs opacity-80">Já recebido dos seus contratos</p>
          <p className="mt-1 text-3xl font-bold">{BRL(totais.recebido)}</p>
          <p className="mt-1 text-[11px] opacity-70">
            de {BRL(totais.contratado)} contratados — contrato assinado ainda não é dinheiro no caixa.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-md space-y-4 px-4">
        <h1 className="sr-only">Contratos e projetos</h1>

        <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4">
          <Info label="Contratos ativos" value={String(totais.ativos)} />
          <Info label="Falta receber" value={BRL(totais.aReceber)} />
          <Info label="Em atraso" value={BRL(totais.inadimplencia)} danger={totais.inadimplencia > 0} />
          <Info label="Margem prevista" value={totais.contratado > 0 ? `${totais.margem.toFixed(1)}%` : "—"} />
        </section>

        {totais.inadimplencia > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-danger">{BRL(totais.inadimplencia)}</span> de contratos já encerrados
              ainda não entraram no caixa. Vale cobrar esses clientes.
            </p>
          </div>
        )}

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
        ) : contratos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <FileSignature className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold text-foreground">Nenhum contrato ou projeto ainda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre o valor combinado e vá lançando o que o cliente já pagou.
            </p>
            <button
              onClick={() => setNovo(true)}
              className="mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              Cadastrar o primeiro
            </button>
          </div>
        ) : (
          contratos.map((c) => {
            const rec = porContrato.get(c.id)?.recebido ?? 0;
            const falta = Math.max(0, Number(c.valor_contratado || 0) - rec);
            const pct = c.valor_contratado > 0 ? Math.min(100, (rec / c.valor_contratado) * 100) : 0;
            const encerrado = !!c.data_fim && c.data_fim < hoje();
            return (
              <article key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{c.titulo || c.cliente}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.cliente} · {c.tipo === "projeto" ? "Projeto" : "Contrato"} ·{" "}
                      {c.situacao === "ativo" ? "Ativo" : c.situacao === "concluido" ? "Concluído" : "Cancelado"}
                    </p>
                  </div>
                  <button
                    onClick={() => setExcluir(c)}
                    aria-label={`Excluir ${c.titulo || c.cliente}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Info label="Contratado" value={BRL(Number(c.valor_contratado || 0))} small />
                  <Info label="Recebido" value={BRL(rec)} small />
                  <Info label="A receber" value={BRL(falta)} small danger={encerrado && falta > 0} />
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-hero)" }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {pct.toFixed(0)}% do valor combinado já entrou no caixa
                  {encerrado && falta > 0 ? " · contrato encerrado com valor em aberto" : ""}
                </p>

                <button
                  onClick={() => setReceberEm(c)}
                  className="mt-3 w-full rounded-xl border border-accent/40 bg-accent/10 py-2 text-xs font-semibold text-accent"
                >
                  Lançar recebimento
                </button>
              </article>
            );
          })
        )}
      </main>

      <BottomNav active="relatorios" />

      {novo && (
        <NovoContratoModal
          onClose={() => setNovo(false)}
          onSaved={() => {
            setNovo(false);
            carregar();
          }}
        />
      )}

      {receberEm && (
        <RecebimentoModal
          contrato={receberEm}
          onClose={() => setReceberEm(null)}
          onSaved={() => {
            setReceberEm(null);
            carregar();
          }}
        />
      )}

      {excluir && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-bold text-foreground">Excluir "{excluir.titulo || excluir.cliente}"?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Os recebimentos lançados neste contrato também serão apagados.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setExcluir(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="flex-1 rounded-xl bg-danger py-2.5 text-sm font-semibold text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  small,
  danger,
}: {
  label: string;
  value: string;
  small?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-bold ${small ? "text-xs" : "text-base"} ${danger ? "text-danger" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function NovoContratoModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [cliente, setCliente] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<"contrato" | "projeto">("contrato");
  const [valor, setValor] = useState("");
  const [custo, setCusto] = useState("");
  const [inicio, setInicio] = useState(hoje());
  const [fim, setFim] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente.trim()) {
      toast.error("Informe o cliente.");
      return;
    }
    setSalvando(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("contratos").insert({
      user_id: u.user.id,
      cliente: cliente.trim(),
      titulo: titulo.trim() || cliente.trim(),
      tipo,
      valor_contratado: num(valor),
      custo_estimado: num(custo),
      data_inicio: inicio,
      data_fim: fim || null,
    });
    setSalvando(false);
    if (error) toast.error("Não consegui salvar agora.");
    else {
      toast.success("Contrato cadastrado!");
      onSaved();
    }
  }

  return (
    <Modal title="Novo contrato ou projeto" onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <Campo label="Cliente" value={cliente} onChange={setCliente} placeholder="Ex.: Maria Souza" />
        <Campo label="Nome do contrato/projeto" value={titulo} onChange={setTitulo} placeholder="Ex.: Reforma sala" />
        <div>
          <span className="text-xs text-muted-foreground">Tipo</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["contrato", "projeto"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  tipo === t ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border text-muted-foreground"
                }`}
              >
                {t === "contrato" ? "Contrato" : "Projeto"}
              </button>
            ))}
          </div>
        </div>
        <Campo label="Valor combinado" value={valor} onChange={setValor} placeholder="5000,00" inputMode="decimal" />
        <Campo
          label="Custo estimado (opcional)"
          value={custo}
          onChange={setCusto}
          placeholder="1200,00"
          inputMode="decimal"
        />
        <Campo label="Início" value={inicio} onChange={setInicio} type="date" />
        <Campo label="Prazo final (opcional)" value={fim} onChange={setFim} type="date" />
        <button
          type="submit"
          disabled={salvando}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-hero)" }}
        >
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </button>
      </form>
    </Modal>
  );
}

function RecebimentoModal({
  contrato,
  onClose,
  onSaved,
}: {
  contrato: Contrato;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const v = num(valor);
    if (v <= 0) {
      toast.error("Informe o valor recebido.");
      return;
    }
    setSalvando(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("contratos_recebimentos").insert({
      user_id: u.user.id,
      contrato_id: contrato.id,
      valor: v,
      data,
      observacao: obs.trim() || null,
    });
    setSalvando(false);
    if (error) toast.error("Não consegui salvar agora.");
    else {
      toast.success("Recebimento lançado!");
      onSaved();
    }
  }

  return (
    <Modal title={`Recebimento — ${contrato.titulo || contrato.cliente}`} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <Campo label="Valor recebido" value={valor} onChange={setValor} placeholder="1000,00" inputMode="decimal" />
        <Campo label="Data" value={data} onChange={setData} type="date" />
        <Campo label="Observação (opcional)" value={obs} onChange={setObs} placeholder="Ex.: 1ª parcela" />
        <button
          type="submit"
          disabled={salvando}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-hero)" }}
        >
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Lançar
        </button>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "numeric" | "text";
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
