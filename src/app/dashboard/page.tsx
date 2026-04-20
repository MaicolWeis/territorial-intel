"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/ui/Sidebar";
import FiltersPanel, { FilterState } from "@/components/ui/FiltersPanel";
import { KpiCard } from "@/components/ui/KpiCard";
import { SegmentBarChart, StatusPieChart, NeighborhoodChart } from "@/components/charts/Charts";

interface DashStats {
  total: number;
  meiCount: number;
  nonMeiCount: number;
  semSocios: number;
  bySegment: { segment: string; count: number }[];
  byStatus: { status: string; label: string; count: number }[];
  bySize: { size: string; label: string; count: number }[];
  byNeighborhood: { neighborhood: string; count: number }[];
  topCnaes: { code: string; description: string; count: number }[];
  byLegalNature: { code: string; label: string; count: number }[];
}

const DEFAULT_CITY = process.env.NEXT_PUBLIC_TARGET_CITY || "PENHA";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({ segment: "", size: "", status: "", neighborhood: "", search: "" });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ city: DEFAULT_CITY });
      if (filters.segment) q.set("segment", filters.segment);
      if (filters.size) q.set("size", filters.size);
      if (filters.status) q.set("status", filters.status);
      if (filters.neighborhood) q.set("neighborhood", filters.neighborhood);
      const res = await fetch(`/api/dashboard?${q}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const activeCount = stats?.byStatus?.find(s => s.status === "02")?.count || 0;
  const restaurantCount = stats?.bySegment?.find(s => s.segment === "Restaurantes")?.count || 0;
  const industryCount = stats?.bySegment?.find(s => s.segment === "Indústria")?.count || 0;
  const meiPct = stats?.total ? Math.round((stats.meiCount / stats.total) * 100) : 0;

  const exportUrl = () => {
    const q = new URLSearchParams({ city: DEFAULT_CITY });
    if (filters.segment) q.set("segment", filters.segment);
    if (filters.size) q.set("size", filters.size);
    if (filters.status) q.set("status", filters.status);
    if (filters.neighborhood) q.set("neighborhood", filters.neighborhood);
    return `/api/companies/export?${q}`;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <FiltersPanel filters={filters} onChange={setFilters} city={DEFAULT_CITY} />
      <main style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>{DEFAULT_CITY} · dados Receita Federal</p>
          </div>
          <a href={exportUrl()} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "8px", textDecoration: "none", fontWeight: 500 }}>
            ↓ Exportar CSV
          </a>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* KPIs Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            <KpiCard label="Total Empresas" value={loading ? "…" : stats?.total || 0} sub={`em ${DEFAULT_CITY}`} color="blue" />
            <KpiCard label="Ativas" value={loading ? "…" : activeCount} sub="status 02" color="green" />
            <KpiCard label="Restaurantes" value={loading ? "…" : restaurantCount} sub="segmento" color="amber" />
            <KpiCard label="Indústria" value={loading ? "…" : industryCount} sub="segmento" color="purple" />
          </div>

          {/* Charts Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "16px" }}>Empresas por Segmento</h2>
              {loading ? <Skeleton h={280} /> : <SegmentBarChart data={stats?.bySegment || []} />}
            </div>
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "16px" }}>Distribuição por Status</h2>
              {loading ? <Skeleton h={220} /> : <StatusPieChart data={stats?.byStatus || []} />}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "16px" }}>Empresas por Bairro</h2>
              {loading ? <Skeleton h={260} /> : <NeighborhoodChart data={stats?.byNeighborhood || []} />}
            </div>
            <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "16px" }}>Top 10 CNAEs</h2>
              {loading ? <Skeleton h={260} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(stats?.topCnaes || []).map((c, i) => (
                    <div key={c.code} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", width: "16px", textAlign: "right" }}>{i + 1}</span>
                      <span style={{ fontSize: "11px", fontFamily: "monospace", background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px" }}>{c.code}</span>
                      <span style={{ fontSize: "12px", color: "#374151", flex: 1 }}>{c.description}</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Porte */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "16px" }}>Distribuição por Porte</h2>
            {loading ? <Skeleton h={60} /> : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {(stats?.bySize || []).map(s => (
                  <div key={s.size} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 16px" }}>
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>{s.count}</span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── NOVA SEÇÃO: MEI e Natureza Jurídica ── */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>MEI e Natureza Jurídica</h2>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "20px" }}>Classificação legal das empresas cadastradas</p>

            {loading ? <Skeleton h={120} /> : (
              <>
                {/* MEI cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ background: "#eff6ff", borderRadius: "10px", padding: "16px", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>MEI</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e40af" }}>{stats?.meiCount || 0}</div>
                    <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>{meiPct}% do total</div>
                    <div style={{ fontSize: "11px", color: "#93c5fd", marginTop: "4px" }}>Microempreendedor Individual</div>
                  </div>
                  <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "16px", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Não-MEI</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#15803d" }}>{stats?.nonMeiCount || 0}</div>
                    <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "2px" }}>{100 - meiPct}% do total</div>
                    <div style={{ fontSize: "11px", color: "#86efac", marginTop: "4px" }}>Ltda, S/A, e outros</div>
                  </div>
                  <div style={{ background: "#fefce8", borderRadius: "10px", padding: "16px", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Sem Responsável</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#b45309" }}>{stats?.semSocios || 0}</div>
                    <div style={{ fontSize: "12px", color: "#d97706", marginTop: "2px" }}>não identificado</div>
                    <div style={{ fontSize: "11px", color: "#fcd34d", marginTop: "4px" }}>Campo responsável vazio</div>
                  </div>
                </div>

                {/* MEI bar visual */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                    <span>MEI ({meiPct}%)</span>
                    <span>Não-MEI ({100 - meiPct}%)</span>
                  </div>
                  <div style={{ height: "12px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${meiPct}%`, background: "linear-gradient(90deg, #3b82f6, #60a5fa)", borderRadius: "6px", transition: "width 0.5s" }} />
                  </div>
                </div>

                {/* Por natureza jurídica */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "10px" }}>Por Natureza Jurídica</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(stats?.byLegalNature || []).map(n => (
                      <div key={n.code} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 14px" }}>
                        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#94a3b8" }}>{n.code}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{n.label}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>{n.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return <div style={{ height: h, background: "#f1f5f9", borderRadius: "8px", animation: "pulse 2s infinite" }} />;
}
