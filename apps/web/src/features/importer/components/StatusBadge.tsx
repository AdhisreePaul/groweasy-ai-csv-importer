import type { CrmStatus } from "@groweasy/shared";

const statusStyles: Record<CrmStatus, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  DID_NOT_CONNECT: "bg-yellow-50 text-yellow-700 ring-yellow-100",
  BAD_LEAD: "bg-red-50 text-red-700 ring-red-100",
  SALE_DONE: "bg-teal-50 text-teal-700 ring-teal-100"
};

const statusLabels: Record<CrmStatus, string> = {
  GOOD_LEAD_FOLLOW_UP: "Good Lead",
  DID_NOT_CONNECT: "Did Not Connect",
  BAD_LEAD: "Bad Lead",
  SALE_DONE: "Sale Done"
};

export function StatusBadge({ status }: { status: CrmStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
