export type Periodo = "mes" | "mes_anterior" | "30d" | "ano" | "tudo";

export const PERIODO_LABELS: Record<Periodo, string> = {
  mes: "Este mês",
  mes_anterior: "Mês passado",
  "30d": "Últimos 30 dias",
  ano: "Este ano",
  tudo: "Tudo",
};

export const PERIODO_OPTIONS: Periodo[] = ["mes", "mes_anterior", "30d", "ano", "tudo"];

export function periodoRange(p: Periodo): { start?: string; end?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (p === "mes") {
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  }
  if (p === "mes_anterior") {
    return { start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) };
  }
  if (p === "30d") {
    const s = new Date();
    s.setDate(s.getDate() - 29);
    return { start: iso(s), end: iso(now) };
  }
  if (p === "ano") {
    return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
  }
  return {};
}

export function inPeriodo(dataIso: string, p: Periodo): boolean {
  const { start, end } = periodoRange(p);
  if (start && dataIso < start) return false;
  if (end && dataIso > end) return false;
  return true;
}
