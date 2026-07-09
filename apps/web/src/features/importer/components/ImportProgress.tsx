import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export type ImportProgressStep = "uploading" | "parsing" | "mapping" | "validating" | "complete";

const progressSteps: Array<{ key: ImportProgressStep; label: string }> = [
  { key: "uploading", label: "Uploading" },
  { key: "parsing", label: "Parsing CSV" },
  { key: "mapping", label: "AI mapping" },
  { key: "validating", label: "Validating records" },
  { key: "complete", label: "Complete" }
];

export function ImportProgress({
  error,
  isImporting,
  onRetry,
  step
}: {
  error: string | null;
  isImporting: boolean;
  onRetry: () => void;
  step: ImportProgressStep;
}) {
  const currentIndex = progressSteps.findIndex((item) => item.key === step);

  if (!isImporting && !error && step !== "complete") {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {error ? (
            <AlertCircle aria-hidden="true" className="h-5 w-5 text-red-600" />
          ) : step === "complete" ? (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-600" />
          ) : (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[#0F766E]" />
          )}
          <p className="text-sm font-bold text-[#111827]">
            {error
              ? "Import failed"
              : step === "complete"
                ? "Import complete"
                : "Import in progress"}
          </p>
        </div>
        {error ? (
          <Button
            icon={<RefreshCw aria-hidden="true" className="h-4 w-4" />}
            onClick={onRetry}
            variant="secondary"
          >
            Retry
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {progressSteps.map((item, index) => {
          const isDone = index < currentIndex || step === "complete";
          const isActive = index === currentIndex && step !== "complete";

          return (
            <div
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                isDone
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : isActive
                    ? "border-[#BFE7E0] bg-[#DDF5F1] text-[#0F766E]"
                    : "border-[#E5E7EB] bg-white text-[#6B7280]"
              }`}
              key={item.key}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
