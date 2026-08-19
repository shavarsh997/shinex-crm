import "server-only";

import { type z } from "zod";

import { ValidationError } from "@/server/shared/errors";

export async function parseInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): Promise<T> {
  const result = await schema.safeParseAsync(input);

  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return result.data;
}

export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ValidationError([
      {
        path: "body",
        message: "Request body must contain valid JSON.",
      },
    ]);
  }

  return parseInput(schema, body);
}

export async function parseSearchParams<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const searchParams = new URL(request.url).searchParams;
  const input = Object.fromEntries(searchParams.entries());

  return parseInput(schema, input);
}
