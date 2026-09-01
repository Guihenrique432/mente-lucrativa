import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Target, User, Loader2, ArrowRight, Briefcase, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { MODELOS, type ModeloPerfil } from "@/lib/perfil-financeiro";

/**
 * Onboarding inteligente: nome → como trabalha → profissão →
 * características do negócio → meta de lucro.
 * Nada é assumido: o que o usuário não informar fica em branco.
 */
export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");
  const [modelo, setModelo] = useState<ModeloPerfil | null>(null);
  const [profissao, setProfissao] = useState("");
  const [temEstoque, setTemEstoque] = useState(false);
  const [temContratos, setTemContratos] = useState(false);
  const [atendeClientes, setAtendeClientes] = useState(false);
  const [funcionarios, setFuncionarios] = useState("0");
  const [meta, setMeta] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const TOTAL = 5;

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      setUserId(u.user.id);

      const [{ data: prof }, { data: m }, { data: pf }] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", u.user.id).maybeSingle(),
        supabase.from("metas").select("id").limit(1).maybeSingle(),
        supabase.from("perfil_financeiro").select("onboarding_concluido").eq("user_id", u.user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      const nomeAtual = (prof?.nome ?? "").trim();
      const hasMeta = !!m?.id;
      const perfilOk = !!pf?.onboarding_concluido;
      const dismissed = typeof window !== "undefined" && localStorage.getItem("onboarding_dismissed") === "1";

      if ((!nomeAtual || !hasMeta || !perfilOk) && !dismissed) {
        setNome(nomeAtual);
        setOpen(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  function escolherModelo(v: ModeloPerfil) {
    setModelo(v);
    const d = MODELOS.find((m) => m.value === v)?.defaults ?? {};
    if (d.tem_estoque !== undefined) setTemEstoque(d.tem_estoque);
    if (d.tem_contratos !== undefined) setTemContratos(d.tem_contratos);
    if (d.atende_clientes !== undefined) setAtendeClientes(d.atende_clientes);
    setStep(2);
  }

  async function handleFinish() {
    if (!userId) return;
    setSaving(true);
    try {
      const cleanNome = nome.trim();
      const cleanMeta = Number(meta.replace(/\./g, "").replace(",", "."));
      if (cleanNome.length >= 2) {
        await supabase.from("profiles").update({ nome: cleanNome }).eq("id", userId);
      }
      await supabase.from("perfil_financeiro").upsert(
        {
          user_id: userId,
          modelo: modelo ?? "outro",
          profissao: profissao.trim() || null,
          atividade: profissao.trim() || null,
          tem_estoque: temEstoque,
          tem_contratos: temContratos,
          atende_clientes: atendeClientes,
          funcionarios: Math.max(0, Number(funcionarios) || 0),
          recorrencia_receita:
            MODELOS.find((m) => m.value === modelo)?.defaults.recorrencia_receita ?? "variavel",
          onboarding_concluido: true,
        },
        { onConflict: "user_id" },
      );
      if (!Number.isNaN(cleanMeta) && cleanMeta > 0) {
        await supabase.from("metas").insert({ user_id: userId, meta_lucro: cleanMeta });
      }
      localStorage.setItem("onboarding_dismissed", "1");
      toast.success("Pronto! Agora o app entende como você trabalha 🚀");
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error("Não deu certo agora. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    localStorage.setItem("onboarding_dismissed", "1");
    setOpen(false);
  }

  if (!open) return null;

  const titulos = [
    "Bem-vindo ao Lucro Real 💙",
    "Como você trabalha?",
    "Qual é sua profissão ou atividade?",
    "Como funciona seu negócio?",
    "Qual é a sua meta de lucro?",
  ];
  const subtitulos = [
    "Vamos configurar rapidinho pra você começar a lucrar mais.",
    "Isso define o que aparece no seu painel e como a Sofia analisa seus números.",
    "Escreva do seu jeito — pode ser qualquer profissão.",
    "Só o essencial. Dá pra mudar depois em Perfil.",
    "Defina quanto você quer lucrar por mês. Dá pra mudar depois.",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 pt-10 animate-in fade-in">
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card animate-in slide-in-from-bottom-6"
        style={{ boxShadow: "var(--shadow-hero)" }}
      >
        <div
          className="relative px-6 pt-6 pb-5 text-primary-foreground"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 backdrop-blur">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Passo {step + 1} de {TOTAL}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-bold">{titulos[step]}</h2>
          <p className="mt-1 text-xs opacity-85">{subtitulos[step]}</p>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-6">
          {step === 0 && (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Como devemos te chamar?
              </span>
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome ou apelido"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          )}

          {step === 1 && (
            <div className="grid gap-2">
              {MODELOS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => escolherModelo(m.value)}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    modelo === m.value
                      ? "border-accent bg-accent/5"
                      : "border-border bg-background hover:border-accent/60"
                  }`}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{m.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{m.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" /> Profissão ou atividade
              </span>
              <input
                autoFocus
                value={profissao}
                onChange={(e) => setProfissao(e.target.value)}
                placeholder="Ex: Lash designer, arquiteto, loja de roupas..."
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Escreva livremente. A Sofia usa isso para analisar do jeito certo.
              </p>
            </label>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Toggle label="Trabalho com estoque / mercadoria" value={temEstoque} onChange={setTemEstoque} />
              <Toggle label="Trabalho com contratos" value={temContratos} onChange={setTemContratos} />
              <Toggle label="Atendo clientes um a um" value={atendeClientes} onChange={setAtendeClientes} />
              <label className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Settings2 className="h-4 w-4 text-muted-foreground" /> Funcionários
                </span>
                <input
                  inputMode="numeric"
                  value={funcionarios}
                  onChange={(e) => setFuncionarios(e.target.value.replace(/\D/g, ""))}
                  className="w-16 rounded-xl border border-border bg-card px-3 py-1.5 text-right text-sm outline-none focus:border-accent"
                />
              </label>
            </div>
          )}

          {step === 4 && (
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Target className="h-3.5 w-3.5" /> Meta de lucro mensal (R$)
              </span>
              <input
                autoFocus
                inputMode="decimal"
                value={meta}
                onChange={(e) => setMeta(e.target.value.replace(/[^\d,.]/g, ""))}
                placeholder="Ex: 5000"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Sem pressão — você pode pular e definir depois em Metas.
              </p>
            </label>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={step === 0 ? handleSkip : () => setStep((s) => Math.max(0, s - 1))}
              className="flex-1 rounded-2xl border border-border bg-background py-3 text-sm font-semibold text-muted-foreground transition hover:bg-secondary"
            >
              {step === 0 ? "Pular" : "Voltar"}
            </button>
            {step < TOTAL - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && nome.trim().length < 2) || (step === 1 && !modelo)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
                style={{ background: "var(--gradient-hero)" }}
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
                style={{ background: "var(--gradient-hero)" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
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
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
        value ? "border-accent bg-accent/5 text-foreground" : "border-border bg-background text-muted-foreground"
      }`}
    >
      {label}
      <span
        className={`relative h-5 w-9 rounded-full transition ${value ? "bg-accent" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-card transition-all ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
