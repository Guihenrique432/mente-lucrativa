import { createFileRoute } from "@tanstack/react-router";
import { LancamentosPage } from "@/components/LancamentosPage";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas — Lucro Real" },
      { name: "description", content: "Registre suas saídas e veja onde está seu maior gasto." },
    ],
  }),
  component: () => <LancamentosPage tipo="despesa" />,
});
