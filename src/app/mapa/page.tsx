"use client";
import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/ui/Sidebar";
import FiltersPanel, { FilterState } from "@/components/ui/FiltersPanel";
import { getSegmentColor } from "@/lib/types";

const CompanyMap = dynamic(() => import("@/components/map/CompanyMap"), { ssr: false });

const DEFAULT_CITY = process.env.NEXT_PUBLIC_TARGET_CITY || "PENHA";

interface MapCompany {
  id: number;
  cnpjFull: string;
  companyName: string;
  tradeName: string | null;
  latitude: number | null;
  longitude: number | null;
  mainCnaeCode: string | null;
  registrationStatus: string | null;
  companySizeCode: string | null;
  neighborhood: string | null;
  street: string | null;
  streetType: string | null;
  streetNumber: string | null;
  city: string | null;
  state: string | null;
  mainCnae: { segment: string | null; description: string | null } | null;
}

export default function MapPage() {
  const [companies, setCompanies] = useState<MapCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterState>({ segment:"",size:"",status:"",neighborhood:"",search:"" });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ city: DEFAULT_CITY });
      if (filters.segment) q.set("segment", filters.segment);
      if (filters.size) q.set("size", filters.size);
      if (filters.status) q.set("status", filters.status);
      if (filters.neighborhood) q.set("neighborhood", filters.neighborhood);
      if (filters.search) q.set("search", filters.search);
      const res = await fetch(`/api/map?${q}`);
      const data = await res.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // Segment legend
  const segmentCounts: Record<string, number> = {};
  companies.forEach(c => {
    const s = c.mainCnae?.segment || "Outros";
    segmentCounts[s] = (segmentCounts[s] || 0) + 1;
  });
  const legend = Object.entries(segmentCounts).sort((a,b) => b[1]-a[1]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <FiltersPanel filters={filters} onChange={setFilters} city={DEFAULT_CITY} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mapa de Empresas</h1>
            <p className="text-sm text-gray-500 mt-0.5">{DEFAULT_CITY} · {loading ? "carregando…" : `${total.toLocaleString("pt-BR")} empresas com coordenadas`}</p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Carregando…
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 relative">
            <CompanyMap companies={companies} />
            {/* Legend overlay */}
            {legend.length > 0 && (
              <div className="absolute bottom-4 right-4 z-[1000] bg-white rounded-xl border border-gray-200 shadow-lg p-3 max-w-xs">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Legenda</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {legend.map(([seg, count]) => (
                    <div key={seg} className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{background: getSegmentColor(seg)}} />
                      <span className="text-xs text-gray-700 flex-1 truncate">{seg}</span>
                      <span className="text-xs font-semibold text-gray-900 shrink-0">{count.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
