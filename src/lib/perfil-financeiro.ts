/**
 * Perfil financeiro do usuário: define QUEM está usando o app
 * e quais indicadores fazem sentido para ele.
 * Não altera nada existente — apenas adapta rótulos e KPIs.
 */

export type ModeloPerfil =
  | "autonomo"
  | "empresa_servicos"
  | "contratos"
  | "comercio"
  | "estoque"
  | "atendimento"
  | "alimentacao"
  | "clt"
  | "outro";

export type PerfilFinanceiro = {
  user_id: string;
  modelo: ModeloPerfil;
  profissao: string | null;
  atividade: string | null;
  forma_recebimento: string | null;
  tem_estoque: boolean;
  tem_contratos: boolean;
  atende_clientes: boolean;
  funcionarios: number;
  recorrencia_receita: string;
  principais_despesas: string[];
  separa_pessoal_empresa: boolean;
  observacoes: string | null;
  onboarding_concluido: boolean;
};

export const MODELOS: {
  value: ModeloPerfil;
  label: string;
  desc: string;
  emoji: string;
  /** características sugeridas ao escolher o modelo */
  defaults: Partial<PerfilFinanceiro>;
}[] = [
  {
    value: "autonomo",
    label: "Profissional autônomo / prestador de serviço",
    desc: "Você faz serviços e recebe por trabalho realizado",
    emoji: "🧰",
    defaults: { atende_clientes: true, tem_estoque: false, tem_contratos: false },
  },
  {
    value: "empresa_servicos",
    label: "Empresa de serviços",
    desc: "Equipe prestando serviços para clientes",
    emoji: "🏢",
    defaults: { atende_clientes: true, tem_estoque: false },
  },
  {
    value: "contratos",
    label: "Empresa que trabalha com contratos",
    desc: "Receita contratada e recebimentos ao longo do tempo",
    emoji: "📄",
    defaults: { tem_contratos: true, atende_clientes: true, recorrencia_receita: "recorrente" },
  },
  {
    value: "comercio",
    label: "Loja / comércio",
    desc: "Você compra e revende produtos",
    emoji: "🛍️",
    defaults: { tem_estoque: true },
  },
  {
    value: "estoque",
    label: "Empresa com estoque",
    desc: "Seu dinheiro fica investido em mercadoria",
    emoji: "📦",
    defaults: { tem_estoque: true },
  },
  {
    value: "atendimento",
    label: "Profissional de atendimento",
    desc: "Lash, cabelo, unhas, estética, saúde — atende por horário",
    emoji: "💅",
    defaults: { atende_clientes: true, tem_estoque: true },
  },
  {
    value: "alimentacao",
    label: "Restaurante / alimentação",
    desc: "Vendas diárias com insumos e estoque",
    emoji: "🍽️",
    defaults: { tem_estoque: true, atende_clientes: true },
  },
  {
    value: "clt",
    label: "Profissional CLT",
    desc: "Salário, despesas pessoais, reserva e metas",
    emoji: "💼",
    defaults: { recorrencia_receita: "fixa", tem_estoque: false, atende_clientes: false },
  },
  {
    value: "outro",
    label: "Outro tipo de trabalho",
    desc: "Conte para a Sofia como você trabalha",
    emoji: "✨",
    defaults: {},
  },
];

export const RECORRENCIAS = [
  { value: "fixa", label: "Fixa (mesmo valor todo mês)" },
  { value: "recorrente", label: "Recorrente (contratos/mensalidades)" },
  { value: "variavel", label: "Variável (muda a cada mês)" },
  { value: "sazonal", label: "Sazonal (depende da época)" },
];

export const FORMAS_RECEBIMENTO = ["Pix", "Dinheiro", "Cartão", "Boleto", "Transferência", "Salário", "Misto"];

export const DESPESAS_COMUNS = [
  "Materiais",
  "Fornecedores",
  "Aluguel",
  "Impostos",
  "Taxas de cartão",
  "Funcionários",
  "Marketing",
  "Transporte",
  "Contador",
  "Ferramentas/Software",
  "Despesas pessoais",
];

export const perfilVazio = (userId: string): PerfilFinanceiro => ({
  user_id: userId,
  modelo: "outro",
  profissao: null,
  atividade: null,
  forma_recebimento: null,
  tem_estoque: false,
  tem_contratos: false,
  atende_clientes: false,
  funcionarios: 0,
  recorrencia_receita: "variavel",
  principais_despesas: [],
  separa_pessoal_empresa: false,
  observacoes: null,
  onboarding_concluido: false,
});

export function modeloLabel(modelo: ModeloPerfil) {
  return MODELOS.find((m) => m.value === modelo)?.label ?? "Outro tipo de trabalho";
}

/** Como o dinheiro entra e sai, por modelo. */
export function fluxoFinanceiro(modelo: ModeloPerfil) {
  switch (modelo) {
    case "comercio":
    case "estoque":
    case "alimentacao":
      return "Compra de mercadoria → Estoque → Venda → Receita";
    case "contratos":
      return "Contrato → Receita recorrente → Custos → Margem";
    case "atendimento":
      return "Cliente → Atendimento → Pagamento → Comissão/material";
    case "clt":
      return "Salário → Despesas → Metas → Reserva";
    case "autonomo":
    case "empresa_servicos":
      return "Cliente → Serviço → Pagamento";
    default:
      return "Entradas → Saídas → Resultado";
  }
}

/** Rótulos adaptativos do dashboard. */
export function rotulos(modelo: ModeloPerfil) {
  switch (modelo) {
    case "clt":
      return {
        entrada: "Renda do mês",
        entradaSub: "Salário + rendas extras",
        saida: "Gastos do mês",
        resultado: "Sobrou este mês",
        volumeLabel: "Entradas registradas",
        ticketLabel: "Valor médio por entrada",
      };
    case "atendimento":
      return {
        entrada: "Faturamento do mês",
        entradaSub: "Atendimentos realizados",
        saida: "Custos e despesas",
        resultado: "Lucro real",
        volumeLabel: "Atendimentos registrados",
        ticketLabel: "Ticket médio por atendimento",
      };
    case "comercio":
    case "estoque":
    case "alimentacao":
      return {
        entrada: "Vendas do mês",
        entradaSub: "Faturamento bruto",
        saida: "Custos e despesas",
        resultado: "Lucro real",
        volumeLabel: "Vendas registradas",
        ticketLabel: "Ticket médio por venda",
      };
    case "contratos":
      return {
        entrada: "Recebido no mês",
        entradaSub: "Dinheiro que entrou de fato",
        saida: "Custos e despesas",
        resultado: "Margem do mês",
        volumeLabel: "Recebimentos registrados",
        ticketLabel: "Valor médio por recebimento",
      };
    default:
      return {
        entrada: "Faturamento do mês",
        entradaSub: "Serviços realizados",
        saida: "Custos e despesas",
        resultado: "Lucro real",
        volumeLabel: "Serviços registrados",
        ticketLabel: "Ticket médio por serviço",
      };
  }
}

/** Texto de premissa usado nas projeções de longo prazo. */
export function premissaProjecao(modelo: ModeloPerfil) {
  switch (modelo) {
    case "atendimento":
      return "Se você mantiver a média atual de atendimentos por mês";
    case "comercio":
    case "estoque":
    case "alimentacao":
      return "Se as vendas e o giro de estoque continuarem neste ritmo";
    case "contratos":
      return "Considerando os recebimentos registrados nos últimos meses";
    case "clt":
      return "Considerando sua renda e seu padrão atual de despesas";
    default:
      return "Se você mantiver a média atual de serviços e despesas";
  }
}

/**
 * Sugere um modelo a partir das categorias/observações lançadas.
 * Nunca aplica sozinho — só sugere para o usuário confirmar.
 */
export function sugerirModelo(textos: string[]): ModeloPerfil | null {
  const t = textos.join(" ").toLowerCase();
  const score: Partial<Record<ModeloPerfil, number>> = {};
  const add = (m: ModeloPerfil, n: number) => (score[m] = (score[m] ?? 0) + n);
  const hits = (re: RegExp) => (t.match(re) ?? []).length;

  add("atendimento", hits(/atendiment|cliente|material|comiss|manicure|cabelo|lash|est[ée]tica/g));
  add("comercio", hits(/mercadoria|fornecedor|estoque|revenda|venda de produto|loja/g));
  add("contratos", hits(/contrato|mensalidade|recorren|parcela do contrato|projeto/g));
  add("clt", hits(/sal[áa]rio|holerite|vale|13[ºo]|f[ée]rias/g));

  const ordenado = (Object.entries(score) as [ModeloPerfil, number][]).sort((a, b) => b[1] - a[1]);
  const [top, n] = ordenado[0] ?? ["outro", 0];
  return n >= 3 ? top : null;
}
