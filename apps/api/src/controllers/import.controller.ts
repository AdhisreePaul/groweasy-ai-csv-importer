import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import type { AiExtractionService } from "../services/ai/aiExtraction.service.js";
import { importCsvFile } from "../services/import/importCsv.service.js";

export function createImportController(aiExtractionService: AiExtractionService) {
  return {
    importCsv: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          throw new AppError({
            code: "INVALID_FILE",
            message: "A CSV file must be uploaded in the `file` field.",
            statusCode: 400
          });
        }

        const result = await importCsvFile({
          aiExtractionService,
          fileBuffer: req.file.buffer,
          dataSource: req.body?.data_source
        });

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  };
}
