import { useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  FileUp,
  ShieldCheck,
  Trash2,
  UploadCloud
} from "lucide-react";
import type { CsvPreview } from "../lib/csvPreview";
import { formatFileSize, MAX_CSV_SIZE_BYTES } from "../lib/csvPreview";

interface UploadCardProps {
  canConfirm: boolean;
  error: string | null;
  isImporting: boolean;
  isParsing: boolean;
  preview: CsvPreview | null;
  selectedFile: File | null;
  onClearFile: () => void;
  onConfirmImport: () => void;
  onSelectFile: (file: File) => void;
}

export function UploadCard({
  canConfirm,
  error,
  isImporting,
  isParsing,
  preview,
  selectedFile,
  onClearFile,
  onConfirmImport,
  onSelectFile
}: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onSelectFile(file);
    }

    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    const relatedTarget = event.relatedTarget;

    if (
      !(relatedTarget instanceof Node) ||
      !event.currentTarget.contains(relatedTarget)
    ) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];

    if (file) {
      onSelectFile(file);
    }
  }

  return (
    <section
      aria-labelledby="upload-heading"
      className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink" id="upload-heading">
            CSV upload
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Start with a raw preview. The backend and AI extraction stay idle
            until the final confirmation step.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-mint px-3 py-2 text-sm font-medium text-leaf">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          No AI during preview
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <label
          className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-5 py-8 text-center transition focus-within:outline-none focus-within:ring-2 focus-within:ring-leaf focus-within:ring-offset-2 ${
            isDragging
              ? "border-leaf bg-mint shadow-inner"
              : "border-leaf/40 bg-soft hover:border-leaf hover:bg-mint/40"
          }`}
          htmlFor="csv-file"
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-leaf shadow-sm">
            <UploadCloud aria-hidden="true" className="h-7 w-7" />
          </div>
          <span className="mt-5 text-base font-semibold text-ink">
            Drop a CSV here or choose a file
          </span>
          <span className="mt-2 max-w-lg text-sm leading-6 text-muted">
            Any valid CSV format is accepted, including messy lead sheets from
            ad campaigns, WhatsApp follow-ups, telephony exports, and manual CRM
            lists.
          </span>
          <span className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-leaf px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-leaf-dark">
            <FileUp aria-hidden="true" className="h-4 w-4" />
            Choose CSV
          </span>
          <span className="mt-3 text-xs text-muted">
            CSV only, up to {formatFileSize(MAX_CSV_SIZE_BYTES)}
          </span>
          <input
            accept=".csv,text/csv"
            className="sr-only"
            id="csv-file"
            name="csv-file"
            onChange={handleFileChange}
            type="file"
          />
        </label>

        <div className="rounded-lg border border-line bg-white p-4">
          <h3 className="text-sm font-semibold text-ink">Selected file</h3>

          {selectedFile ? (
            <div className="mt-4 rounded-md border border-line bg-soft p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-sky shadow-sm">
                  <FileText aria-hidden="true" className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  aria-label="Remove selected CSV"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-white text-muted transition hover:text-rose focus:outline-none focus:ring-2 focus:ring-rose focus:ring-offset-2"
                  onClick={onClearFile}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              {preview ? (
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-leaf">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  {preview.totalRows.toLocaleString()} rows ready to preview
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-dashed border-line bg-soft p-3 text-sm leading-6 text-muted">
              No CSV selected yet. Drag a file into the upload area or use the
              file picker.
            </p>
          )}

          {error ? (
            <div
              aria-live="polite"
              className="mt-4 flex gap-2 rounded-md border border-rose/30 bg-rose/10 p-3 text-sm leading-5 text-rose"
              role="alert"
            >
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4" />
              <p>{error}</p>
            </div>
          ) : null}

          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-leaf px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-leaf-dark focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-white disabled:text-muted disabled:shadow-none"
            disabled={!canConfirm || isParsing || isImporting}
            onClick={onConfirmImport}
            type="button"
          >
            {isParsing
              ? "Reading CSV"
              : isImporting
                ? "Importing leads"
                : "Confirm import"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>

          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-leaf" />
              Raw headers and rows appear before import.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky" />
              Confirm Import sends the original CSV to Express.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" />
              Records without email or mobile are skipped.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
