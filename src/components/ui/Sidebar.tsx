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
    <aside style={{
      width: "200px", minWidth: "200px", minHeight: "100vh",
      background: "#1e293b", display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #334155" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: "4px" }}>MVP</div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", lineHeight: 1.3 }}>Inteligência<br />Territorial</div>
        <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>Receita Federal</div>
      </div>
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {NAV.map((item) => {
          const active = path === item.href || path.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "8px", marginBottom: "4px",
              textDecoration: "none", fontSize: "13px", fontWeight: 500,
              background: active ? "#2563eb" : "transparent",
              color: active ? "#ffffff" : "#cbd5e1",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#334155"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ fontSize: "15px", width: "18px", textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: "1px solid #334155" }}>
        <div style={{ fontSize: "10px", color: "#475569" }}>dados.gov.br/cnpj</div>
      </div>
    </aside>
  );
}
