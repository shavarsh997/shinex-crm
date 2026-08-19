import "server-only";

export type AppErrorDetails =
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | undefined;

type AppErrorOptions = {
  code: string;
  statusCode: number;
  details?: AppErrorDetails;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: AppErrorDetails;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}
