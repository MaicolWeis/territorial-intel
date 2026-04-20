"use client";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/ui/Sidebar";

interface ImportJob {
  id: number;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  recordsProcessed: number | null;
  recordsImported: number | null;
  recordsSkipped: number | null;
  notes: string | null;
}

interface DbStats {
  companies: number;
  geocoded: number;
  cnaes: number;
  municipalities: number;
}

export default function AdminPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch("/api/import-jobs"),
        fetch("/api/admin/stats"),
      ]);
      const jobsData = await jobsRes.json();
      setJobs(jobsData.jobs || []);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDbStats(statsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const fmt = (n: number | null) => (n != null ? n.toLocaleString("pt-BR") : "–");
  const fmtDate = (s: string | null) => {
    if (!s) return "–";
    return new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
  };

  const statusCls: Record<string, string> = {
    running: "bg-blue-100 text-blue-700 animate-pulse",
    done: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-5 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold text-gray-900">Admin / ETL</h1>
          <p className="text-sm text-gray-500 mt-0.5">Status dos jobs de importação e banco de dados</p>
        </div>

        <div className="p-6 space-y-6">
          {/* DB Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Estado do Banco de Dados</h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_,i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : dbStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Empresas importadas" value={fmt(dbStats.companies)} />
                <Stat label="Com geocodificação" value={fmt(dbStats.geocoded)} sub={dbStats.companies > 0 ? `${Math.round(dbStats.geocoded/dbStats.companies*100)}%` : "0%"} />
                <Stat label="CNAEs na tabela" value={fmt(dbStats.cnaes)} />
                <Stat label="Municípios" value={fmt(dbStats.municipalities)} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Não foi possível carregar estatísticas do banco.</p>
            )}
          </div>

          {/* ETL Commands */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Comandos ETL</h2>
            <p className="text-xs text-gray-500 mb-4">Execute os comandos abaixo no terminal para importar dados:</p>
            <div className="space-y-3">
              {[
                { label: "1. Importar municípios (IBGE)", cmd: "npm run etl:municipalities", desc: "Popula tabela de municípios com códigos IBGE. Requer conexão internet ou arquivo municipios.csv em data/input/" },
                { label: "2. Importar CNAEs", cmd: "npm run etl:cnae", desc: "Importa tabela de CNAEs. Usa seed interno se não houver arquivo cnae_2_3_estrutura.csv em data/input/" },
                { label: "3. Importar empresas", cmd: "npm run etl:companies", desc: "Processa arquivos Estabelecimentos*.csv e Empresas*.csv de data/input/ e importa empresas filtrando por TARGET_CITY" },
                { label: "4. Geocodificar endereços", cmd: "npm run etl:geocode", desc: "Geocodifica endereços usando Nominatim (gratuito) ou Google Maps. Aplica fallback para centro da cidade se endereço falhar" },
                { label: "Executar tudo em sequência", cmd: "npm run etl:all", desc: "Executa as 4 etapas acima em ordem" },
              ].map((item) => (
                <div key={item.cmd} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-700 mb-1">{item.label}</div>
                      <code className="text-xs bg-gray-900 text-green-400 px-3 py-1.5 rounded font-mono block mb-2">{item.cmd}</code>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data source instructions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Onde obter os arquivos da Receita Federal</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Acesse o link oficial e baixe os arquivos para <code className="bg-gray-100 px-1 rounded text-xs">data/input/</code>:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-xs font-mono">
                <div className="text-blue-600">https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/</div>
                <div className="text-gray-400">## Arquivos necessários (escolha o mês mais recente):</div>
                <div>Estabelecimentos0.zip → Estabelecimentos9.zip</div>
                <div>Empresas0.zip → Empresas9.zip</div>
                <div className="text-gray-400">## Descompacte os .zip — o importer lê os .csv resultantes</div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Os arquivos são grandes (~4 GB comprimidos). O importer filtra apenas a cidade alvo ({process.env.NEXT_PUBLIC_TARGET_CITY || "PENHA"}),
                então o tempo de processamento é proporcional ao tamanho total dos arquivos, mas o banco final ficará pequeno.
              </p>
            </div>
          </div>

          {/* Environment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Variáveis de Ambiente Relevantes</h2>
            <div className="space-y-1.5 font-mono text-xs">
              {[
                ["TARGET_CITY", "Cidade alvo do filtro de importação (ex: PENHA)"],
                ["TARGET_STATE", "UF alvo (ex: SC)"],
                ["TARGET_CITY_IBGE", "Código IBGE da cidade (ex: 4212908 para Penha). Acelera o filtro."],
                ["GEOCODING_PROVIDER", "nominatim (gratuito) ou google"],
                ["NOMINATIM_EMAIL", "Email necessário para usar Nominatim"],
                ["GOOGLE_MAPS_API_KEY", "Chave da API do Google Maps (se provider=google)"],
                ["GEOCODE_CITY_FALLBACK", "true: usa centro da cidade se geocodificação falhar"],
              ].map(([key, desc]) => (
                <div key={key} className="flex gap-3 items-start py-1 border-b border-gray-50 last:border-0">
                  <code className="text-blue-600 shrink-0 w-44">{key}</code>
                  <span className="text-gray-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Import jobs log */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Histórico de Jobs</h2>
              <button onClick={refresh} className="text-xs text-blue-600 hover:text-blue-800 font-medium">↻ Atualizar</button>
            </div>
            {jobs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum job registrado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold">ID</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold">Fonte</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold">Início</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold">Fim</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold">Status</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-semibold">Processados</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-semibold">Importados</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-semibold">Pulados</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-semibold">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-400">#{job.id}</td>
                        <td className="px-3 py-2 font-medium text-gray-700">{job.source}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(job.startedAt)}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(job.finishedAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${statusCls[job.status] || "bg-gray-100 text-gray-600"}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">{fmt(job.recordsProcessed)}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium">{fmt(job.recordsImported)}</td>
                        <td className="px-3 py-2 text-right text-amber-600">{fmt(job.recordsSkipped)}</td>
                        <td className="px-3 py-2 text-gray-400 max-w-[180px] truncate" title={job.notes || ""}>{job.notes || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub} geocodificados</div>}
    </div>
  );
}
