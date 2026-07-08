import { useMemo, useState } from "react";
import type { CsvPreview } from "../lib/csvPreview";

const ROW_HEIGHT_PX = 48;
const MAX_TABLE_HEIGHT_PX = 280;
const OVERSCAN_ROWS = 4;

export function CsvPreviewTable({ preview }: { preview: CsvPreview }) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = Math.min(
    MAX_TABLE_HEIGHT_PX,
    Math.max(ROW_HEIGHT_PX * 3, preview.rows.length * ROW_HEIGHT_PX)
  );

  const visibleRows = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / ROW_HEIGHT_PX) - OVERSCAN_ROWS
    );
    const visibleCount =
      Math.ceil(viewportHeight / ROW_HEIGHT_PX) + OVERSCAN_ROWS * 2;
    const endIndex = Math.min(preview.rows.length, startIndex + visibleCount);

    return {
      rows: preview.rows.slice(startIndex, endIndex),
      startIndex
    };
  }, [preview.rows, scrollTop, viewportHeight]);

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white">
      <div
        aria-label="CSV raw preview"
        className="overflow-auto"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        role="table"
        style={{ maxHeight: `${MAX_TABLE_HEIGHT_PX}px` }}
      >
        <div className="min-w-[760px] text-left text-xs">
          <div
            className="sticky top-0 z-10 grid bg-[#F9FAFB] text-[#111827]"
            role="row"
            style={{
              gridTemplateColumns: `72px repeat(${preview.headers.length}, minmax(140px, 1fr))`
            }}
          >
            <div
              className="border-b border-[#E5E7EB] px-3 py-3 font-bold uppercase tracking-wide"
              role="columnheader"
            >
              Row
            </div>
            {preview.headers.map((header, index) => (
              <div
                className="border-b border-[#E5E7EB] px-3 py-3 font-bold uppercase tracking-wide"
                key={`${header}-${index}`}
                role="columnheader"
              >
                {header}
              </div>
            ))}
          </div>

          <div
            role="rowgroup"
            style={{
              height: `${preview.rows.length * ROW_HEIGHT_PX}px`,
              position: "relative"
            }}
          >
            {visibleRows.rows.map((row, index) => (
              <div
                className="grid border-b border-[#E5E7EB] text-[#374151]"
                key={row.rowNumber}
                role="row"
                style={{
                  gridTemplateColumns: `72px repeat(${preview.headers.length}, minmax(140px, 1fr))`,
                  height: `${ROW_HEIGHT_PX}px`,
                  left: 0,
                  position: "absolute",
                  right: 0,
                  top: `${(visibleRows.startIndex + index) * ROW_HEIGHT_PX}px`
                }}
              >
                <div
                  className="flex items-center px-3 font-semibold text-[#6B7280]"
                  role="cell"
                >
                  {row.rowNumber}
                </div>
                {row.values.map((value, cellIndex) => (
                  <div
                    className="flex min-w-0 items-center px-3"
                    key={`${row.rowNumber}-${cellIndex}`}
                    role="cell"
                    title={value}
                  >
                    <span className="truncate">{value || "-"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {preview.truncated ? (
        <p className="border-t border-[#E5E7EB] px-4 py-3 text-xs font-medium text-[#6B7280]">
          Showing an optimized preview. The full CSV file is preserved for
          import.
        </p>
      ) : null}
    </div>
  );
}
