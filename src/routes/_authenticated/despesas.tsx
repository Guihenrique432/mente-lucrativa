import { createFileRoute } from "@tanstack/react-router";
import { LancamentosPage } from "@/components/LancamentosPage";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas — Lucro Real" },
      { name: "description", content: "Registre suas saídas e veja onde está seu maior gasto." },
      { property: "og:title", content: "Despesas — Lucro Real" },
      { property: "og:description", content: "Registre suas saídas e veja onde está seu maior gasto." },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/despesas" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/despesas" }],
  }),
  component: () => <LancamentosPage tipo="despesa" />,
});
