import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { Env } from "./config/env.js";
import { AppError } from "./errors/AppError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { healthRouter } from "./routes/health.routes.js";
import { createImportRouter } from "./routes/import.routes.js";

export function createApp(env: Env) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));

  if (env.LOG_REQUESTS) {
    app.use(requestLogger);
  }

  app.use("/health", healthRouter);
  app.use("/api/import", createImportRouter(env));

  app.use((req, _res, next) => {
    next(
      new AppError({
        code: "NOT_FOUND",
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        statusCode: 404
      })
    );
  });

  app.use(errorHandler);

  return app;
}
