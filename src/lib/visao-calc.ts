// Cálculos determinísticos de projeção financeira.
// Puro, sem I/O — usado pelo servidor e pela UI.

export type FormaPagamento = "avista" | "parcelado";

export type EntradaSimulacao = {
  valor: number;
  forma: FormaPagamento;
  parcelas: number;
  data: string; // ISO yyyy-mm-dd
  finalidade?: string;
};

export type BaseFinanceira = {
  saldoAtual: number;
  receitaMediaMensal: number;
  despesaMediaMensal: number;
  poupancaMensal: number; // receita - despesa (média)
  mesesConsiderados: number;
  temDados: boolean;
  metaLucro: number;
  compromissosMensais: number; // parcelas/dívidas já registradas (estimativa)
};

export type Horizonte = {
  chave: string;
  label: string;
  dias: number;
};

export const HORIZONTES: Horizonte[] = [
  { chave: "hoje", label: "Hoje", dias: 0 },
  { chave: "7d", label: "Próximos 7 dias", dias: 7 },
  { chave: "30d", label: "Próximos 30 dias", dias: 30 },
  { chave: "3m", label: "Próximos 3 meses", dias: 90 },
  { chave: "6m", label: "Próximos 6 meses", dias: 180 },
  { chave: "12m", label: "Próximos 12 meses", dias: 365 },
  { chave: "longo", label: "Longo prazo (24 meses)", dias: 730 },
];

export type CenarioChave = "agora" | "parcelar" | "esperar" | "nao";

export type PontoProjecao = {
  horizonte: string;
  label: string;
  saldoSemCompra: number;
  saldoComCompra: number;
  diferenca: number;
};

export type Cenario = {
  chave: CenarioChave;
  nome: string;
  descricao: string;
  desembolsoImediato: number;
  parcelaMensal: number;
  mesesDeParcela: number;
  pontos: PontoProjecao[];
  saldoMinimo: number;
  mesesNegativo: number;
  atrasoMetaMeses: number | null;
};

export type ResultadoSimulacao = {
  base: BaseFinanceira;
  cenarios: Cenario[];
  hipoteses: string[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function projetar(
  base: BaseFinanceira,
  opts: { desembolsoImediato: number; parcelaMensal: number; mesesDeParcela: number; atrasoInicioMeses: number },
): { pontos: PontoProjecao[]; saldoMinimo: number; mesesNegativo: number } {
  const pontos: PontoProjecao[] = [];
  let saldoMinimo = Infinity;
  let mesesNegativo = 0;

  // varre mês a mês (24 meses) para achar mínimo e meses negativos
  for (let m = 0; m <= 24; m++) {
    const saldo = saldoEm(base, opts, m);
    if (saldo < saldoMinimo) saldoMinimo = saldo;
    if (saldo < 0) mesesNegativo++;
  }

  for (const h of HORIZONTES) {
    const meses = h.dias / 30;
    const sem = base.saldoAtual + base.poupancaMensal * meses;
    const com = saldoEm(base, opts, meses);
    pontos.push({
      horizonte: h.chave,
      label: h.label,
      saldoSemCompra: round2(sem),
      saldoComCompra: round2(com),
      diferenca: round2(com - sem),
    });
  }

  return { pontos, saldoMinimo: round2(saldoMinimo), mesesNegativo };
}

function saldoEm(
  base: BaseFinanceira,
  opts: { desembolsoImediato: number; parcelaMensal: number; mesesDeParcela: number; atrasoInicioMeses: number },
  meses: number,
): number {
  const inicio = opts.atrasoInicioMeses;
  let saldo = base.saldoAtual + base.poupancaMensal * meses;
  if (meses >= inicio) {
    saldo -= opts.desembolsoImediato;
    const pagas = Math.min(opts.mesesDeParcela, Math.floor(meses - inicio));
    saldo -= opts.parcelaMensal * Math.max(0, pagas);
  }
  return saldo;
}

function atrasoMeta(base: BaseFinanceira, custoTotal: number): number | null {
  if (base.metaLucro <= 0 || base.poupancaMensal <= 0 || custoTotal <= 0) return null;
  return round2(custoTotal / base.poupancaMensal);
}

export function simular(base: BaseFinanceira, entrada: EntradaSimulacao): ResultadoSimulacao {
  const valor = Math.max(0, entrada.valor);
  const parcelas = Math.max(1, Math.min(48, Math.round(entrada.parcelas || 1)));
  const parcelaMensal = round2(valor / parcelas);

  const cenarios: Cenario[] = [];

  cenarios.push({
    chave: "agora",
    nome: "Comprar à vista agora",
    descricao: "Todo o valor sai do caixa hoje.",
    desembolsoImediato: valor,
    parcelaMensal: 0,
    mesesDeParcela: 0,
    ...projetar(base, { desembolsoImediato: valor, parcelaMensal: 0, mesesDeParcela: 0, atrasoInicioMeses: 0 }),
    atrasoMetaMeses: atrasoMeta(base, valor),
  });

  cenarios.push({
    chave: "parcelar",
    nome: `Parcelar em ${parcelas}x`,
    descricao: `${parcelas} parcelas de R$ ${parcelaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (sem juros considerados).`,
    desembolsoImediato: 0,
    parcelaMensal,
    mesesDeParcela: parcelas,
    ...projetar(base, { desembolsoImediato: 0, parcelaMensal, mesesDeParcela: parcelas, atrasoInicioMeses: 0 }),
    atrasoMetaMeses: atrasoMeta(base, valor),
  });

  cenarios.push({
    chave: "esperar",
    nome: "Esperar 2 meses e comprar à vista",
    descricao: "Você continua guardando por 2 meses antes de gastar.",
    desembolsoImediato: valor,
    parcelaMensal: 0,
    mesesDeParcela: 0,
    ...projetar(base, { desembolsoImediato: valor, parcelaMensal: 0, mesesDeParcela: 0, atrasoInicioMeses: 2 }),
    atrasoMetaMeses: atrasoMeta(base, valor),
  });

  cenarios.push({
    chave: "nao",
    nome: "Não comprar",
    descricao: "Referência: sua trajetória sem essa decisão.",
    desembolsoImediato: 0,
    parcelaMensal: 0,
    mesesDeParcela: 0,
    ...projetar(base, { desembolsoImediato: 0, parcelaMensal: 0, mesesDeParcela: 0, atrasoInicioMeses: 0 }),
    atrasoMetaMeses: null,
  });

  const hipoteses = [
    `Média mensal calculada com os últimos ${base.mesesConsiderados} meses de lançamentos reais.`,
    `Receita média: R$ ${base.receitaMediaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês · Despesa média: R$ ${base.despesaMediaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês.`,
    `Capacidade de poupança considerada: R$ ${base.poupancaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês, mantida constante no período projetado.`,
    "Taxa de juros considerada: 0% (parcelamento sem juros). Não há correção por inflação nem rendimento sobre o saldo.",
    "Cenário “esperar” usa 2 meses de espera.",
    `Data da compra informada: ${entrada.data}.`,
  ];

  return { base, cenarios, hipoteses };
}
