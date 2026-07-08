import { CRM_FIELDS, type ImportedRecord } from "@groweasy/shared";
import { StatusBadge } from "./StatusBadge";

export function ImportedRecordsTable({
  records
}: {
  records: ImportedRecord[];
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-white px-4 py-10 text-center">
        <p className="text-sm font-semibold text-[#111827]">
          No imported records yet
        </p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Valid CRM leads will appear here after a successful import.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-[1560px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#F9FAFB] text-xs uppercase tracking-wide text-[#111827]">
            <tr>
              <th className="border-b border-[#E5E7EB] px-4 py-3 font-bold">
                Row
              </th>
              {CRM_FIELDS.map((field) => (
                <th
                  className="border-b border-[#E5E7EB] px-4 py-3 font-bold"
                  key={field}
                >
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {records.map((record) => (
              <tr className="text-[#374151]" key={record.source_row}>
                <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#6B7280]">
                  {record.source_row}
                </td>
                {CRM_FIELDS.map((field) => (
                  <td
                    className="max-w-[220px] px-4 py-4 align-top"
                    key={`${record.source_row}-${field}`}
                  >
                    {field === "crm_status" ? (
                      <StatusBadge status={record.crm_status} />
                    ) : (
                      <span className="line-clamp-2 break-words">
                        {record[field] || "-"}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
