import multer from "multer";
import type { Env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

const allowedCsvMimeTypes = new Set([
  "application/csv",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain"
]);

export function createCsvUploadMiddleware(env: Pick<Env, "MAX_FILE_SIZE_MB">) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
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
}

function isCsvUpload(file: Express.Multer.File): boolean {
  return file.originalname.toLowerCase().endsWith(".csv") || allowedCsvMimeTypes.has(file.mimetype);
}
