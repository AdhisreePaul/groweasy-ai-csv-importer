type MetricTone = "neutral" | "success" | "warning" | "info";

const toneClassName: Record<MetricTone, string> = {
  neutral: "bg-white text-ink",
  success: "bg-mint text-leaf",
  warning: "bg-amber-soft text-amber-ink",
  info: "bg-sky-soft text-sky-ink"
};

interface MetricCardProps {
  label: string;
  value: string;
  tone?: MetricTone;
}

export function MetricCard({ label, value, tone = "neutral" }: MetricCardProps) {
  return (
    <div className={`min-h-20 rounded-md border border-line p-3 ${toneClassName[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
    </div>
  );
}
