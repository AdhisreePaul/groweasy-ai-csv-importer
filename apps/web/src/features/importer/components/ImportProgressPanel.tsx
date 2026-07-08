import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

export type ImportProgressStep =
  | "uploading"
  | "parsing"
  | "mapping"
  | "validating"
  | "complete";

interface ImportProgressPanelProps {
  error: string | null;
  isImporting: boolean;
  step: ImportProgressStep;
  onRetry: () => void;
}

const steps: Array<{ id: ImportProgressStep; label: string; detail: string }> = [
  {
    id: "uploading",
    label: "Uploading",
    detail: "Sending the confirmed CSV to Express."
  },
  {
    id: "parsing",
    label: "Parsing CSV",
    detail: "Reading headers, raw rows, and empty records."
  },
  {
    id: "mapping",
    label: "AI mapping",
    detail: "Batching rows into GrowEasy CRM lead fields."
  },
  {
    id: "validating",
    label: "Validating records",
    detail: "Checking contacts, enums, and skipped rows."
  },
  {
    id: "complete",
    label: "Complete",
    detail: "Import response is ready for review."
  }
];

export function ImportProgressPanel({
  error,
  isImporting,
  step,
  onRetry
}: ImportProgressPanelProps) {
  const activeIndex = steps.findIndex((item) => item.id === step);
  const progressValue =
    activeIndex < 0 ? 0 : Math.round(((activeIndex + 1) / steps.length) * 100);

  return (
    <section
      aria-labelledby="progress-heading"
      className="rounded-lg border border-line bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink" id="progress-heading">
            Import progress
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            This starts only after Confirm Import. Preview remains available
            while AI processing runs.
          </p>
        </div>
        {isImporting ? (
          <div className="inline-flex items-center gap-2 rounded-md bg-sky-soft px-3 py-2 text-sm font-medium text-sky-ink">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Processing
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-ink">
            {error ? "Import needs attention" : steps[activeIndex]?.label}
          </span>
          <span className="text-muted">{error ? "Paused" : `${progressValue}%`}</span>
        </div>
        <div
          aria-label="Import progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={error ? undefined : progressValue}
          className="mt-2 h-2 overflow-hidden rounded-full bg-soft"
          role="progressbar"
        >
          <div
            className={`h-full rounded-full transition-all ${
              error ? "w-full bg-rose" : "bg-leaf"
            }`}
            style={{ width: error ? "100%" : `${progressValue}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((item, index) => {
          const isComplete = !error && index < activeIndex;
          const isActive = !error && index === activeIndex;
          const isFinalComplete = !error && step === "complete";

          return (
            <li className="flex gap-3" key={item.id}>
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                  isComplete || isFinalComplete
                    ? "border-leaf bg-mint text-leaf"
                    : isActive
                      ? "border-sky bg-sky-soft text-sky"
                      : "border-line bg-soft text-muted"
                }`}
              >
                {isComplete || isFinalComplete ? (
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="mt-1 text-sm leading-5 text-muted">
                  {item.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div
          aria-live="polite"
          className="mt-5 rounded-md border border-rose/30 bg-rose/10 p-4"
          role="alert"
        >
          <div className="flex gap-2 text-sm leading-5 text-rose">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4" />
            <p>{error}</p>
          </div>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose/30 bg-white px-4 text-sm font-semibold text-rose transition hover:bg-rose/10 focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2"
            onClick={onRetry}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Retry import
          </button>
        </div>
      ) : null}
    </section>
  );
}
