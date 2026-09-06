import { useEffect, useState } from "react";
import { Bell, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ativarNotificacoes,
  desativarNotificacoes,
  notificacoesAtivas,
  pushSuportado,
} from "@/lib/push";
import {
  ASSUNTOS,
  DIAS,
  type AssuntoLembrete,
  assuntoInfo,
  resumoDias,
  textoLembrete,
} from "@/lib/lembretes";
import type { Tables } from "@/integrations/supabase/types";

type Lembrete = Tables<"lembretes">;

const TODOS_OS_DIAS = DIAS.map((d) => d.valor);

const formVazio = {
  horario: "21:30",
  dias: TODOS_OS_DIAS,
  assunto: "lucro" as AssuntoLembrete,
  mensagem: "",
};

export function NotificacoesCard() {
  const [pushAtivo, setPushAtivo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [suportado, setSuportado] = useState(true);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(formVazio);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const ok = pushSuportado();
      const estado = ok ? await notificacoesAtivas() : false;
      const { data: userData } = await supabase.auth.getUser();
      let lista: Lembrete[] = [];
      if (userData.user) {
        const { data } = await supabase
          .from("lembretes")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("horario");
        lista = data ?? [];
      }
      if (!vivo) return;
      setSuportado(ok);
      setPushAtivo(estado);
      setLembretes(lista);
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(formVazio);
    setFormAberto(true);
  }

  function abrirEdicao(l: Lembrete) {
    setEditandoId(l.id);
    setForm({
      horario: l.horario,
      dias: l.dias_semana.length ? [...l.dias_semana].sort() : TODOS_OS_DIAS,
      assunto: (l.assunto as AssuntoLembrete) ?? "lucro",
      mensagem: l.mensagem ?? "",
    });
    setFormAberto(true);
  }

  function alternarDia(dia: number) {
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia].sort(),
    }));
  }

  async function salvar() {
    if (!/^\d{2}:\d{2}$/.test(form.horario)) {
      toast.error("Escolha um horário válido.");
      return;
    }
    if (form.dias.length === 0) {
      toast.error("Escolha pelo menos um dia da semana.");
      return;
    }
    if (form.assunto === "personalizado" && !form.mensagem.trim()) {
      toast.error("Escreva o texto do seu aviso.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setSalvando(true);
    const payload = {
      horario: form.horario,
      dias_semana: form.dias,
      assunto: form.assunto,
      mensagem: form.mensagem.trim() || null,
      canal: "push",
    };
    const resposta = editandoId
      ? await supabase.from("lembretes").update(payload).eq("id", editandoId).select().single()
      : await supabase
          .from("lembretes")
          .insert({ ...payload, user_id: userData.user.id })
          .select()
          .single();
    setSalvando(false);
    if (resposta.error) {
      toast.error("Não foi possível salvar o aviso.");
      return;
    }
    const salvo = resposta.data;
    setLembretes((ls) =>
      (editandoId ? ls.map((l) => (l.id === editandoId ? salvo : l)) : [...ls, salvo]).sort(
        (a, b) => a.horario.localeCompare(b.horario),
      ),
    );
    setFormAberto(false);
    setEditandoId(null);
    toast.success(editandoId ? "Aviso atualizado!" : "Aviso criado!");
  }

  async function alternarAtivo(l: Lembrete) {
    const { error } = await supabase.from("lembretes").update({ ativo: !l.ativo }).eq("id", l.id);
    if (error) {
      toast.error("Não foi possível alterar o aviso.");
      return;
    }
    setLembretes((ls) => ls.map((x) => (x.id === l.id ? { ...x, ativo: !l.ativo } : x)));
  }

  async function remover(l: Lembrete) {
    const { error } = await supabase.from("lembretes").delete().eq("id", l.id);
    if (error) {
      toast.error("Não foi possível remover o aviso.");
      return;
    }
    setLembretes((ls) => ls.filter((x) => x.id !== l.id));
    toast.success("Aviso removido.");
  }

  async function alternarPush() {
    setCarregando(true);
    try {
      if (pushAtivo) {
        await desativarNotificacoes();
        setPushAtivo(false);
        toast.success("Avisos desativados neste aparelho.");
      } else {
        const res = await ativarNotificacoes();
        if (!res.ok) {
          toast.error(res.erro ?? "Não foi possível ativar as notificações.");
        } else {
          setPushAtivo(true);
          toast.success("Pronto! Você receberá seus avisos neste aparelho.");
        }
      }
    } finally {
      setCarregando(false);
    }
  }

  const ativos = lembretes.filter((l) => l.ativo).length;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Meus avisos</p>
            <p className="text-xs text-muted-foreground">
              {carregando
                ? "Carregando..."
                : pushAtivo
                  ? `${ativos} aviso${ativos === 1 ? "" : "s"} ativo${ativos === 1 ? "" : "s"} neste aparelho`
                  : "Desativado neste aparelho"}
            </p>
          </div>
        </div>
        {!carregando && suportado && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              pushAtivo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {pushAtivo ? "ON" : "OFF"}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Crie seus próprios avisos: escolha o assunto, escreva seu texto, defina o horário e os dias
        da semana. Os avisos chegam como notificação neste aparelho.
      </p>

      {!carregando && (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Avisos cadastrados
          </p>

          {lembretes.length === 0 && !formAberto && (
            <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              Nenhum aviso ainda. Crie o primeiro e escolha como quer ser lembrado.
            </p>
          )}

          {lembretes.map((l) => (
            <div
              key={l.id}
              className={`rounded-xl border border-border p-3 transition ${l.ativo ? "bg-background" : "bg-muted/50 opacity-70"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => abrirEdicao(l)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-bold text-foreground">
                    {l.horario} · {assuntoInfo(l.assunto).label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    “{textoLembrete(l.assunto, l.mensagem)}”
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {resumoDias(l.dias_semana)}
                  </p>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(l)}
                    aria-label="Editar aviso"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remover(l)}
                    aria-label="Remover aviso"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarAtivo(l)}
                    aria-label={l.ativo ? "Pausar aviso" : "Ativar aviso"}
                    className={`relative h-6 w-11 rounded-full transition ${l.ativo ? "bg-accent" : "bg-muted"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${l.ativo ? "left-[22px]" : "left-0.5"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {formAberto && (
            <div className="space-y-3 rounded-xl border border-accent/40 bg-background p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">
                  {editandoId ? "Editar aviso" : "Novo aviso"}
                </p>
                <button
                  type="button"
                  onClick={() => setFormAberto(false)}
                  aria-label="Fechar"
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Assunto
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ASSUNTOS.map((a) => (
                    <button
                      key={a.valor}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, assunto: a.valor }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        form.assunto === a.valor
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Texto do aviso
                </p>
                {form.assunto === "personalizado" ? (
                  <textarea
                    value={form.mensagem}
                    onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                    maxLength={140}
                    rows={2}
                    placeholder="Ex.: Conferir o caixa antes de fechar"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                ) : (
                  <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                    “{assuntoInfo(form.assunto).mensagem}” — você pode trocar escrevendo seu próprio
                    aviso em “Escrever meu aviso”.
                  </p>
                )}
              </div>

              <div className="flex items-end gap-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Horário
                  </p>
                  <input
                    type="time"
                    value={form.horario}
                    onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Dias da semana
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS.map((d) => (
                      <button
                        key={d.valor}
                        type="button"
                        onClick={() => alternarDia(d.valor)}
                        className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          form.dias.includes(d.valor)
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {d.curto}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Entrega: notificação neste aparelho, no horário de Brasília.
              </p>

              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                {editandoId ? "Salvar alterações" : "Criar aviso"}
              </button>
            </div>
          )}

          {!formAberto && (
            <button
              type="button"
              onClick={abrirNovo}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-accent hover:text-accent"
            >
              <Plus className="h-4 w-4" />
              Criar novo aviso
            </button>
          )}
        </div>
      )}

      {suportado ? (
        <button
          type="button"
          onClick={alternarPush}
          disabled={carregando}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
            pushAtivo
              ? "border border-border bg-muted text-foreground"
              : "bg-accent text-accent-foreground hover:opacity-90"
          }`}
        >
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {pushAtivo ? "Desativar avisos neste aparelho" : "Ativar avisos neste aparelho"}
        </button>
      ) : (
        <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Este navegador não permite notificações. No iPhone, adicione o app à tela de início para
          receber os avisos.
        </p>
      )}
    </section>
  );
}
