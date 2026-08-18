import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  ativarNotificacoes,
  desativarNotificacoes,
  notificacoesAtivas,
  pushSuportado,
} from "@/lib/push";

export function NotificacoesCard() {
  const [ativo, setAtivo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [suportado, setSuportado] = useState(true);

  useEffect(() => {
    let ativoNoEfeito = true;
    (async () => {
      const ok = pushSuportado();
      const estado = ok ? await notificacoesAtivas() : false;
      if (!ativoNoEfeito) return;
      setSuportado(ok);
      setAtivo(estado);
      setCarregando(false);
    })();
    return () => {
      ativoNoEfeito = false;
    };
  }, []);

  async function alternar() {
    setCarregando(true);
    try {
      if (ativo) {
        await desativarNotificacoes();
        setAtivo(false);
        toast.success("Lembrete diário desativado.");
      } else {
        const res = await ativarNotificacoes();
        if (!res.ok) {
          toast.error(res.erro ?? "Não foi possível ativar as notificações.");
        } else {
          setAtivo(true);
          toast.success("Pronto! Todo dia às 21:30 você recebe o lembrete.");
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
            <p className="text-sm font-bold text-foreground">Lembrete diário às 21:30</p>
            <p className="text-xs text-muted-foreground">
              {carregando ? "Carregando..." : ativo ? "Ativado neste aparelho" : "Desativado"}
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
        “Vamos mostrar seu lucro real de hoje e quanto você gastou?” — um toque para abrir o app e
        conferir o dia.
      </p>

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
          {ativo ? "Desativar lembrete" : "Ativar lembrete"}
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
