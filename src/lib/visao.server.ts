import type { BaseFinanceira, ResultadoSimulacao, EntradaSimulacao } from "./visao-calc";

type Row = { valor: number | string; data: string; categoria?: string; observacao?: string | null };

function mesesAtras(n: number) {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() - n + 1, 1);
  return start.toISOString().slice(0, 10);
}

const num = (v: unknown) => Number(v ?? 0) || 0;

export async function montarBase(supabase: any, userId: string): Promise<BaseFinanceira> {
  const MESES = 6;
  const desde = mesesAtras(MESES);

  const [rTudo, dTudo, rRec, dRec, meta] = await Promise.all([
    supabase.from("receitas").select("valor").eq("user_id", userId),
    supabase.from("despesas").select("valor").eq("user_id", userId),
    supabase.from("receitas").select("valor,data").eq("user_id", userId).gte("data", desde),
    supabase.from("despesas").select("valor,data,categoria,observacao").eq("user_id", userId).gte("data", desde),
    supabase
      .from("metas")
      .select("meta_lucro")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const soma = (xs: Row[] | null) => (xs ?? []).reduce((a, b) => a + num(b.valor), 0);

  const saldoAtual = soma(rTudo.data) - soma(dTudo.data);
  const receitaMediaMensal = soma(rRec.data) / MESES;
  const despesaMediaMensal = soma(dRec.data) / MESES;

  // compromissos recorrentes aproximados: despesas com "parcela"/"financiamento"/"empréstimo" no último mês
  const ultimoMes = mesesAtras(1);
  const compromissosMensais = (dRec.data ?? [])
    .filter((x: Row) => x.data >= ultimoMes)
    .filter((x: Row) => /parcel|financ|emprést|emprest|dívida|divida|cartão|cartao/i.test(`${x.categoria ?? ""} ${x.observacao ?? ""}`))
    .reduce((a: number, b: Row) => a + num(b.valor), 0);

  const temDados = (rRec.data?.length ?? 0) + (dRec.data?.length ?? 0) > 0;

  const r2 = (n: number) => Math.round(n * 100) / 100;

  return {
    saldoAtual: r2(saldoAtual),
    receitaMediaMensal: r2(receitaMediaMensal),
    despesaMediaMensal: r2(despesaMediaMensal),
    poupancaMensal: r2(receitaMediaMensal - despesaMediaMensal),
    mesesConsiderados: MESES,
    temDados,
    metaLucro: r2(num(meta.data?.meta_lucro)),
    compromissosMensais: r2(compromissosMensais),
  };
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export async function gerarAnalise(
  resultado: ResultadoSimulacao,
  entrada: EntradaSimulacao,
  apiKey: string,
): Promise<string> {
  const { base, cenarios, hipoteses } = resultado;

  const resumo = cenarios
    .map((c) => {
      const p = (k: string) => c.pontos.find((x) => x.horizonte === k);
      return `${c.nome}: hoje ${BRL(p("hoje")!.saldoComCompra)} | 30d ${BRL(p("30d")!.saldoComCompra)} | 3m ${BRL(p("3m")!.saldoComCompra)} | 6m ${BRL(p("6m")!.saldoComCompra)} | 12m ${BRL(p("12m")!.saldoComCompra)} | 24m ${BRL(p("longo")!.saldoComCompra)} | menor saldo no período ${BRL(c.saldoMinimo)} | meses com saldo negativo: ${c.mesesNegativo}${c.atrasoMetaMeses ? ` | atraso estimado na meta: ${c.atrasoMetaMeses.toFixed(1)} meses` : ""}`;
    })
    .join("\n");

  const system = `Você é a Sofia, consultora financeira da Lucro Real. Português brasileiro, tom próximo e direto, sem jargão.

REGRAS RÍGIDAS:
- Use SOMENTE os números fornecidos abaixo. NUNCA invente valores.
- Nunca prometa resultado futuro. Fale sempre como estimativa/projeção.
- Explique o impacto e recomende, mas deixe a decisão com o usuário.
- Máximo 12 linhas. Use bullets curtos.
- Termine com uma recomendação clara ("Financeiramente, ... parece mais confortável porque ...").
- Se não houver dados suficientes (poupança média zero ou sem lançamentos), diga isso com honestidade e oriente registrar receitas/despesas.`;

  const user = `DECISÃO SIMULADA
- Valor: ${BRL(entrada.valor)}
- Forma: ${entrada.forma === "parcelado" ? `parcelado em ${entrada.parcelas}x` : "à vista"}
- Data: ${entrada.data}
- Finalidade: ${entrada.finalidade || "não informada"}

SITUAÇÃO ATUAL (dados reais do usuário)
- Saldo acumulado: ${BRL(base.saldoAtual)}
- Receita média mensal: ${BRL(base.receitaMediaMensal)}
- Despesa média mensal: ${BRL(base.despesaMediaMensal)}
- Capacidade de poupança: ${BRL(base.poupancaMensal)}/mês
- Compromissos recorrentes identificados: ${BRL(base.compromissosMensais)}/mês
- Meta de lucro definida: ${base.metaLucro > 0 ? BRL(base.metaLucro) : "não definida"}

PROJEÇÕES CALCULADAS
${resumo}

HIPÓTESES UTILIZADAS
${hipoteses.map((h) => `- ${h}`).join("\n")}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Muitas simulações seguidas. Aguarde um instante.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados.");
  if (!res.ok) throw new Error("Não consegui gerar a análise agora. Tente de novo.");

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}
