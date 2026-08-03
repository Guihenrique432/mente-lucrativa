import { createFileRoute } from "@tanstack/react-router";
import { LancamentosPage } from "@/components/LancamentosPage";

export const Route = createFileRoute("/_authenticated/receitas")({
  head: () => ({
    meta: [
      { title: "Receitas — Lucro Real" },
      { name: "description", content: "Registre suas entradas e acompanhe o faturamento do mês." },
      { property: "og:title", content: "Receitas — Lucro Real" },
      { property: "og:description", content: "Registre suas entradas e acompanhe o faturamento do mês." },
      { property: "og:url", content: "https://mente-lucrativa.lovable.app/receitas" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://mente-lucrativa.lovable.app/receitas" }],
  }),
  component: () => <LancamentosPage tipo="receita" />,
});
