export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor({
    code,
    message,
    statusCode = 500,
    isOperational = true
  }: {
    code: string;
    message: string;
    statusCode?: number;
    isOperational?: boolean;
  }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
