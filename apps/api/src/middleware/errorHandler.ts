import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const isFileSizeError = err.code === "LIMIT_FILE_SIZE";

    res.status(400).json({
      error: {
        code: isFileSizeError ? "FILE_TOO_LARGE" : "INVALID_FILE",
        message: isFileSizeError
          ? "The uploaded CSV exceeds the maximum allowed file size."
          : err.message
      }
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed.",
        details: err.flatten()
      }
    });
    return;
  }

  console.error(err);

  res.status(500).json({
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred."
    }
  });
};
