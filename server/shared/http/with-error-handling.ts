import "server-only";

import { AppError, TooManyRequestsError } from "@/server/shared/errors";

export type Controller<TContext = undefined> = (
  request: Request,
  context: TContext,
) => Promise<Response>;

export function withErrorHandling<TContext>(
  controller: Controller<TContext>,
): Controller<TContext> {
  return async (request, context) => {
    try {
      return await controller(request, context);
    } catch (error) {
      if (error instanceof AppError) {
        const response = Response.json(
          {
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          },
          { status: error.statusCode },
        );

        if (error instanceof TooManyRequestsError) {
          response.headers.set("Retry-After", String(error.retryAfterSeconds));
        }

        return response;
      }

      console.error("Unhandled server error", error);

      return Response.json(
        {
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected server error occurred.",
          },
        },
        { status: 500 },
      );
    }
  };
}
