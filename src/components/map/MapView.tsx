"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import FiltersPanel, { FilterValues } from "@/components/ui/FiltersPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import SegmentBadge from "@/components/ui/SegmentBadge";
import { Company, getSegmentColor, getStatusLabel, getSizeLabel } from "@/lib/types";

// Dynamically import the actual Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

const CITY = process.env.NEXT_PUBLIC_TARGET_CITY || "PENHA";

const EMPTY_FILTERS: FilterValues = {
  segment: "", size: "", status: "", neighborhood: "", search: "",
};

export default function MapView() {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ city: CITY });
    if (filters.segment) params.set("segment", filters.segment);
    if (filters.size) params.set("size", filters.size);
    if (filters.status) params.set("status", filters.status);
    if (filters.neighborhood) params.set("neighborhood", filters.neighborhood);
    if (filters.search) params.set("search", filters.search);

    try {
      const r = await fetch(`/api/map?${params}`);
      const data = await r.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-0px)]">
      {/* Filters */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col gap-4">
        <FiltersPanel values={filters} onChange={setFilters} city={CITY} />
        <div className="text-xs text-gray-400">
          {loading ? "Carregando..." : `${total.toLocaleString("pt-BR")} empresas com coordenadas`}
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center">
            <div className="text-sm text-gray-500">Carregando mapa...</div>
          </div>
        )}
        <LeafletMap companies={companies} onSelect={setSelected} />
      </div>

      {/* Detail panel */}
      {selected && (
        <aside className="w-72 shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{selected.companyName}</h3>
              {selected.tradeName && (
                <p className="text-xs text-gray-500 mt-0.5">{selected.tradeName}</p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 ml-2 text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-3 text-sm">
            <Row label="CNPJ" value={selected.cnpjFull} mono />
            <Row label="Status" value={<StatusBadge code={selected.registrationStatus} />} />
            <Row label="Segmento" value={<SegmentBadge segment={(selected as any).mainCnae?.segment} />} />
            <Row label="CNAE" value={selected.mainCnaeCode ?? "—"} mono />
            <Row label="Atividade" value={(selected as any).mainCnae?.description ?? "—"} />
            <Row label="Porte" value={getSizeLabel(selected.companySizeCode)} />
            <Row label="Bairro" value={selected.neighborhood ?? "—"} />
            <Row
              label="Endereço"
              value={[selected.streetType, selected.street, selected.streetNumber]
                .filter(Boolean)
                .join(" ") || "—"}
            />
            <Row label="CEP" value={selected.zipCode ?? "—"} mono />
            {selected.latitude && (
              <Row label="Coords" value={`${selected.latitude?.toFixed(5)}, ${selected.longitude?.toFixed(5)}`} mono />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className={`text-gray-800 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</span>
    </div>
  );
}
