import { Copy, Download, Plus, Upload, UserPlus } from "lucide-react";
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

export function LeadSourcesPage({
  importResult,
  onCopyJson,
  onExportJson,
  onOpenImport,
  onResetImport
}: LeadSourcesPageProps) {
  return (
    <div className="min-h-screen bg-white" id="lead-sources">
      <header className="border-b border-[#ECEFF3] bg-white px-[24px] py-[17px] sm:px-[40px]">
        <h1 className="text-[24px] font-extrabold leading-[29px] tracking-[-0.02em] text-[#0F172A]">
          Lead Sources
        </h1>
        <p className="mt-[4px] text-[14px] font-normal leading-[21px] tracking-[-0.005em] text-[#4F5665]">
          Connect, manage, and control all your lead channels from one
          dashboard.
        </p>
      </header>

      <div className="mx-auto w-full max-w-[1018px] px-4 pb-[28px] pt-[28px] sm:px-0 lg:mx-0 lg:ml-[74px]">
        <section
          aria-label="Lead source actions"
          className="grid gap-[17px] md:grid-cols-2"
        >
          <button
            className="h-[101px] rounded-[12px] border border-dashed border-[#CFE4E1] bg-white px-[26px] text-left transition hover:border-[#216B62] hover:bg-[#FBFEFD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#216B62]"
            onClick={onOpenImport}
            type="button"
          >
            <div className="flex items-center gap-[19px]">
              <span className="flex h-[47px] w-[47px] shrink-0 items-center justify-center rounded-full bg-[#E7F5F3] text-[#216B62]">
                <Upload aria-hidden="true" className="h-[22px] w-[22px]" />
              </span>
              <span>
                <span className="block text-[18px] font-extrabold leading-[22px] tracking-[-0.015em] text-[#0F172A]">
                  Add Leads via CSV
                </span>
                <span className="mt-[4px] block text-[14px] font-medium leading-[20px] tracking-[-0.005em] text-[#4F5665]">
                  Bulk import leads from a file
                </span>
              </span>
            </div>
          </button>

          <button
            className="h-[101px] rounded-[12px] border border-dashed border-[#CFE4E1] bg-white px-[26px] text-left transition hover:border-[#216B62] hover:bg-[#FBFEFD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#216B62]"
            type="button"
          >
            <div className="flex items-center gap-[19px]">
              <span className="flex h-[47px] w-[47px] shrink-0 items-center justify-center rounded-full bg-[#E7F5F3] text-[#216B62]">
                <UserPlus aria-hidden="true" className="h-[22px] w-[22px]" />
              </span>
              <span>
                <span className="block text-[18px] font-extrabold leading-[22px] tracking-[-0.015em] text-[#0F172A]">
                  Add Single Lead
                </span>
                <span className="mt-[4px] block text-[14px] font-medium leading-[20px] tracking-[-0.005em] text-[#4F5665]">
                  Manually add a new lead
                </span>
              </span>
            </div>
          </button>
        </section>

        {importResult ? (
          <section
            aria-labelledby="manage-leads-heading"
            className="mt-[28px] space-y-5"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2
                  className="text-[21px] font-extrabold text-[#0F172A]"
                  id="manage-leads-heading"
                >
                  Manage Your Leads
                </h2>
                <p className="mt-1 text-[13px] font-medium text-[#667085]">
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

            <Card className="p-5 shadow-none">
              <div className="mb-4">
                <h3 className="text-[16px] font-extrabold text-[#0F172A]">
                  Imported Records
                </h3>
                <p className="mt-1 text-[13px] text-[#667085]">
                  Exact GrowEasy CRM fields returned by the backend.
                </p>
              </div>
              <ImportedRecordsTable records={importResult.importedRecords} />
            </Card>

            <Card className="p-5 shadow-none">
              <div className="mb-4">
                <h3 className="text-[16px] font-extrabold text-[#0F172A]">
                  Skipped Records
                </h3>
                <p className="mt-1 text-[13px] text-[#667085]">
                  Rows without usable contact info stay visible for review.
                </p>
              </div>
              <SkippedRecordsTable records={importResult.skippedRecords} />
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
}
