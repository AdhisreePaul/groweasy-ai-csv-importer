import { Router } from "express";
import type { Env } from "../config/env.js";
import { createImportController } from "../controllers/import.controller.js";
import { createCsvUploadMiddleware } from "../middleware/csvUpload.js";
import { createAiExtractionService } from "../services/ai/aiExtraction.service.js";

export function createImportRouter(env: Env) {
  const router = Router();
  const aiExtractionService = createAiExtractionService(env);
  const importController = createImportController(aiExtractionService);
  const upload = createCsvUploadMiddleware(env);

  router.post("/csv", upload.single("file"), importController.importCsv);

  return router;
}
