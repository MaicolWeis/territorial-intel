"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/ui/Sidebar";
import FiltersPanel, { FilterState } from "@/components/ui/FiltersPanel";
import { KpiCard } from "@/components/ui/KpiCard";
import { SegmentBarChart, StatusPieChart, NeighborhoodChart } from "@/components/charts/Charts";
import { getStatusLabel } from "@/lib/types";

interface DashStats {
  total: number;
  bySegment: { segment: string; count: number }[];
  byStatus: { status: string; label: string; count: number }[];
  bySize: { size: string; label: string; count: number }[];
  byNeighborhood: { neighborhood: string; count: number }[];
  topCnaes: { code: string; description: string; count: number }[];
}

const DEFAULT_CITY = process.env.NEXT_PUBLIC_TARGET_CITY || "PENHA";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({ segment:"",size:"",status:"",neighborhood:"",search:"" });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ city: DEFAULT_CITY });
      if (filters.segment) q.set("segment", filters.segment);
      if (filters.size) q.set("size", filters.size);
      if (filters.status) q.set("status", filters.status);
      if (filters.neighborhood) q.set("neighborhood", filters.neighborhood);
      if (filters.search) q.set("search", filters.search);
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

  const exportUrl = () => {
    const q = new URLSearchParams({ city: DEFAULT_CITY });
    if (filters.segment) q.set("segment", filters.segment);
    if (filters.size) q.set("size", filters.size);
    if (filters.status) q.set("status", filters.status);
    if (filters.neighborhood) q.set("neighborhood", filters.neighborhood);
    if (filters.search) q.set("search", filters.search);
    return `/api/companies/export?${q}`;
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <FiltersPanel filters={filters} onChange={setFilters} city={DEFAULT_CITY} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-5 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{DEFAULT_CITY} · dados Receita Federal</p>
          </div>
          <a href={exportUrl()} className="inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            ↓ Exportar CSV
          </a>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Empresas" value={loading ? "…" : stats?.total || 0} sub={`em ${DEFAULT_CITY}`} color="blue" />
            <KpiCard label="Ativas" value={loading ? "…" : activeCount} sub="status 02" color="green" />
            <KpiCard label="Restaurantes" value={loading ? "…" : restaurantCount} sub="segmento" color="amber" />
            <KpiCard label="Indústria" value={loading ? "…" : industryCount} sub="segmento" color="purple" />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Empresas por Segmento</h2>
              {loading ? <Skeleton h={280} /> : <SegmentBarChart data={stats?.bySegment || []} />}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribuição por Status</h2>
              {loading ? <Skeleton h={220} /> : <StatusPieChart data={stats?.byStatus || []} />}
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Empresas por Bairro</h2>
              {loading ? <Skeleton h={260} /> : <NeighborhoodChart data={stats?.byNeighborhood || []} />}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Top 10 CNAEs</h2>
              {loading ? <Skeleton h={260} /> : (
                <div className="space-y-2">
                  {(stats?.topCnaes || []).map((c, i) => (
                    <div key={c.code} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-400 w-5 text-right">{i+1}</span>
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.code}</span>
                      <span className="text-xs text-gray-700 flex-1 truncate">{c.description}</span>
                      <span className="text-xs font-semibold text-gray-900 shrink-0">{c.count.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Size breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribuição por Porte</h2>
            {loading ? <Skeleton h={60} /> : (
              <div className="flex flex-wrap gap-3">
                {(stats?.bySize || []).map(s => (
                  <div key={s.size} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-sm font-semibold text-gray-900">{s.count.toLocaleString("pt-BR")}</span>
                    <span className="text-xs text-gray-500">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Skeleton({ h }: { h: number }) {
  return <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height: h }} />;
}
