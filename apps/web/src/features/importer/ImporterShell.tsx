"use client";

import { DATA_SOURCES } from "@groweasy/shared";
import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Table2,
  UsersRound
} from "lucide-react";
import { EmptyState } from "./components/EmptyState";
import { ImportHeader } from "./components/ImportHeader";
import { ImportProgressPanel } from "./components/ImportProgressPanel";
import type { ImportProgressStep } from "./components/ImportProgressPanel";
import { ImportResultDetails } from "./components/ImportResultDetails";
import { MetricCard } from "./components/MetricCard";
import { RawPreviewTable } from "./components/RawPreviewTable";
import { SourcePill } from "./components/SourcePill";
import { UploadCard } from "./components/UploadCard";
import { WorkflowStep } from "./components/WorkflowStep";
import {
  parseCsvPreview,
  validateCsvFile,
  type CsvPreview
} from "./lib/csvPreview";
import {
  ImportRequestError,
  importCsvFile,
  type ImportApiResponse
} from "./lib/importApi";

const workflowSteps = [
  {
    title: "Preview raw CSV",
    description: "Inspect headers and rows before anything reaches AI.",
    icon: Table2,
    status: "Ready"
  },
  {
    title: "Confirm import",
    description: "Send the original file to the backend only after review.",
    icon: ShieldCheck,
    status: "Locked"
  },
  {
    title: "AI CRM mapping",
    description: "Batch records into GrowEasy lead fields and skip bad rows.",
    icon: Bot,
    status: "Mock"
  }
];

const automationSignals = [
  {
    label: "WhatsApp-ready",
    detail: "Keeps first mobile clean for follow-up flows.",
    icon: MessageSquareText
  },
  {
    label: "Telephony-safe",
    detail: "Separates country code from the primary number.",
    icon: PhoneCall
  },
  {
    label: "AI assisted",
    detail: "Messy notes become structured CRM context.",
    icon: Sparkles
  }
];

export function ImporterShell() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportApiResponse | null>(
    null
  );
  const [progressStep, setProgressStep] =
    useState<ImportProgressStep>("uploading");

  useEffect(() => {
    if (!isImporting) {
      return undefined;
    }

    const steps: ImportProgressStep[] = [
      "uploading",
      "parsing",
      "mapping",
      "validating"
    ];
    let index = 0;
    setProgressStep(steps[index] ?? "uploading");

    const interval = window.setInterval(() => {
      index = Math.min(index + 1, steps.length - 1);
      setProgressStep(steps[index] ?? "validating");
    }, 1400);

    return () => window.clearInterval(interval);
  }, [isImporting]);

  const handleSelectFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setPreview(null);
    setError(null);
    setImportError(null);
    setImportResult(null);
    setProgressStep("uploading");
    setIsParsing(true);

    const validationError = validateCsvFile(file);

    if (validationError) {
      setError(validationError);
      setIsParsing(false);
      return;
    }

    try {
      const text = await file.text();
      setPreview(parseCsvPreview(text));
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "We could not read this CSV. Check the file and try again."
      );
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setIsParsing(false);
    setIsImporting(false);
    setImportError(null);
    setImportResult(null);
    setProgressStep("uploading");
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!preview || !selectedFile) {
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await importCsvFile(selectedFile);
      setImportResult(result);
      setProgressStep("complete");
    } catch (requestError) {
      setImportError(getImportErrorMessage(requestError));
    } finally {
      setIsImporting(false);
    }
  }, [preview, selectedFile]);

  const rowsDetected = importResult?.summary.totalRows ?? preview?.totalRows ?? 0;
  const importedCount = importResult?.summary.totalImported ?? 0;
  const skippedCount = importResult?.summary.totalSkipped ?? 0;
  const successRate =
    rowsDetected === 0 ? "0%" : `${Math.round((importedCount / rowsDetected) * 100)}%`;

  return (
    <main className={`min-h-screen bg-canvas text-ink ${isDarkMode ? "dark" : ""}`}>
      <ImportHeader
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((current) => !current)}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section
          aria-labelledby="import-heading"
          className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]"
        >
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold text-leaf">
                    AI-powered lead import
                  </p>
                  <h1
                    className="mt-2 text-3xl font-semibold tracking-normal text-ink sm:text-4xl"
                    id="import-heading"
                  >
                    Import leads from any CSV format
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                    Preview raw CSV rows first, then confirm import to map
                    messy lead data into GrowEasy CRM fields for ads,
                    WhatsApp, AI agents, and calling workflows.
                  </p>
                </div>

                <div className="grid min-w-64 grid-cols-2 gap-3 rounded-md border border-line bg-soft p-3">
                  <MetricCard label="Mode" value="Preview first" />
                  <MetricCard label="AI calls" value="On confirm" />
                </div>
              </div>
            </div>

            <UploadCard
              canConfirm={Boolean(selectedFile && preview && !error)}
              error={error}
              isImporting={isImporting}
              isParsing={isParsing}
              onClearFile={handleClearFile}
              onConfirmImport={handleConfirmImport}
              onSelectFile={handleSelectFile}
              preview={preview}
              selectedFile={selectedFile}
            />

            <RawPreviewTable preview={preview} />

            {isImporting || importError || importResult ? (
              <ImportProgressPanel
                error={importError}
                isImporting={isImporting}
                onRetry={handleConfirmImport}
                step={progressStep}
              />
            ) : null}

            {importResult ? (
              <ImportResultDetails
                onReset={handleClearFile}
                result={importResult}
              />
            ) : null}

            <section
              aria-labelledby="workflow-heading"
              className="rounded-lg border border-line bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2
                    className="text-base font-semibold text-ink"
                    id="workflow-heading"
                  >
                    Import workflow
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Built to keep preview, confirmation, and AI extraction
                    separate.
                  </p>
                </div>
                <CheckCircle2
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-leaf"
                />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {workflowSteps.map((step) => (
                  <WorkflowStep key={step.title} {...step} />
                ))}
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            <section
              aria-labelledby="summary-heading"
              className="rounded-lg border border-line bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-base font-semibold text-ink"
                    id="summary-heading"
                  >
                    Import summary
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Results will appear here after confirmation.
                  </p>
                </div>
                <UsersRound
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-sky"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricCard
                  label="Rows detected"
                  value={rowsDetected.toLocaleString()}
                  tone="neutral"
                />
                <MetricCard
                  label="Imported"
                  value={importedCount.toLocaleString()}
                  tone="success"
                />
                <MetricCard
                  label="Skipped"
                  value={skippedCount.toLocaleString()}
                  tone="warning"
                />
                <MetricCard
                  label="Success rate"
                  value={successRate}
                  tone="info"
                />
              </div>

              {importResult ? (
                <div className="mt-5 rounded-lg border border-leaf/20 bg-mint p-5 text-center">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mx-auto h-6 w-6 text-leaf"
                  />
                  <h3 className="mt-3 text-sm font-semibold text-ink">
                    Results ready
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Imported and skipped CRM records are shown in the results
                    table.
                  </p>
                </div>
              ) : (
                <EmptyState />
              )}
            </section>

            <section
              aria-labelledby="sources-heading"
              className="rounded-lg border border-line bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet
                  aria-hidden="true"
                  className="h-5 w-5 text-leaf"
                />
                <h2
                  className="text-base font-semibold text-ink"
                  id="sources-heading"
                >
                  CRM data sources
                </h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {DATA_SOURCES.map((source) => (
                  <SourcePill key={source} source={source} />
                ))}
              </div>
            </section>

            <section
              aria-labelledby="automation-heading"
              className="rounded-lg border border-line bg-white p-5 shadow-sm"
            >
              <h2
                className="text-base font-semibold text-ink"
                id="automation-heading"
              >
                Downstream readiness
              </h2>
              <div className="mt-4 space-y-4">
                {automationSignals.map((signal) => {
                  const Icon = signal.icon;

                  return (
                    <div className="flex gap-3" key={signal.label}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mint text-leaf">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {signal.label}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-muted">
                          {signal.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function getImportErrorMessage(error: unknown): string {
  if (error instanceof ImportRequestError) {
    return error.status
      ? `${error.message} (${error.code}, HTTP ${error.status})`
      : `${error.message} (${error.code})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Import failed. Please retry the request.";
}
