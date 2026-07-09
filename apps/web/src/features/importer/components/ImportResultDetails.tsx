import { CRM_FIELDS, type CrmStatus } from "@groweasy/shared";
import { CheckCircle2, CircleAlert, Clipboard, Download, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricCard } from "./MetricCard";
import type { ImportApiResponse } from "../lib/importApi";

interface ImportResultDetailsProps {
  result: ImportApiResponse;
  onReset: () => void;
}

const statusClassName: Record<CrmStatus, string> = {
  GOOD_LEAD_FOLLOW_UP: "border-sky/30 bg-sky-soft text-sky-ink",
  DID_NOT_CONNECT: "border-amber/30 bg-amber-soft text-amber-ink",
  BAD_LEAD: "border-rose/30 bg-rose/10 text-rose",
  SALE_DONE: "border-leaf/30 bg-mint text-leaf"
};

const secondaryActionClassName = [
  "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line",
  "bg-white px-4 text-sm font-semibold text-ink transition hover:bg-soft",
  "focus:outline-none focus:ring-2 focus:ring-sky focus:ring-offset-2"
].join(" ");

const primaryActionClassName = [
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-leaf px-4",
  "text-sm font-semibold text-white shadow-sm transition hover:bg-leaf-dark",
  "focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2"
].join(" ");

export function ImportResultDetails({ result, onReset }: ImportResultDetailsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const successRate = getSuccessRate(result.summary.totalImported, result.summary.totalRows);
  const formattedJson = useMemo(() => JSON.stringify(result, null, 2), [result]);

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  }

  function handleDownloadJson() {
    const blob = new Blob([formattedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "groweasy-import-result.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      aria-labelledby="results-heading"
      className="rounded-lg border border-line bg-white shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-leaf" />
            <h2 className="text-lg font-semibold text-ink" id="results-heading">
              Imported CRM records
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review the final AI-extracted GrowEasy CRM payload, including every imported record and
            every skipped row.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button className={secondaryActionClassName} onClick={handleCopyJson} type="button">
            <Clipboard aria-hidden="true" className="h-4 w-4" />
            {copyState === "copied"
              ? "Copied JSON"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy JSON"}
          </button>
          <button className={secondaryActionClassName} onClick={handleDownloadJson} type="button">
            <Download aria-hidden="true" className="h-4 w-4" />
            Export JSON
          </button>
          <button className={primaryActionClassName} onClick={onReset} type="button">
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Import another CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total rows" value={result.summary.totalRows.toLocaleString()} />
        <MetricCard
          label="Total imported"
          tone="success"
          value={result.summary.totalImported.toLocaleString()}
        />
        <MetricCard
          label="Total skipped"
          tone="warning"
          value={result.summary.totalSkipped.toLocaleString()}
        />
        <MetricCard label="Success rate" tone="info" value={successRate} />
      </div>

      {result.summary.failedBatches > 0 ? (
        <div className="border-b border-line bg-amber-soft p-5">
          <div className="flex gap-2 text-sm font-semibold text-amber-ink">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4" />
            <p>
              {result.summary.failedBatches.toLocaleString()} AI batches failed after retry.
              Successfully validated records are still listed.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-6 p-5 sm:p-6">
        <ImportedRecordsTable result={result} />
        <SkippedRecordsPanel result={result} />
      </div>
    </section>
  );
}

function ImportedRecordsTable({ result }: { result: ImportApiResponse }) {
  if (result.importedRecords.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-soft p-5 text-center">
        <h3 className="text-sm font-semibold text-ink">No imported records</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          The backend completed the import, but no rows met the CRM contact requirements.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="imported-table-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink" id="imported-table-heading">
            Imported records
          </h3>
          <p className="mt-1 text-sm text-muted">Exact CRM fields returned by the backend.</p>
        </div>
        <span className="text-sm font-medium text-muted">
          {result.importedRecords.length.toLocaleString()} rows
        </span>
      </div>

      <div className="mt-4 max-h-[560px] overflow-auto rounded-lg border border-line">
        <table className="min-w-[2200px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-soft">
            <tr>
              <th
                className="sticky left-0 z-20 w-24 border-b border-r border-line bg-soft px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
                scope="col"
              >
                Row
              </th>
              {CRM_FIELDS.map((field) => (
                <th
                  className="min-w-40 border-b border-r border-line px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
                  key={field}
                  scope="col"
                >
                  {formatFieldName(field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.importedRecords.map((record) => (
              <tr className="even:bg-soft/60" key={record.source_row}>
                <th
                  className="sticky left-0 z-[1] border-b border-r border-line bg-white px-3 py-3 text-xs font-semibold text-muted"
                  scope="row"
                >
                  {record.source_row}
                </th>
                {CRM_FIELDS.map((field) => (
                  <td
                    className="max-w-80 border-b border-r border-line px-3 py-3 align-top text-ink"
                    key={`${record.source_row}-${field}`}
                  >
                    {field === "crm_status" ? (
                      <StatusBadge status={record.crm_status} />
                    ) : (
                      <span className="block max-h-20 overflow-hidden break-words">
                        {record[field] || (
                          <span
                            aria-label={`${formatFieldName(field)} is blank`}
                            className="text-muted/60"
                          >
                            -
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SkippedRecordsPanel({ result }: { result: ImportApiResponse }) {
  return (
    <section aria-labelledby="skipped-table-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink" id="skipped-table-heading">
            Skipped records
          </h3>
          <p className="mt-1 text-sm text-muted">
            Every skipped row is shown with its source row and reason.
          </p>
        </div>
        <span className="rounded-md bg-amber-soft px-3 py-2 text-sm font-semibold text-amber-ink">
          {result.skippedRecords.length.toLocaleString()} skipped
        </span>
      </div>

      {result.skippedRecords.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-soft p-5 text-center">
          <h4 className="text-sm font-semibold text-ink">No skipped records</h4>
          <p className="mt-2 text-sm leading-6 text-muted">
            All parsed rows produced valid CRM records.
          </p>
        </div>
      ) : (
        <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-amber/30">
          <table className="min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-amber-soft">
              <tr>
                <th
                  className="w-24 border-b border-r border-amber/30 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-amber-ink"
                  scope="col"
                >
                  Row
                </th>
                <th
                  className="min-w-64 border-b border-r border-amber/30 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-amber-ink"
                  scope="col"
                >
                  Reason
                </th>
                <th
                  className="min-w-[420px] border-b border-amber/30 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-amber-ink"
                  scope="col"
                >
                  Raw record
                </th>
              </tr>
            </thead>
            <tbody>
              {result.skippedRecords.map((record) => (
                <tr className="even:bg-soft/60" key={record.source_row}>
                  <th
                    className="border-b border-r border-line px-3 py-3 text-xs font-semibold text-muted"
                    scope="row"
                  >
                    {record.source_row}
                  </th>
                  <td className="border-b border-r border-line px-3 py-3 align-top">
                    <div className="flex gap-2 text-amber-ink">
                      <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="break-words text-sm font-medium">{record.reason}</span>
                    </div>
                  </td>
                  <td className="border-b border-line px-3 py-3 align-top">
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-semibold text-ink marker:text-muted">
                        View raw row
                      </summary>
                      <pre className="mt-3 max-h-44 overflow-auto rounded-md bg-soft p-3 text-xs leading-5 text-ink">
                        {JSON.stringify(record.raw_record ?? {}, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: CrmStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClassName[status]}`}
    >
      {formatFieldName(status)}
    </span>
  );
}

function getSuccessRate(imported: number, total: number): string {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((imported / total) * 100)}%`;
}

function formatFieldName(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
