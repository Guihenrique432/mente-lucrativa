import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Message = { role: "user" | "assistant"; content: string };

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

function monthRange(offset = 0) {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  const end = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

async function buildContext(supabase: any) {
  const cur = monthRange(0);
  const prev = monthRange(-1);
  const [r, d, rp, dp, p, m] = await Promise.all([
    supabase.from("receitas").select("valor,categoria,data").gte("data", cur.start).lte("data", cur.end),
    supabase.from("despesas").select("valor,categoria,data").gte("data", cur.start).lte("data", cur.end),
    supabase.from("receitas").select("valor").gte("data", prev.start).lte("data", prev.end),
    supabase.from("despesas").select("valor").gte("data", prev.start).lte("data", prev.end),
    supabase.from("produtos").select("nome,quantidade,custo,preco_venda"),
    supabase.from("metas").select("meta_lucro").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const sum = (xs: any[] | null) => (xs ?? []).reduce((a, b) => a + Number(b.valor || 0), 0);
  const fat = sum(r.data);
  const desp = sum(d.data);
  const lucro = fat - desp;
  const fatPrev = sum(rp.data);
  const despPrev = sum(dp.data);
  const lucroPrev = fatPrev - despPrev;
  const meta = Number(m.data?.meta_lucro ?? 0);

  const despPorCat: Record<string, number> = {};
  for (const x of d.data ?? []) despPorCat[x.categoria] = (despPorCat[x.categoria] || 0) + Number(x.valor || 0);
  const topDesp = Object.entries(despPorCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

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

  return `SNAPSHOT FINANCEIRO DO USUÁRIO (mês atual):
- Faturamento: ${BRL(fat)}
- Despesas: ${BRL(desp)}
- Lucro: ${BRL(lucro)} (margem ${fat > 0 ? ((lucro / fat) * 100).toFixed(1) : "0"}%)
- Meta de lucro: ${meta > 0 ? BRL(meta) : "não definida"}${meta > 0 ? ` (${((lucro / meta) * 100).toFixed(0)}% atingida)` : ""}

MÊS ANTERIOR:
- Faturamento: ${BRL(fatPrev)} | Despesas: ${BRL(despPrev)} | Lucro: ${BRL(lucroPrev)}

TOP DESPESAS POR CATEGORIA (mês atual):
${topDesp.length ? topDesp.map(([c, v]) => `- ${c}: ${BRL(v)}`).join("\n") : "- Nenhuma despesa registrada"}

ESTOQUE:
- Total de produtos: ${produtos.length}
- Valor em estoque: ${BRL(estoqueValor)}
- Produtos com estoque baixo (≤3): ${estoqueBaixo.length ? estoqueBaixo.join(", ") : "nenhum"}
${margens.length ? `- 3 menores margens: ${margens.slice(0, 3).map((x) => `${x.nome} (${x.margem.toFixed(0)}%)`).join(", ")}` : ""}
`;
}

export const askSofia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: Message[] }) => input)
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
