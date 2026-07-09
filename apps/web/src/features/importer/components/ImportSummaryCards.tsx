import { CheckCircle2, CircleAlert, Rows3, TrendingUp } from "lucide-react";
import type { ImportSummary } from "../lib/importApi";
import { Card } from "./Card";

export function ImportSummaryCards({ summary }: { summary: ImportSummary }) {
  const successRate =
    summary.totalRows === 0 ? 0 : Math.round((summary.totalImported / summary.totalRows) * 100);

  const cards = [
    {
      label: "Total Rows",
      value: summary.totalRows.toLocaleString(),
      icon: Rows3,
      tone: "bg-slate-50 text-slate-700"
    },
    {
      label: "Imported",
      value: summary.totalImported.toLocaleString(),
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700"
    },
    {
      label: "Skipped",
      value: summary.totalSkipped.toLocaleString(),
      icon: CircleAlert,
      tone: "bg-amber-50 text-amber-700"
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      tone: "bg-teal-50 text-teal-700"
    }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card className="p-4" key={card.label}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-[#111827]">{card.value}</p>
              </div>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
