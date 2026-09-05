export type AssuntoLembrete = "lucro" | "despesas" | "estoque" | "meta" | "personalizado";

export const ASSUNTOS: {
  valor: AssuntoLembrete;
  label: string;
  mensagem: string;
  url: string;
}[] = [
  {
    valor: "lucro",
    label: "Lucro do dia",
    mensagem: "Vamos ver seu lucro real de hoje e quanto você gastou?",
    url: "/",
  },
  {
    valor: "despesas",
    label: "Lançar entradas e saídas",
    mensagem: "Já lançou as entradas e saídas de hoje?",
    url: "/financeiro",
  },
  {
    valor: "estoque",
    label: "Conferir estoque",
    mensagem: "Dá uma olhada no estoque: tem item acabando?",
    url: "/estoque",
  },
  {
    valor: "meta",
    label: "Acompanhar a meta",
    mensagem: "Como está sua meta de lucro deste mês?",
    url: "/metas",
  },
  {
    valor: "personalizado",
    label: "Escrever meu aviso",
    mensagem: "Hora de cuidar do seu negócio.",
    url: "/",
  },
];

export const DIAS = [
  { valor: 0, curto: "Dom" },
  { valor: 1, curto: "Seg" },
  { valor: 2, curto: "Ter" },
  { valor: 3, curto: "Qua" },
  { valor: 4, curto: "Qui" },
  { valor: 5, curto: "Sex" },
  { valor: 6, curto: "Sáb" },
];

export function assuntoInfo(assunto: string) {
  return ASSUNTOS.find((a) => a.valor === assunto) ?? ASSUNTOS[0]!;
}

export function textoLembrete(assunto: string, mensagem?: string | null) {
  const limpo = (mensagem ?? "").trim();
  return limpo || assuntoInfo(assunto).mensagem;
}

export function resumoDias(dias: number[]) {
  const set = [...new Set(dias)].sort();
  if (set.length === 7) return "Todos os dias";
  if (set.length === 5 && set.join() === "1,2,3,4,5") return "Dias de semana";
  if (set.length === 2 && set.join() === "0,6") return "Fins de semana";
  if (set.length === 0) return "Nenhum dia";
  return set.map((d) => DIAS[d]?.curto).join(", ");
}
