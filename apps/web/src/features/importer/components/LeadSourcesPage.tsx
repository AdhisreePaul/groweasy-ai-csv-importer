import {
  Copy,
  Download,
  Link,
  Megaphone,
  MessageCircle,
  PhoneCall,
  Plus,
  Search,
  Upload,
  UserPlus
} from "lucide-react";
import type { ImportApiResponse } from "../lib/importApi";
import { Button } from "./Button";
import { Card } from "./Card";
import { ImportedRecordsTable } from "./ImportedRecordsTable";
import { ImportSummaryCards } from "./ImportSummaryCards";
import { SkippedRecordsTable } from "./SkippedRecordsTable";

interface LeadSourcesPageProps {
  importResult: ImportApiResponse | null;
  onCopyJson: () => void;
  onExportJson: () => void;
  onOpenImport: () => void;
  onResetImport: () => void;
}

const sourceCards = [
  {
    title: "Google Ads",
    status: "Not Connected",
    detail: "Inactive",
    icon: Megaphone,
    accent: "text-blue-600 bg-blue-50"
  },
  {
    title: "WhatsApp",
    status: "Connected",
    detail: "2 Numbers",
    icon: MessageCircle,
    accent: "text-emerald-600 bg-emerald-50"
  },
  {
    title: "Telephony",
    status: "Connected",
    detail: "2 Numbers",
    icon: PhoneCall,
    accent: "text-[#0F766E] bg-[#DDF5F1]"
  }
];

export function LeadSourcesPage({
  importResult,
  onCopyJson,
  onExportJson,
  onOpenImport,
  onResetImport
}: LeadSourcesPageProps) {
  return (
    <div className="min-h-screen" id="lead-sources">
      <header className="border-b border-[#E5E7EB] bg-white px-5 py-6 sm:px-8 lg:px-11">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-[#111827]">
              Lead Sources
            </h1>
            <p className="mt-2 text-base font-medium text-[#6B7280]">
              Connect, manage, and control all your lead channels from one
              dashboard.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-h-11 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[#6B7280]">
              <Search aria-hidden="true" className="h-4 w-4" />
              <span className="ml-2 text-sm">Search lead sources</span>
            </div>
            <Button
              icon={<Upload aria-hidden="true" className="h-4 w-4" />}
              onClick={onOpenImport}
              variant="primary"
            >
              Upload File
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-5 py-6 sm:px-8 lg:px-11">
        <section
          aria-label="Lead source actions"
          className="grid gap-4 xl:grid-cols-2"
        >
          <button
            className="group rounded-lg border border-dashed border-[#D1D5DB] bg-white p-6 text-left transition hover:border-[#0F766E] hover:bg-[#F8FCFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
            onClick={onOpenImport}
            type="button"
          >
            <div className="flex items-center gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#DDF5F1] text-[#0F766E]">
                <Upload aria-hidden="true" className="h-7 w-7" />
              </span>
              <span>
                <span className="block text-xl font-bold text-[#111827]">
                  Add Leads via CSV
                </span>
                <span className="mt-1 block text-sm font-medium text-[#6B7280]">
                  Bulk import leads from a file
                </span>
              </span>
            </div>
          </button>

          <Card className="border-dashed p-6">
            <div className="flex items-center gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#DDF5F1] text-[#0F766E]">
                <UserPlus aria-hidden="true" className="h-7 w-7" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#111827]">
                  Add Single Lead
                </h2>
                <p className="mt-1 text-sm font-medium text-[#6B7280]">
                  Manually add a new lead
                </p>
              </div>
            </div>
          </Card>
        </section>

        {importResult ? (
          <section aria-labelledby="manage-leads-heading" className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2
                  className="text-2xl font-bold text-[#111827]"
                  id="manage-leads-heading"
                >
                  Manage Your Leads
                </h2>
                <p className="mt-1 text-sm font-medium text-[#6B7280]">
                  Review imported CRM records and skipped rows from the latest
                  CSV run.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  icon={<Copy aria-hidden="true" className="h-4 w-4" />}
                  onClick={onCopyJson}
                  variant="secondary"
                >
                  Copy JSON
                </Button>
                <Button
                  icon={<Download aria-hidden="true" className="h-4 w-4" />}
                  onClick={onExportJson}
                >
                  Export JSON
                </Button>
                <Button
                  icon={<Plus aria-hidden="true" className="h-4 w-4" />}
                  onClick={onResetImport}
                  variant="primary"
                >
                  Import Another CSV
                </Button>
              </div>
            </div>

            <ImportSummaryCards summary={importResult.summary} />

            <Card className="p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#111827]">
                    Imported Records
                  </h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Exact GrowEasy CRM fields returned by the backend.
                  </p>
                </div>
              </div>
              <ImportedRecordsTable records={importResult.importedRecords} />
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-[#111827]">
                  Skipped Records
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Rows without usable contact info or with validation issues
                  stay visible for review.
                </p>
              </div>
              <SkippedRecordsTable records={importResult.skippedRecords} />
            </Card>
          </section>
        ) : (
          <section aria-labelledby="active-sources-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2
                  className="text-2xl font-bold text-[#111827]"
                  id="active-sources-heading"
                >
                  Active Lead Channels
                </h2>
                <p className="mt-1 text-sm font-medium text-[#6B7280]">
                  Import a CSV to turn offline sheets into CRM-ready leads.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {sourceCards.map((source) => {
                const Icon = source.icon;
                const isConnected = source.status === "Connected";

                return (
                  <Card className="p-5" key={source.title}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span
                          className={`flex h-14 w-14 items-center justify-center rounded-lg ${source.accent}`}
                        >
                          <Icon aria-hidden="true" className="h-7 w-7" />
                        </span>
                        <div>
                          <h3 className="text-xl font-bold text-[#111827]">
                            {source.title}
                          </h3>
                          <p
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              isConnected
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-[#F3F4F6] text-[#374151]"
                            }`}
                          >
                            {source.status}
                          </p>
                          <span className="ml-2 text-sm font-semibold text-[#6B7280]">
                            {source.detail}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#111827] transition hover:bg-[#F9FAFB]"
                      type="button"
                    >
                      <Link aria-hidden="true" className="h-4 w-4" />
                      Connect
                    </button>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
