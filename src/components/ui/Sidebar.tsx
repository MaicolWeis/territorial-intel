"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/mapa", label: "Mapa", icon: "⊕" },
  { href: "/empresas", label: "Empresas", icon: "≡" },
  { href: "/admin", label: "Admin / ETL", icon: "⚙" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">MVP</div>
        <div className="text-base font-bold text-white leading-tight">Inteligência<br/>Territorial</div>
        <div className="text-xs text-slate-500 mt-1">Dados: Receita Federal</div>
      </div>
      <nav className="flex-1 py-4 px-3">
        {NAV.map((item) => {
          const active = path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-700">
        <div className="text-xs text-slate-500">dados.gov.br/cnpj</div>
      </div>
    </aside>
  );
}
