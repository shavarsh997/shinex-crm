import "server-only";

import { AppError, type AppErrorDetails } from "./app-error";

export class ValidationError extends AppError {
  constructor(details: AppErrorDetails) {
    super("The request data is invalid.", {
      code: "VALIDATION_ERROR",
      statusCode: 400,
      details,
    });
    this.name = "ValidationError";
  }
}
