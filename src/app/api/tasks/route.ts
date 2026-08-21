import { requireUser } from "@/server/auth";
import { createTaskSchema } from "@/server/modules/tasks/tasks.schema";
import { createTaskForUser, getUserTaskPage } from "@/server/modules/tasks/tasks.service";
import { withErrorHandling } from "@/server/shared/http";
import { cursorPaginationSchema } from "@/server/shared/pagination";
import { parseRequestBody, parseSearchParams } from "@/server/shared/validation";
import { z } from "zod";

const taskPageSchema = cursorPaginationSchema.extend({
  tab: z.enum(["active", "archive"]).default("active"),
});

export const GET = withErrorHandling(async (request) => {
  const user = await requireUser();
  const { tab, ...pagination } = await parseSearchParams(request, taskPageSchema);
  const page = await getUserTaskPage(user.id, tab, pagination);

  return Response.json({ tasks: page.data, pageInfo: page.pageInfo });
});

export const POST = withErrorHandling(async (request) => {
  const user = await requireUser();
  const input = await parseRequestBody(request, createTaskSchema);
  const task = await createTaskForUser(user.id, input);

  return Response.json({ task }, { status: 201 });
});
