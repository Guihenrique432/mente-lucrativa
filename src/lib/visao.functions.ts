import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VALOR_MAXIMO_SIMULACAO } from "./visao-calc";

const InputSchema = z.object({
  valor: z
    .number()
    .positive("Informe um valor maior que zero.")
    .max(VALOR_MAXIMO_SIMULACAO, "O valor máximo para a simulação é R$ 100.000.000,00."),
  forma: z.enum(["avista", "parcelado"]),
  parcelas: z.number().int().min(1).max(420),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  finalidade: z.string().max(200).optional(),
});

export const simularDecisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { montarBase, gerarAnalise } = await import("./visao.server");
    const { simular } = await import("./visao-calc");

    const base = await montarBase(context.supabase, context.userId);
    const resultado = simular(base, data);

    let analise = "";
    const apiKey = process.env.LOVABLE_API_KEY;
    if (apiKey) {
      try {
        analise = await gerarAnalise(resultado, data, apiKey);
      } catch (e: any) {
        analise = e?.message ?? "";
      }
    }

    return { ...resultado, analise };
  });
