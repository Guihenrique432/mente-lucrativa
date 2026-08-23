import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});
const AskSofiaInputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
});
type Message = z.infer<typeof MessageSchema>;

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

function monthRange(offset = 0) {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function mesKey(data: string) {
  return data.slice(0, 7);
}

async function buildContext(supabase: any) {
  const cur = monthRange(0);
  const prev = monthRange(-1);
  const desde6 = monthRange(-5).start;

  const [r, d, rp, dp, p, m, r6, d6, rTudo, dTudo] = await Promise.all([
    supabase.from("receitas").select("valor,categoria,data").gte("data", cur.start).lte("data", cur.end),
    supabase.from("despesas").select("valor,categoria,data").gte("data", cur.start).lte("data", cur.end),
    supabase.from("receitas").select("valor").gte("data", prev.start).lte("data", prev.end),
    supabase.from("despesas").select("valor,categoria").gte("data", prev.start).lte("data", prev.end),
    supabase.from("produtos").select("nome,quantidade,custo,preco_venda"),
    supabase.from("metas").select("meta_lucro").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("receitas").select("valor,data").gte("data", desde6).lte("data", cur.end),
    supabase.from("despesas").select("valor,data,categoria,observacao").gte("data", desde6).lte("data", cur.end),
    supabase.from("receitas").select("valor"),
    supabase.from("despesas").select("valor"),
  ]);

  const sum = (xs: any[] | null) => (xs ?? []).reduce((a, b) => a + Number(b.valor || 0), 0);
  const fat = sum(r.data);
  const desp = sum(d.data);
  const lucro = fat - desp;
  const fatPrev = sum(rp.data);
  const despPrev = sum(dp.data);
  const lucroPrev = fatPrev - despPrev;
  const meta = Number(m.data?.meta_lucro ?? 0);
  const saldoAcumulado = sum(rTudo.data) - sum(dTudo.data);

  const despPorCat: Record<string, number> = {};
  for (const x of d.data ?? []) despPorCat[x.categoria] = (despPorCat[x.categoria] || 0) + Number(x.valor || 0);
  const despPorCatPrev: Record<string, number> = {};
  for (const x of dp.data ?? []) despPorCatPrev[x.categoria] = (despPorCatPrev[x.categoria] || 0) + Number(x.valor || 0);
  const topDesp = Object.entries(despPorCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const variacoes = topDesp
    .map(([c, v]) => {
      const ant = despPorCatPrev[c] || 0;
      if (ant <= 0) return `- ${c}: ${BRL(v)} (não havia gasto nessa categoria no mês passado)`;
      const pct = ((v - ant) / ant) * 100;
      return `- ${c}: ${BRL(v)} vs ${BRL(ant)} no mês passado (${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%)`;
    })
    .join("\n");

  // evolução mensal (6 meses)
  const meses: Record<string, { r: number; d: number }> = {};
  for (const x of r6.data ?? []) {
    const k = mesKey(x.data);
    (meses[k] ??= { r: 0, d: 0 }).r += Number(x.valor || 0);
  }
  for (const x of d6.data ?? []) {
    const k = mesKey(x.data);
    (meses[k] ??= { r: 0, d: 0 }).d += Number(x.valor || 0);
  }
  const chaves = Object.keys(meses).sort();
  const evolucao = chaves
    .map((k) => `- ${k}: entrou ${BRL(meses[k].r)} | saiu ${BRL(meses[k].d)} | sobrou ${BRL(meses[k].r - meses[k].d)}`)
    .join("\n");
  const nMeses = Math.max(chaves.length, 1);
  const receitaMedia = chaves.reduce((a, k) => a + meses[k].r, 0) / nMeses;
  const despesaMedia = chaves.reduce((a, k) => a + meses[k].d, 0) / nMeses;
  const poupancaMensal = receitaMedia - despesaMedia;

  // compromissos recorrentes / parcelas
  const compromissos = (d6.data ?? []).filter((x: any) =>
    /parcel|financ|emprést|emprest|dívida|divida|cartão|cartao|assinatura|mensalidade|aluguel/i.test(
      `${x.categoria ?? ""} ${x.observacao ?? ""}`,
    ),
  );
  const compMesAtual = compromissos
    .filter((x: any) => x.data >= cur.start)
    .reduce((a: number, b: any) => a + Number(b.valor || 0), 0);

  // despesas recorrentes: categorias presentes em 3+ meses distintos
  const catMeses: Record<string, Set<string>> = {};
  const catTotal: Record<string, number> = {};
  for (const x of d6.data ?? []) {
    (catMeses[x.categoria] ??= new Set()).add(mesKey(x.data));
    catTotal[x.categoria] = (catTotal[x.categoria] || 0) + Number(x.valor || 0);
  }
  const recorrentes = Object.entries(catMeses)
    .filter(([, s]) => s.size >= 3)
    .map(([c, s]) => `- ${c}: ~${BRL(catTotal[c] / s.size)}/mês (aparece em ${s.size} meses)`)
    .join("\n");

  const produtos = (p.data ?? []) as Array<{ nome: string; quantidade: number; custo: number; preco_venda: number }>;
  const estoqueValor = produtos.reduce((a, b) => a + Number(b.custo || 0) * Number(b.quantidade || 0), 0);
  const estoqueBaixo = produtos.filter((x) => Number(x.quantidade) <= 3).map((x) => `${x.nome} (${x.quantidade})`);
  const margens = produtos
    .filter((x) => Number(x.preco_venda) > 0 && Number(x.custo) > 0)
    .map((x) => ({
      nome: x.nome,
      margem: ((Number(x.preco_venda) - Number(x.custo)) / Number(x.preco_venda)) * 100,
    }))
    .sort((a, b) => a.margem - b.margem);

  const lancamentos = (r6.data?.length ?? 0) + (d6.data?.length ?? 0);

  return `SNAPSHOT FINANCEIRO DO USUÁRIO (mês atual):
- Faturamento: ${BRL(fat)}
- Despesas: ${BRL(desp)}
- Lucro: ${BRL(lucro)} (margem ${fat > 0 ? ((lucro / fat) * 100).toFixed(1) : "0"}%)
- Meta de lucro: ${meta > 0 ? BRL(meta) : "não definida"}${meta > 0 ? ` (${((lucro / meta) * 100).toFixed(0)}% atingida)` : ""}
- Saldo acumulado (todo o histórico): ${BRL(saldoAcumulado)}${saldoAcumulado < 0 ? " (NEGATIVO — dívida acumulada)" : ""}
- Total de lançamentos nos últimos 6 meses: ${lancamentos}

MÊS ANTERIOR:
- Faturamento: ${BRL(fatPrev)} | Despesas: ${BRL(despPrev)} | Lucro: ${BRL(lucroPrev)}

EVOLUÇÃO MENSAL (até 6 meses):
${evolucao || "- Sem histórico registrado"}

MÉDIAS (base ${nMeses} meses):
- Receita média: ${BRL(receitaMedia)}/mês
- Despesa média: ${BRL(despesaMedia)}/mês
- Capacidade de poupança: ${BRL(poupancaMensal)}/mês${poupancaMensal <= 0 ? " (não sobra dinheiro)" : ""}
- Projeção simples de sobra em 12 meses (sem rendimentos): ${BRL(poupancaMensal * 12)}

TOP DESPESAS DO MÊS E VARIAÇÃO vs MÊS ANTERIOR:
${variacoes || "- Nenhuma despesa registrada"}

DESPESAS RECORRENTES IDENTIFICADAS (categorias em 3+ meses):
${recorrentes || "- Nenhuma identificada"}

COMPROMISSOS COM PARCELAS/DÍVIDAS/ASSINATURAS NO MÊS ATUAL: ${BRL(compMesAtual)}${receitaMedia > 0 ? ` (${((compMesAtual / receitaMedia) * 100).toFixed(0)}% da receita média)` : ""}

ESTOQUE:
- Total de produtos: ${produtos.length}
- Valor em estoque: ${BRL(estoqueValor)}
- Produtos com estoque baixo (≤3): ${estoqueBaixo.length ? estoqueBaixo.join(", ") : "nenhum"}
${margens.length ? `- 3 menores margens: ${margens.slice(0, 3).map((x) => `${x.nome} (${x.margem.toFixed(0)}%)`).join(", ")}` : ""}
`;
}


export const askSofia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskSofiaInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("IA indisponível no momento.");

    const snapshot = await buildContext(context.supabase);

    const systemPrompt = `Você é a Sofia, consultora financeira da Lucro Real. Fala em português brasileiro, tom próximo, direto e amigo. É consultora de pequenos negócios: autônomos, lojistas, revendedores.

REGRAS:
- Baseie TODA análise nos números do snapshot abaixo. Nunca invente valores.
- Respostas curtas (máx 6 linhas). Use bullets quando fizer sentido.
- Sempre proponha 1 ação prática e concreta ao final.
- Se o usuário não tem dados suficientes, oriente onde registrar (Receitas, Despesas, Estoque, Metas).
- Não use jargão contábil. Fale como quem conversa no WhatsApp.
- Use R$ com vírgula (formato brasileiro).

${snapshot}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("Muitas mensagens seguidas. Aguarde um instante.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
    if (!res.ok) throw new Error("A Sofia não conseguiu responder agora. Tente de novo.");

    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content ?? "Não consegui pensar em uma resposta agora.";
    return { answer };
  });
