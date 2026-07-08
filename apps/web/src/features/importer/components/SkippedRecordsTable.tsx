import { AlertTriangle } from "lucide-react";
import type { SkippedRecord } from "@groweasy/shared";

export function SkippedRecordsTable({
  records
}: {
  records: SkippedRecord[];
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-5 text-sm font-medium text-emerald-700">
        No skipped records. Every row with usable contact info was imported.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-amber-100 bg-white">
      <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
        Skipped records need review
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="min-w-[680px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-wide text-[#111827]">
            <tr>
              <th className="border-b border-[#E5E7EB] px-4 py-3 font-bold">
                Row
              </th>
              <th className="border-b border-[#E5E7EB] px-4 py-3 font-bold">
                Reason
              </th>
              <th className="border-b border-[#E5E7EB] px-4 py-3 font-bold">
                Raw Data
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {records.map((record) => (
              <tr className="text-[#374151]" key={record.source_row}>
                <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#6B7280]">
                  {record.source_row}
                </td>
                <td className="px-4 py-4 font-medium text-amber-800">
                  {record.reason}
                </td>
                <td className="max-w-[420px] px-4 py-4 text-xs text-[#6B7280]">
                  <code className="line-clamp-3 whitespace-pre-wrap break-words rounded bg-[#F9FAFB] px-2 py-1">
                    {record.raw_record
                      ? JSON.stringify(record.raw_record)
                      : "No raw record supplied"}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
