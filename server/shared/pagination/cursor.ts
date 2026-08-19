import "server-only";

import { z } from "zod";

export const cursorPaginationSchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

export function toPrismaCursorPagination({
  cursor,
  limit,
}: CursorPaginationInput) {
  return {
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  };
}

export function createCursorPage<T extends { id: string }>(
  items: T[],
  limit: number,
) {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;

  return {
    data,
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage ? data[data.length - 1]?.id ?? null : null,
    },
  };
}
