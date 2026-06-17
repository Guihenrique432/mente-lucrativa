import { Link } from "@tanstack/react-router";
import { Home, Receipt, BarChart3, Boxes, Plus } from "lucide-react";

type Tab = "home" | "movimentos" | "estoque" | "relatorios";

export function BottomNav({ active, fabTo = "/receitas" }: { active: Tab; fabTo?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2.5">
        <NavLink to="/" icon={<Home className="h-5 w-5" />} label="Início" active={active === "home"} />
        <NavLink
          to="/receitas"
          icon={<Receipt className="h-5 w-5" />}
          label="Movimentos"
          active={active === "movimentos"}
        />
        <Link
          to={fabTo}
          aria-label="Novo lançamento"
          className="-mt-7 grid h-14 w-14 place-items-center rounded-full text-primary-foreground"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-pop)" }}
        >
          <Plus className="h-6 w-6" />
        </Link>
        <NavLink
          to="/estoque"
          icon={<Boxes className="h-5 w-5" />}
          label="Estoque"
          active={active === "estoque"}
        />
        <NavLink
          to="/relatorios"
          icon={<BarChart3 className="h-5 w-5" />}
          label="Relatórios"
          active={active === "relatorios"}
        />
      </div>
    </nav>
  );
}

function NavLink({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-1.5 transition ${
        active ? "text-accent" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
