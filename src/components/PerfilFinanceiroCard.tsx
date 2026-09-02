import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, ChevronDown, Loader2, Save } from "lucide-react";
import {
  DESPESAS_COMUNS,
  FORMAS_RECEBIMENTO,
  MODELOS,
  RECORRENCIAS,
  fluxoFinanceiro,
  modeloLabel,
  perfilVazio,
  type ModeloPerfil,
  type PerfilFinanceiro,
} from "@/lib/perfil-financeiro";

/** Editar meu perfil financeiro — nunca apaga histórico, só adapta a leitura dos dados. */
export function PerfilFinanceiroCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<PerfilFinanceiro | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      const { data } = await supabase
        .from("perfil_financeiro")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (cancelled) return;
      setP((data as PerfilFinanceiro) ?? perfilVazio(u.user.id));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof PerfilFinanceiro>(k: K, v: PerfilFinanceiro[K]) =>
    setP((old) => (old ? { ...old, [k]: v } : old));

  async function salvar() {
    if (!p) return;
    setSaving(true);
    const { error } = await supabase.from("perfil_financeiro").upsert(
      { ...p, onboarding_concluido: true },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) return toast.error("Não consegui salvar agora.");
    toast.success("Perfil financeiro atualizado 💙");
  }

  if (loading || !p) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Carregando perfil financeiro...
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary-foreground"
          style={{ background: "var(--gradient-hero)" }}
        >
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Meu perfil financeiro</p>
          <p className="truncate text-xs text-muted-foreground">
            {p.profissao ? `${p.profissao} · ` : ""}
            {modeloLabel(p.modelo)}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <p className="rounded-xl bg-surface px-3 py-2 text-[11px] text-muted-foreground">
            Fluxo do seu dinheiro: {fluxoFinanceiro(p.modelo)}
          </p>

          <Field label="Como você trabalha?">
            <select
              value={p.modelo}
              onChange={(e) => set("modelo", e.target.value as ModeloPerfil)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {MODELOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Profissão ou atividade">
            <input
              value={p.profissao ?? ""}
              onChange={(e) => {
                set("profissao", e.target.value);
                set("atividade", e.target.value);
              }}
              placeholder="Ex: Lash designer, arquiteto, loja de roupas..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>

          <Field label="Como você costuma receber?">
            <select
              value={p.forma_recebimento ?? ""}
              onChange={(e) => set("forma_recebimento", e.target.value || null)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="">Não informado</option>
              {FORMAS_RECEBIMENTO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Suas receitas são...">
            <select
              value={p.recorrencia_receita}
              onChange={(e) => set("recorrencia_receita", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              {RECORRENCIAS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2">
            <Switch label="Trabalho com estoque" value={p.tem_estoque} onChange={(v) => set("tem_estoque", v)} />
            <Switch label="Trabalho com contratos" value={p.tem_contratos} onChange={(v) => set("tem_contratos", v)} />
            <Switch label="Atendo clientes um a um" value={p.atende_clientes} onChange={(v) => set("atende_clientes", v)} />
            <Switch
              label="Separar pessoal e empresa"
              value={p.separa_pessoal_empresa}
              onChange={(v) => set("separa_pessoal_empresa", v)}
            />
          </div>

          <Field label="Funcionários">
            <input
              inputMode="numeric"
              value={String(p.funcionarios)}
              onChange={(e) => set("funcionarios", Number(e.target.value.replace(/\D/g, "")) || 0)}
              className="w-24 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>

          <Field label="Principais tipos de despesa">
            <div className="flex flex-wrap gap-2">
              {DESPESAS_COMUNS.map((d) => {
                const on = p.principais_despesas.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      set(
                        "principais_despesas",
                        on ? p.principais_despesas.filter((x) => x !== d) : [...p.principais_despesas, d],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      on
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Algo mais que a Sofia deveria saber?">
            <textarea
              value={p.observacoes ?? ""}
              onChange={(e) => set("observacoes", e.target.value || null)}
              rows={3}
              placeholder="Ex: atendo em casa, tenho aluguel de sala, vendo por encomenda..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>

          <button
            onClick={salvar}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            style={{ background: "var(--gradient-hero)" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar perfil financeiro
          </button>
          <p className="text-[11px] text-muted-foreground">
            Mudar o perfil adapta o painel e a análise da Sofia. Seu histórico financeiro continua intacto.
          </p>
        </div>
      )}
    </section>
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

function Switch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
        value ? "border-accent bg-accent/5 text-foreground" : "border-border bg-background text-muted-foreground"
      }`}
    >
      {label}
      <span className={`relative h-5 w-9 rounded-full transition ${value ? "bg-accent" : "bg-muted"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-card transition-all ${value ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
