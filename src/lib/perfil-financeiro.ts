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
  /* ---- contexto fiscal (nunca inferido, só informado pelo usuário) ---- */
  regime_tributario: RegimeTributario;
  anexo_simples: string | null;
  cnae: string | null;
  natureza_juridica: string | null;
  tipos_receita: string[];
  municipio: string | null;
  uf: string | null;
  aliquota_iss: number | null;
  tem_folha: boolean;
  folha_mensal: number;
  pro_labore: number;
  possui_creditos: boolean;
  creditos_deducoes: string | null;
  beneficios_fiscais: string | null;
  faturamento_12m: number | null;
  periodo_apuracao: string;
  tem_contador: boolean;
};

export type RegimeTributario =
  | "nao_informado"
  | "mei"
  | "simples"
  | "presumido"
  | "real"
  | "pessoa_fisica"
  | "isento";

export const REGIMES: { value: RegimeTributario; label: string; desc: string }[] = [
  { value: "nao_informado", label: "Não sei / não informado", desc: "A Sofia não vai estimar tributos" },
  { value: "mei", label: "MEI", desc: "Microempreendedor individual (DAS fixo)" },
  { value: "simples", label: "Simples Nacional", desc: "Recolhimento unificado por anexo" },
  { value: "presumido", label: "Lucro Presumido", desc: "Base de cálculo presumida por atividade" },
  { value: "real", label: "Lucro Real", desc: "Tributos sobre o lucro efetivo" },
  { value: "pessoa_fisica", label: "Pessoa física / autônomo sem CNPJ", desc: "Carnê-leão, INSS, ISS autônomo" },
  { value: "isento", label: "Não tributado / isento", desc: "Sem tributação sobre a atividade" },
];

export const ANEXOS_SIMPLES = [
  "Anexo I – Comércio",
  "Anexo II – Indústria",
  "Anexo III – Serviços",
  "Anexo IV – Serviços (com CPP à parte)",
  "Anexo V – Serviços",
  "Não sei",
];

export const TIPOS_RECEITA = [
  "Venda de mercadoria",
  "Prestação de serviço",
  "Serviço com material aplicado",
  "Contrato recorrente / mensalidade",
  "Comissão / intermediação",
  "Aluguel",
  "Salário (CLT)",
  "Venda para fora do município",
  "Venda para fora do estado",
  "Exportação",
];

export const PERIODOS_APURACAO = ["mensal", "trimestral", "anual"];

export function regimeLabel(r: string) {
  return REGIMES.find((x) => x.value === r)?.label ?? "Não informado";
}

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
  regime_tributario: "nao_informado",
  anexo_simples: null,
  cnae: null,
  natureza_juridica: null,
  tipos_receita: [],
  municipio: null,
  uf: null,
  aliquota_iss: null,
  tem_folha: false,
  folha_mensal: 0,
  pro_labore: 0,
  possui_creditos: false,
  creditos_deducoes: null,
  beneficios_fiscais: null,
  faturamento_12m: null,
  periodo_apuracao: "mensal",
  tem_contador: false,
});

/**
 * Confiança FISCAL: depende só dos dados fiscais realmente informados.
 * Nunca deduz regime, alíquota ou enquadramento.
 */
export function confiancaFiscal(p: Partial<PerfilFinanceiro> | null) {
  const faltando: string[] = [];
  const regime = p?.regime_tributario ?? "nao_informado";
  if (!p) faltando.push("perfil financeiro não configurado");
  if (regime === "nao_informado") faltando.push("regime tributário");
  if (!p?.atividade && !p?.profissao) faltando.push("atividade econômica");
  if (!p?.cnae) faltando.push("CNAE");
  if (!p?.tipos_receita?.length) faltando.push("tipo de receita");
  if (!p?.municipio || !p?.uf) faltando.push("município/estado");
  if (regime === "simples" && !p?.anexo_simples) faltando.push("anexo do Simples Nacional");
  if (p?.tem_folha && !p?.folha_mensal) faltando.push("valor da folha de pagamento");
  if (regime === "simples" && p?.faturamento_12m == null) faltando.push("faturamento dos últimos 12 meses (define a faixa do Simples)");

  const criticoFaltando = regime === "nao_informado" || (!p?.atividade && !p?.profissao) || !p?.tipos_receita?.length;
  const nivel = criticoFaltando
    ? "🔴 Sem dados suficientes para análise fiscal confiável"
    : faltando.length
      ? "🟡 Faltam informações fiscais"
      : "🟢 Dados suficientes para uma análise fiscal preliminar";

  return { nivel, faltando };
}

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
