import "server-only";

import { AppError } from "./app-error";

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} was not found.`, {
      code: "NOT_FOUND",
      statusCode: 404,
    });
    this.name = "NotFoundError";
  }
}
