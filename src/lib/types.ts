export interface Company {
  id: number;
  cnpjFull: string;
  cnpjBase: string;
  companyName: string;
  tradeName: string | null;
  legalNatureCode: string | null;
  companySizeCode: string | null;
  registrationStatus: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  streetType: string | null;
  streetNumber: string | null;
  addressComplement: string | null;
  zipCode: string | null;
  mainCnaeCode: string | null;
  latitude: number | null;
  longitude: number | null;
  mainCnae?: Cnae | null;
}

export interface Cnae {
  code: string;
  description: string;
  segment: string | null;
}

export interface DashboardStats {
  total: number;
  bySegment: { segment: string; count: number }[];
  byStatus: { status: string; label: string; count: number }[];
  bySize: { size: string; label: string; count: number }[];
  byNeighborhood: { neighborhood: string; count: number }[];
  topCnaes: { code: string; description: string; count: number }[];
}

export interface CompanyFilters {
  segment?: string;
  size?: string;
  status?: string;
  neighborhood?: string;
  cnae?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export const COMPANY_SIZE_LABELS: Record<string, string> = {
  "00": "Não informado",
  "01": "Micro Empresa",
  "03": "Empresa de Pequeno Porte",
  "05": "Demais",
};

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  "01": "Nula",
  "02": "Ativa",
  "03": "Suspensa",
  "04": "Inapta",
  "08": "Baixada",
};

export const SEGMENT_COLORS: Record<string, string> = {
  "Restaurantes": "#ef4444",
  "Hotéis": "#3b82f6",
  "Indústria": "#22c55e",
  "Comércio": "#f59e0b",
  "Saúde": "#ec4899",
  "Educação": "#8b5cf6",
  "Turismo e Lazer": "#06b6d4",
  "Construção": "#a78bfa",
  "Transporte e Logística": "#64748b",
  "Finanças e Seguros": "#0ea5e9",
  "Imóveis": "#84cc16",
  "Tecnologia": "#6366f1",
  "Serviços Profissionais": "#f97316",
  "Serviços Pessoais": "#14b8a6",
  "Agropecuária e Pesca": "#854d0e",
  "Outros": "#9ca3af",
};

export function getSegmentColor(segment: string | null | undefined): string {
  if (!segment) return SEGMENT_COLORS["Outros"];
  return SEGMENT_COLORS[segment] ?? SEGMENT_COLORS["Outros"];
}

export function getStatusLabel(code: string | null | undefined): string {
  if (!code) return "Não informado";
  return REGISTRATION_STATUS_LABELS[code] ?? code;
}

export function getSizeLabel(code: string | null | undefined): string {
  if (!code) return "Não informado";
  return COMPANY_SIZE_LABELS[code] ?? code;
}

export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
