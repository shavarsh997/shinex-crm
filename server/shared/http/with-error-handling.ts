import "server-only";

import { AppError } from "@/server/shared/errors";

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
        return Response.json(
          {
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          },
          { status: error.statusCode },
        );
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
