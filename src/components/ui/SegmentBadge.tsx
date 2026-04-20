import { getSegmentColor } from "@/lib/types";

export default function SegmentBadge({ segment }: { segment: string | null | undefined }) {
  const color = getSegmentColor(segment);
  const label = segment || "Outros";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  );
}
