import { dataSourceSchema } from "@groweasy/shared";
import { Router } from "express";
import multer from "multer";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { createAiExtractionService } from "../services/ai/aiExtraction.service.js";
import { parseCsvBuffer } from "../services/csvParser.service.js";
import { dedupeSkippedRecords } from "../services/import/skippedRecords.js";

const allowedCsvMimeTypes = new Set([
  "application/csv",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain"
]);

export function createImportRouter(env: Env) {
  const router = Router();
  const aiExtractionService = createAiExtractionService(env);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.MAX_CSV_FILE_SIZE_BYTES,
      files: 1
    },
    fileFilter: (_req, file, callback) => {
      if (isCsvUpload(file)) {
        callback(null, true);
        return;
      }

      callback(
        new AppError({
          code: "INVALID_FILE",
          message: "A valid CSV file is required.",
          statusCode: 400
        })
      );
    }
  });

  router.post("/csv", upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError({
          code: "INVALID_FILE",
          message: "A CSV file must be uploaded in the `file` field.",
          statusCode: 400
        });
      }

      const parsed = parseCsvBuffer(req.file.buffer);
      const dataSourceResult = dataSourceSchema
        .optional()
        .safeParse(normalizeOptionalString(req.body?.data_source));
      const emptySkippedRecords = parsed.skippedEmptyRows.map((sourceRow) => ({
        source_row: sourceRow,
        reason: "Empty row"
      }));

      if (!dataSourceResult.success) {
        throw new AppError({
          code: "VALIDATION_FAILED",
          message: "`data_source` must be one of the allowed values.",
          statusCode: 400
        });
      }

      const extractionInput = {
        records: parsed.rows.map((row) => ({
          source_row: row.sourceRow,
          raw_record: row.record
        })),
        continueOnBatchFailure: true
      };

      const extraction = await aiExtractionService.extractLeads(
        dataSourceResult.data
          ? { ...extractionInput, defaultDataSource: dataSourceResult.data }
          : extractionInput
      );
      const skippedRecords = dedupeSkippedRecords([
        ...emptySkippedRecords,
        ...extraction.skipped_records
      ]);

      res.status(200).json({
        success: true,
        summary: {
          totalRows: parsed.totalRows + parsed.skippedEmptyRows.length,
          totalImported: extraction.imported_records.length,
          totalSkipped: skippedRecords.length,
          totalBatches: extraction.batch_summary.total_batches,
          failedBatches: extraction.batch_summary.failed_batches
        },
        importedRecords: extraction.imported_records,
        skippedRecords
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isCsvUpload(file: Express.Multer.File): boolean {
  const hasCsvExtension = file.originalname.toLowerCase().endsWith(".csv");
  const hasCsvMimeType = allowedCsvMimeTypes.has(file.mimetype);

  return hasCsvExtension || hasCsvMimeType;
}
