import { ClipboardList } from "lucide-react";

export function EmptyState() {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-line bg-soft p-5 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-sky shadow-sm">
        <ClipboardList aria-hidden="true" className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">
        No import results yet
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Upload a CSV to preview rows. Confirmed imports will show mapped CRM
        leads, skipped records, and batch totals here.
      </p>
    </div>
  );
}
