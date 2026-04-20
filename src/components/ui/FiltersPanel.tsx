"use client";
import { useEffect, useState } from "react";
import { SEGMENT_COLORS, COMPANY_SIZE_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/types";

export interface FilterState {
  segment: string;
  size: string;
  status: string;
  neighborhood: string;
  search: string;
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  city?: string;
}

export default function FiltersPanel({ filters, onChange, city }: Props) {
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [segments, setSegments] = useState<string[]>([]);

  useEffect(() => {
    const q = city ? `?city=${encodeURIComponent(city)}` : "";
    fetch(`/api/neighborhoods${q}`).then(r=>r.json()).then(d=>setNeighborhoods(d.neighborhoods||[]));
    fetch("/api/segments").then(r=>r.json()).then(d=>setSegments(d.segments||[]));
  }, [city]);

  const set = (key: keyof FilterState, value: string) => onChange({ ...filters, [key]: value });
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="bg-white border-r border-gray-200 w-56 shrink-0 overflow-y-auto flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros</span>
        {hasFilters && (
          <button onClick={() => onChange({ segment:"",size:"",status:"",neighborhood:"",search:"" })}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">Limpar</button>
        )}
      </div>
      <div className="px-3 py-3 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
        <input type="text" placeholder="Nome, CNPJ..." value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="px-3 py-3 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-500 mb-1">Segmento</label>
        <select value={filters.segment} onChange={(e) => set("segment", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          {segments.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {filters.segment && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{background:SEGMENT_COLORS[filters.segment]||"#9ca3af"}}/>
            <span className="text-xs text-gray-500">{filters.segment}</span>
          </div>
        )}
      </div>
      <div className="px-3 py-3 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select value={filters.status} onChange={(e) => set("status", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          {Object.entries(REGISTRATION_STATUS_LABELS).map(([code,label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>
      <div className="px-3 py-3 border-b border-gray-100">
        <label className="block text-xs font-medium text-gray-500 mb-1">Porte</label>
        <select value={filters.size} onChange={(e) => set("size", e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          {Object.entries(COMPANY_SIZE_LABELS).map(([code,label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>
      {neighborhoods.length > 0 && (
        <div className="px-3 py-3 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
          <select value={filters.neighborhood} onChange={(e) => set("neighborhood", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
      {hasFilters && (
        <div className="px-3 py-3">
          <div className="text-xs font-medium text-gray-500 mb-2">Filtros ativos:</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(filters).map(([k,v]) => v ? (
              <span key={k} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                {v.length > 14 ? v.slice(0,12)+"…" : v}
                <button onClick={() => set(k as keyof FilterState, "")} className="text-blue-400 hover:text-blue-700">×</button>
              </span>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
}
