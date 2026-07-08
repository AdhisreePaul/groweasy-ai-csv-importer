"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ImportCsvModal } from "./components/ImportCsvModal";
import type { ImportProgressStep } from "./components/ImportProgress";
import { LeadSourcesPage } from "./components/LeadSourcesPage";
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

const sampleTemplate = [
  [
    "created_at",
    "name",
    "email",
    "country_code",
    "mobile_without_country_code",
    "company",
    "city",
    "state",
    "country",
    "lead_owner",
    "crm_status",
    "crm_note",
    "data_source",
    "possession_time",
    "description"
  ],
  [
    "2026-07-08",
    "Aarav Mehta",
    "aarav.mehta@example.com",
    "91",
    "9876501234",
    "Demo Realty",
    "Bengaluru",
    "Karnataka",
    "India",
    "GrowEasy AI",
    "GOOD_LEAD_FOLLOW_UP",
    "Interested in Sarjapur plots",
    "sarjapur_plots",
    "Q3 2026",
    "Lead from sample CSV template"
  ]
];

export function ImporterShell() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      setIsModalOpen(false);
    } catch (requestError) {
      setImportError(getImportErrorMessage(requestError));
    } finally {
      setIsImporting(false);
    }
  }, [preview, selectedFile]);

  const handleOpenImport = useCallback(() => {
    setImportError(null);
    setIsModalOpen(true);
  }, []);

  const handleImportAnotherCsv = useCallback(() => {
    handleClearFile();
    setIsModalOpen(true);
  }, [handleClearFile]);

  const handleDownloadSample = useCallback(() => {
    const csv = sampleTemplate.map((row) => row.map(escapeCsvCell).join(","));
    const blob = new Blob([csv.join("\n")], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "groweasy-sample-template.csv";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleCopyJson = useCallback(async () => {
    if (!importResult) {
      return;
    }

    const json = JSON.stringify(importResult, null, 2);

    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = json;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }, [importResult]);

  const handleExportJson = useCallback(() => {
    if (!importResult) {
      return;
    }

    const blob = new Blob([JSON.stringify(importResult, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "groweasy-import-results.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [importResult]);

  return (
    <AppShell>
      <LeadSourcesPage
        importResult={importResult}
        onCopyJson={handleCopyJson}
        onExportJson={handleExportJson}
        onOpenImport={handleOpenImport}
        onResetImport={handleImportAnotherCsv}
      />

      <ImportCsvModal
        canConfirm={Boolean(selectedFile && preview && !error)}
        error={error}
        importError={importError}
        isImporting={isImporting}
        isOpen={isModalOpen}
        isParsing={isParsing}
        onCancel={() => setIsModalOpen(false)}
        onConfirmImport={handleConfirmImport}
        onDownloadSample={handleDownloadSample}
        onRemoveFile={handleClearFile}
        onRetry={handleConfirmImport}
        onSelectFile={handleSelectFile}
        preview={preview}
        progressStep={progressStep}
        selectedFile={selectedFile}
      />
    </AppShell>
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

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
