import { getStatusLabel } from "@/lib/types";

export default function StatusBadge({ code }: { code: string | null | undefined }) {
  const label = getStatusLabel(code);
  const map: Record<string, string> = {
    "02": "badge-active",
    "03": "badge-suspended",
    "04": "badge-inactive",
    "08": "badge-inactive",
  };
  const cls = map[code ?? ""] ?? "badge bg-gray-100 text-gray-600";
  return <span className={cls}>{label}</span>;
}
