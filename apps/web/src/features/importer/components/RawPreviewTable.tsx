"use client";

import { useMemo, useState } from "react";
import { Eye, Rows3 } from "lucide-react";
import type { CsvPreview, CsvPreviewRow } from "../lib/csvPreview";

interface RawPreviewTableProps {
  preview: CsvPreview | null;
}

const ROW_HEIGHT_PX = 72;
const VIEWPORT_HEIGHT_PX = 520;
const OVERSCAN_ROWS = 6;

export function RawPreviewTable({ preview }: RawPreviewTableProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualRows = useMemo(() => {
    if (!preview) {
      return {
        afterHeight: 0,
        beforeHeight: 0,
        endIndex: 0,
        rows: [] as CsvPreviewRow[],
        startIndex: 0
      };
    }

    const visibleCount = Math.ceil(VIEWPORT_HEIGHT_PX / ROW_HEIGHT_PX);
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_PX) - OVERSCAN_ROWS);
    const endIndex = Math.min(preview.rows.length, startIndex + visibleCount + OVERSCAN_ROWS * 2);

    return {
      afterHeight: Math.max(0, (preview.rows.length - endIndex) * ROW_HEIGHT_PX),
      beforeHeight: startIndex * ROW_HEIGHT_PX,
      endIndex,
      rows: preview.rows.slice(startIndex, endIndex),
      startIndex
    };
  }, [preview, scrollTop]);

  if (!preview) {
    return null;
  }

  return (
    <section
      aria-labelledby="raw-preview-heading"
      className="rounded-lg border border-line bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye aria-hidden="true" className="h-5 w-5 text-leaf" />
            <h2 className="text-base font-semibold text-ink" id="raw-preview-heading">
              Raw CSV preview
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Showing the original columns before backend parsing or AI mapping.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-soft px-3 py-2 text-sm font-medium text-ink">
          <Rows3 aria-hidden="true" className="h-4 w-4 text-sky" />
          {preview.totalRows.toLocaleString()} rows detected
        </div>
      </div>

      <div
        aria-label="Virtualized raw CSV rows"
        className="max-h-[520px] overflow-auto"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-soft">
            <tr>
              <th
                className="sticky left-0 z-20 w-20 border-b border-r border-line bg-soft px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
                scope="col"
              >
                Row
              </th>
              {preview.headers.map((header, index) => (
                <th
                  className="min-w-44 border-b border-r border-line px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
                  key={`${header}-${index}`}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {virtualRows.beforeHeight > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={preview.headers.length + 1}
                  style={{ height: virtualRows.beforeHeight }}
                />
              </tr>
            ) : null}

            {virtualRows.rows.map((row) => (
              <tr className="even:bg-soft/60" key={row.rowNumber} style={{ height: ROW_HEIGHT_PX }}>
                <th
                  className="sticky left-0 z-[1] border-b border-r border-line bg-white px-3 py-3 text-xs font-semibold text-muted"
                  scope="row"
                >
                  {row.rowNumber}
                </th>
                {row.values.map((value, index) => (
                  <td
                    className="max-w-72 border-b border-r border-line px-3 py-3 align-top text-ink"
                    key={`${row.rowNumber}-${index}`}
                  >
                    <span className="block max-h-16 overflow-hidden break-words">
                      {value || (
                        <span className="text-muted/60" aria-label="Blank cell">
                          -
                        </span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            ))}

            {virtualRows.afterHeight > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={preview.headers.length + 1}
                  style={{ height: virtualRows.afterHeight }}
                />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {preview.truncated ? (
        <p className="border-t border-line bg-soft px-5 py-3 text-sm text-muted">
          Virtualized preview is rendering rows{" "}
          {Math.min(virtualRows.startIndex + 1, preview.totalRows).toLocaleString()}
          {"-"}
          {virtualRows.endIndex.toLocaleString()} of {preview.totalRows.toLocaleString()}. The full
          CSV file is still kept for Confirm Import.
        </p>
      ) : null}
    </section>
  );
}
