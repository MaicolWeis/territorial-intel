"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";
import { SEGMENT_COLORS } from "@/lib/types";

interface SegmentData {
  segment: string;
  count: number;
}

interface StatusData {
  status: string;
  label: string;
  count: number;
}

interface NeighborhoodData {
  neighborhood: string;
  count: number;
}

export function SegmentBarChart({ data }: { data: SegmentData[] }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 12);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="segment" width={130} tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v: number) => [v.toLocaleString("pt-BR"), "Empresas"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {sorted.map((entry) => (
            <Cell key={entry.segment} fill={SEGMENT_COLORS[entry.segment] || "#9ca3af"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: StatusData[] }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const STATUS_COLORS: Record<string, string> = {
    "02": "#22c55e", "01": "#ef4444", "03": "#f59e0b",
    "04": "#f97316", "08": "#94a3b8",
  };
  const colored = data.map((d) => ({ ...d, fill: STATUS_COLORS[d.status] || "#9ca3af" }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={colored} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={75}
          label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: "#cbd5e1" }}>
          {colored.map((entry) => (
            <Cell key={entry.status} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v.toLocaleString("pt-BR"), "Empresas"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function NeighborhoodChart({ data }: { data: NeighborhoodData[] }) {
  if (!data || data.length === 0) return <EmptyChart />;
  const top = [...data].slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="neighborhood" width={110} tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(v: number) => [v.toLocaleString("pt-BR"), "Empresas"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-gray-400">
      Sem dados para exibir
    </div>
  );
}
