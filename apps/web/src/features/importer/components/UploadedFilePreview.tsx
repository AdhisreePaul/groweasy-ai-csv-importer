import { FileText, X } from "lucide-react";
import { formatFileSize, type CsvPreview } from "../lib/csvPreview";

interface UploadedFilePreviewProps {
  file: File;
  onRemove: () => void;
  preview: CsvPreview | null;
}

export function UploadedFilePreview({
  file,
  onRemove,
  preview
}: UploadedFilePreviewProps) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-[#BFE7E0] bg-[#DDF5F1] text-[#0F766E]">
          <FileText aria-hidden="true" className="h-5 w-5" />
          <span className="mt-0.5 text-[9px] font-bold uppercase">CSV</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#111827]">
            {file.name}
          </p>
          <p className="mt-1 text-xs font-medium text-[#6B7280]">
            {formatFileSize(file.size)}
            {preview ? ` • ${preview.totalRows.toLocaleString()} rows` : ""}
          </p>
        </div>
        <button
          aria-label="Remove selected CSV"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
          onClick={onRemove}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
