"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/ui/Sidebar";
import FiltersPanel, { FilterState } from "@/components/ui/FiltersPanel";
import { getStatusLabel, getSizeLabel, formatCnpj } from "@/lib/types";

const DEFAULT_CITY = process.env.NEXT_PUBLIC_TARGET_CITY || "PENHA";
const PAGE_SIZE = 25;

interface Company {
  id: number;
  cnpjFull: string;
  companyName: string;
  tradeName: string | null;
  registrationStatus: string | null;
  companySizeCode: string | null;
  neighborhood: string | null;
  mainCnaeCode: string | null;
  city: string | null;
  state: string | null;
  mainCnae: { description: string; segment: string | null } | null;
}

type SortField = "companyName" | "neighborhood" | "registrationStatus" | "companySizeCode" | "mainCnaeCode";

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("companyName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<FilterState>({ segment:"",size:"",status:"",neighborhood:"",search:"" });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ city: DEFAULT_CITY, page: String(page), pageSize: String(PAGE_SIZE), sortBy, sortDir });
      if (filters.segment) q.set("segment", filters.segment);
      if (filters.size) q.set("size", filters.size);
      if (filters.status) q.set("status", filters.status);
      if (filters.neighborhood) q.set("neighborhood", filters.neighborhood);
      if (filters.search) q.set("search", filters.search);
      const res = await fetch(`/api/companies?${q}`);
      const data = await res.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [filters, page, sortBy, sortDir]);

  useEffect(() => { setPage(1); }, [filters]);
  useEffect(() => { fetch_(); }, [fetch_]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-gray-400">{sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
  );

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
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Empresas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "carregando…" : `${total.toLocaleString("pt-BR")} registros encontrados`}
            </p>
          </div>
          <a href={exportUrl()} className="inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            ↓ Exportar CSV
          </a>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort("companyName")}>
                    Empresa <SortIcon field="companyName" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CNPJ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort("mainCnaeCode")}>
                    Segmento / CNAE <SortIcon field="mainCnaeCode" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort("neighborhood")}>
                    Bairro <SortIcon field="neighborhood" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort("registrationStatus")}>
                    Status <SortIcon field="registrationStatus" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100" onClick={() => handleSort("companySizeCode")}>
                    Porte <SortIcon field="companySizeCode" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-full" /></td></tr>
                  ))
                ) : companies.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Nenhuma empresa encontrada com os filtros atuais</td></tr>
                ) : companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[220px]" title={c.companyName}>{c.companyName}</div>
                      {c.tradeName && <div className="text-xs text-gray-400 truncate max-w-[220px]" title={c.tradeName}>{c.tradeName}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{formatCnpj(c.cnpjFull)}</td>
                    <td className="px-4 py-3">
                      {c.mainCnae?.segment && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 mb-1">{c.mainCnae.segment}</span>
                      )}
                      {c.mainCnaeCode && <div className="text-xs text-gray-400 font-mono">{c.mainCnaeCode}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.neighborhood || "–"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.registrationStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{getSizeLabel(c.companySizeCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-sm text-gray-500">
                Página {page} de {totalPages} · {total.toLocaleString("pt-BR")} registros
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return p <= totalPages ? (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-sm border rounded-lg ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:bg-gray-50"}`}>{p}</button>
                  ) : null;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">»</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; cls: string }> = {
    "02": { label: "Ativa", cls: "bg-green-50 text-green-700" },
    "01": { label: "Nula", cls: "bg-red-50 text-red-700" },
    "03": { label: "Suspensa", cls: "bg-yellow-50 text-yellow-700" },
    "04": { label: "Inapta", cls: "bg-orange-50 text-orange-700" },
    "08": { label: "Baixada", cls: "bg-gray-100 text-gray-600" },
  };
  const c = config[status || ""] || { label: getStatusLabel(status), cls: "bg-gray-100 text-gray-600" };
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>;
}
