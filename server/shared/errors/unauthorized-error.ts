import "server-only";

import { AppError } from "./app-error";

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required to access this resource.") {
    super(message, {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
    this.name = "UnauthorizedError";
  }
}
