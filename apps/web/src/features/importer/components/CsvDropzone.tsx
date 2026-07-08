import { Download, Info, Loader2, Upload } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "./Button";

interface CsvDropzoneProps {
  error: string | null;
  isParsing: boolean;
  onDownloadSample: () => void;
  onSelectFile: (file: File) => void;
}

export function CsvDropzone({
  error,
  isParsing,
  onDownloadSample,
  onSelectFile
}: CsvDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className={`rounded-lg border border-dashed p-7 text-center transition ${
        isDragging
          ? "border-[#0F766E] bg-[#F0FBF8]"
          : "border-[#D1D5DB] bg-white"
      }`}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files.item(0);

        if (file) {
          onSelectFile(file);
        }
      }}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-[#BFE7E0] bg-[#DDF5F1] text-[#0F766E]">
        {isParsing ? (
          <Loader2 aria-hidden="true" className="h-7 w-7 animate-spin" />
        ) : (
          <Upload aria-hidden="true" className="h-7 w-7" />
        )}
      </div>

      <h3 className="mt-6 text-xl font-bold text-[#111827]">
        Drop your CSV file here
      </h3>
      <p className="mt-1 text-sm font-medium text-[#6B7280]">
        or click to browse files
      </p>

      <input
        accept=".csv,text/csv"
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onSelectFile(file);
          }

          event.target.value = "";
        }}
        type="file"
      />
      <label
        className="mx-auto mt-5 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-sm font-semibold text-[#4B5563] transition hover:border-[#BFE7E0] hover:bg-[#F0FBF8] hover:text-[#0F766E]"
        htmlFor={inputId}
      >
        <Info aria-hidden="true" className="mr-2 h-4 w-4" />
        Supported file: .csv (max 5MB)
      </label>

      <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-[#6B7280]">
        Any valid CSV can be previewed here. AI extraction starts only after
        you confirm the import.
      </p>

      {error ? (
        <p className="mx-auto mt-4 max-w-md rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <Button
        className="mt-5"
        icon={<Download aria-hidden="true" className="h-4 w-4" />}
        onClick={onDownloadSample}
        variant="secondary"
      >
        Download Sample CSV Template
      </Button>
    </div>
  );
}
