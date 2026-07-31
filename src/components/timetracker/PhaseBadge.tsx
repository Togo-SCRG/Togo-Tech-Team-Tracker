import { phaseColor } from "@/lib/utils";

export function PhaseBadge({ phase }: { phase: string }) {
  if (!phase) return <span className="text-togo-faint">—</span>;

  const { bg, text } = phaseColor(phase);

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}
    >
      {phase}
    </span>
  );
}
