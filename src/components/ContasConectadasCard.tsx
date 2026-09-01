import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

type Prov = "apple" | "google";

const LABEL: Record<Prov, string> = { apple: "Apple", google: "Google" };

export function ContasConectadasCard() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<string[]>([]);
  const [busy, setBusy] = useState<Prov | null>(null);

  async function load() {
    const { data } = await supabase.auth.getUserIdentities();
    setProviders((data?.identities ?? []).map((i) => i.provider));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLink(provider: Prov) {
    setBusy(provider);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/perfil` },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("already") || msg.includes("exists")
          ? `Esta conta ${LABEL[provider]} já está vinculada a outro usuário.`
          : `Não foi possível vincular sua conta ${LABEL[provider]}.`,
      );
      setBusy(null);
    }
  }

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
          <Link2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Contas conectadas</p>
          <p className="text-xs text-muted-foreground">
            Entre com Apple ou Google usando o mesmo e-mail
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          (["apple", "google"] as Prov[]).map((p) => {
            const linked = providers.includes(p);
            return (
              <div
                key={p}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3"
              >
                <span className="text-sm font-semibold text-foreground">{LABEL[p]}</span>
                {linked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                    <Check className="h-3 w-3" />
                    Vinculada
                  </span>
                ) : (
                  <button
                    onClick={() => handleLink(p)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-accent transition hover:bg-secondary disabled:opacity-60"
                  >
                    {busy === p && <Loader2 className="h-3 w-3 animate-spin" />}
                    Vincular
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Ao entrar com Apple, use "Compartilhar meu e-mail" para que a conta seja reconhecida
        automaticamente. Com o e-mail privado da Apple, vincule aqui manualmente.
      </p>
    </section>
  );
}
