import { createFileRoute } from "@tanstack/react-router";
import { LancamentosPage } from "@/components/LancamentosPage";

export const Route = createFileRoute("/_authenticated/receitas")({
  head: () => ({
    meta: [
      { title: "Receitas — Lucro Real" },
      { name: "description", content: "Registre suas entradas e acompanhe o faturamento do mês." },
    ],
  }),
  component: () => <LancamentosPage tipo="receita" />,
});
