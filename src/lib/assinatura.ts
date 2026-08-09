import { supabase } from "@/integrations/supabase/client";

export type PlanoId = "gratuito" | "start" | "pro" | "business";
export type PlanoStatus = "ativo" | "cancelado" | "vencido";
export type Ciclo = "mensal" | "anual";

export type Assinatura = {
  plano: PlanoId;
  status: PlanoStatus;
  expiraEm: string | null;
  canceladoEm: string | null;
  renovaAutomaticamente: boolean;
};

export const PLANO_NOMES: Record<PlanoId, string> = {
  gratuito: "Gratuito",
  start: "Start",
  pro: "Pro",
  business: "Business",
};

/** Preços em reais. O anual já é o valor total do ano (com desconto). */
export const PLANO_PRECOS: Record<
  Exclude<PlanoId, "gratuito">,
  { mensal: number; anual: number }
> = {
  start: { mensal: 19.9, anual: 199 },
  pro: { mensal: 49.9, anual: 499 },
  business: { mensal: 99.9, anual: 999 },
};

export function formatarPreco(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Quanto o anual economiza em relação a 12 meses do mensal. */
export function economiaAnual(plano: Exclude<PlanoId, "gratuito">) {
  const p = PLANO_PRECOS[plano];
  const cheio = p.mensal * 12;
  return { valor: cheio - p.anual, percentual: Math.round((1 - p.anual / cheio) * 100) };
}

export const STATUS_INFO: Record<
  PlanoStatus,
  { rotulo: string; classe: string; descricao: string }
> = {
  ativo: {
    rotulo: "Ativa",
    classe: "bg-success/15 text-success",
    descricao: "Sua assinatura está em dia.",
  },
  cancelado: {
    rotulo: "Cancelada",
    classe: "bg-amber-500/15 text-amber-600",
    descricao: "Cancelada — você continua com os benefícios até o fim do período pago.",
  },
  vencido: {
    rotulo: "Vencida",
    classe: "bg-danger/15 text-danger",
    descricao: "O período acabou e sua conta voltou para o plano Core.",
  },
};

export function formatarData(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function diasRestantes(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function normalizar(row: {
  plano: string | null;
  plano_status: string | null;
  plano_expira_em: string | null;
  plano_cancelado_em: string | null;
  plano_renova_automaticamente: boolean | null;
}): Assinatura {
  return {
    plano: (row.plano ?? "gratuito") as PlanoId,
    status: (row.plano_status ?? "ativo") as PlanoStatus,
    expiraEm: row.plano_expira_em,
    canceladoEm: row.plano_cancelado_em,
    renovaAutomaticamente: row.plano_renova_automaticamente ?? true,
  };
}

const CAMPOS =
  "plano,plano_status,plano_expira_em,plano_cancelado_em,plano_renova_automaticamente";

/**
 * Lê a assinatura. O gatilho no banco recalcula o status automaticamente,
 * então um "toque" no registro garante que planos vencidos já venham corrigidos.
 */
export async function carregarAssinatura(userId: string): Promise<Assinatura | null> {
  const { data: atual } = await supabase
    .from("profiles")
    .select(CAMPOS)
    .eq("id", userId)
    .maybeSingle();

  if (!atual) return null;

  const venceu =
    atual.plano !== "gratuito" &&
    !!atual.plano_expira_em &&
    new Date(atual.plano_expira_em).getTime() <= Date.now();

  if (venceu) {
    const { data: atualizado } = await supabase
      .from("profiles")
      .update({ plano_expira_em: atual.plano_expira_em })
      .eq("id", userId)
      .select(CAMPOS)
      .maybeSingle();
    if (atualizado) return normalizar(atualizado);
  }

  return normalizar(atual);
}

export async function ativarPlano(userId: string, plano: Exclude<PlanoId, "gratuito">) {
  const expira = new Date();
  expira.setMonth(expira.getMonth() + 1);
  const { data, error } = await supabase
    .from("profiles")
    .update({
      plano,
      plano_expira_em: expira.toISOString(),
      plano_cancelado_em: null,
      plano_renova_automaticamente: true,
    })
    .eq("id", userId)
    .select(CAMPOS)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizar(data) : null;
}

export async function cancelarAssinatura(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      plano_cancelado_em: new Date().toISOString(),
      plano_renova_automaticamente: false,
    })
    .eq("id", userId)
    .select(CAMPOS)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizar(data) : null;
}

export async function reativarAssinatura(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      plano_cancelado_em: null,
      plano_renova_automaticamente: true,
    })
    .eq("id", userId)
    .select(CAMPOS)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizar(data) : null;
}
