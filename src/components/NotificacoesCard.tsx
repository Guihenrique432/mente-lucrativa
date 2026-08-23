import { useEffect, useState } from "react";
import { Bell, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ativarNotificacoes,
  desativarNotificacoes,
  notificacoesAtivas,
  pushSuportado,
} from "@/lib/push";

const MAX_HORARIOS = 5;
const PADRAO = ["21:30"];

function normalizar(lista: string[]) {
  return [...new Set(lista.filter((h) => /^\d{2}:\d{2}$/.test(h)))].sort();
}

export function NotificacoesCard() {
  const [ativo, setAtivo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [suportado, setSuportado] = useState(true);
  const [horarios, setHorarios] = useState<string[]>(PADRAO);
  const [novoHorario, setNovoHorario] = useState("09:00");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const ok = pushSuportado();
      const estado = ok ? await notificacoesAtivas() : false;
      const { data: userData } = await supabase.auth.getUser();
      let lista = PADRAO;
      if (userData.user) {
        const { data: pref } = await supabase
          .from("preferencias_notificacao")
          .select("horarios")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (pref?.horarios?.length) lista = normalizar(pref.horarios);
      }
      if (!vivo) return;
      setSuportado(ok);
      setAtivo(estado);
      setHorarios(lista);
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function salvarHorarios(lista: string[]) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setSalvando(true);
    const { error } = await supabase
      .from("preferencias_notificacao")
      .upsert({ user_id: userData.user.id, horarios: lista }, { onConflict: "user_id" });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar os horários.");
      return;
    }
    setHorarios(lista);
    toast.success("Horários salvos!");
  }

  function adicionar() {
    if (!/^\d{2}:\d{2}$/.test(novoHorario)) return;
    if (horarios.includes(novoHorario)) {
      toast.info("Esse horário já está na lista.");
      return;
    }
    if (horarios.length >= MAX_HORARIOS) {
      toast.error(`Máximo de ${MAX_HORARIOS} avisos por dia.`);
      return;
    }
    salvarHorarios(normalizar([...horarios, novoHorario]));
  }

  function remover(h: string) {
    if (horarios.length === 1) {
      toast.error("Deixe pelo menos um horário ou desative o lembrete.");
      return;
    }
    salvarHorarios(horarios.filter((x) => x !== h));
  }

  async function alternar() {
    setCarregando(true);
    try {
      if (ativo) {
        await desativarNotificacoes();
        setAtivo(false);
        toast.success("Lembretes desativados.");
      } else {
        const res = await ativarNotificacoes();
        if (!res.ok) {
          toast.error(res.erro ?? "Não foi possível ativar as notificações.");
        } else {
          await salvarHorarios(horarios);
          setAtivo(true);
          toast.success("Pronto! Você receberá o lembrete nos horários escolhidos.");
        }
      }
    } finally {
      setCarregando(false);
    }
  }

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
            <p className="text-sm font-bold text-foreground">Lembretes do dia</p>
            <p className="text-xs text-muted-foreground">
              {carregando
                ? "Carregando..."
                : ativo
                  ? `${horarios.length} aviso${horarios.length > 1 ? "s" : ""} por dia neste aparelho`
                  : "Desativado"}
            </p>
          </div>
        </div>
        {!carregando && suportado && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {ativo ? "ON" : "OFF"}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        “Vamos mostrar seu lucro real de hoje e quanto você gastou?” — escolha a que horas e quantas
        vezes por dia você quer receber esse aviso.
      </p>

      {!carregando && (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Meus horários
          </p>
          <div className="flex flex-wrap gap-2">
            {horarios.map((h) => (
              <span
                key={h}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground"
              >
                {h}
                <button
                  type="button"
                  onClick={() => remover(h)}
                  aria-label={`Remover horário ${h}`}
                  className="text-muted-foreground transition hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>

          {horarios.length < MAX_HORARIOS && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={adicionar}
                disabled={salvando}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar
              </button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Até {MAX_HORARIOS} avisos por dia, no horário de Brasília.
          </p>
        </div>
      )}

      {suportado ? (
        <button
          type="button"
          onClick={alternar}
          disabled={carregando}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
            ativo
              ? "border border-border bg-muted text-foreground"
              : "bg-accent text-accent-foreground hover:opacity-90"
          }`}
        >
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          {ativo ? "Desativar lembretes" : "Ativar lembretes"}
        </button>
      ) : (
        <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Este navegador não permite notificações. No iPhone, adicione o app à tela de início para
          receber os lembretes.
        </p>
      )}
    </section>
  );
}
