import { Loader2, X } from "lucide-react";
import type { CsvPreview } from "../lib/csvPreview";
import { Button } from "./Button";
import { CsvDropzone } from "./CsvDropzone";
import { CsvPreviewTable } from "./CsvPreviewTable";
import { ImportProgress, type ImportProgressStep } from "./ImportProgress";
import { UploadedFilePreview } from "./UploadedFilePreview";

interface ImportCsvModalProps {
  canConfirm: boolean;
  error: string | null;
  importError: string | null;
  isImporting: boolean;
  isOpen: boolean;
  isParsing: boolean;
  onCancel: () => void;
  onConfirmImport: () => void;
  onDownloadSample: () => void;
  onRemoveFile: () => void;
  onRetry: () => void;
  onSelectFile: (file: File) => void;
  preview: CsvPreview | null;
  progressStep: ImportProgressStep;
  selectedFile: File | null;
}

export function ImportCsvModal({
  canConfirm,
  error,
  importError,
  isImporting,
  isOpen,
  isParsing,
  onCancel,
  onConfirmImport,
  onDownloadSample,
  onRemoveFile,
  onRetry,
  onSelectFile,
  preview,
  progressStep,
  selectedFile
}: ImportCsvModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="import-csv-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6"
      role="dialog"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8">
          <div>
            <h2
              className="text-2xl font-bold tracking-normal text-[#111827]"
              id="import-csv-modal-title"
            >
              Import Leads via CSV
            </h2>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              Upload a CSV file to bulk import leads into your system.
            </p>
          </div>
          <button
            aria-label="Close import modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-5 sm:px-8">
          {selectedFile ? (
            <>
              <UploadedFilePreview
                file={selectedFile}
                onRemove={onRemoveFile}
                preview={preview}
              />
              {error ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}
              {!error && !preview && isParsing ? (
                <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4 text-sm font-semibold text-[#374151]">
                  <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin text-[#0F766E]"
                  />
                  Preparing raw CSV preview...
                </div>
              ) : null}
              {preview ? <CsvPreviewTable preview={preview} /> : null}
            </>
          ) : (
            <CsvDropzone
              error={error}
              isParsing={isParsing}
              onDownloadSample={onDownloadSample}
              onSelectFile={onSelectFile}
            />
          )}

          <ImportProgress
            error={importError}
            isImporting={isImporting}
            onRetry={onRetry}
            step={progressStep}
          />
        </div>

        <div className="grid gap-4 border-t border-[#F3F4F6] px-6 py-5 sm:grid-cols-2 sm:px-8">
          <Button
            className="min-h-12 text-base"
            disabled={isImporting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="min-h-12 text-base"
            disabled={!canConfirm || isImporting}
            onClick={onConfirmImport}
            variant="primary"
          >
            {isImporting ? "Importing..." : selectedFile ? "Confirm Import" : "Upload File"}
          </Button>
        </div>
      </div>
    </div>
  );
}
