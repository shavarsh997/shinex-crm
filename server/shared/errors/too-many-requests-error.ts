import "server-only";

import { AppError } from "./app-error";

export class TooManyRequestsError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Слишком много попыток. Попробуйте снова позже.", {
      code: "RATE_LIMITED",
      statusCode: 429,
    });
    this.name = "TooManyRequestsError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
